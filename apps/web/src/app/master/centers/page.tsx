"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { CenterFormModal } from "@/components/forms/CenterFormModal";
import { ConfirmDeleteModal } from "@/components/forms/ConfirmDeleteModal";
import {
  createCenter,
  deleteCenter,
  fetchCenters,
  updateCenter,
  type ApiCenter,
} from "@/lib/api";

function CentersPageContent() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editCenter, setEditCenter] = useState<ApiCenter | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiCenter | null>(null);

  const { data: centers, isLoading } = useQuery({
    queryKey: ["centers"],
    queryFn: fetchCenters,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { name: string; code: string }) => {
      if (editCenter) return updateCenter(editCenter.id, data);
      return createCenter(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centers"] });
      setEditCenter(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCenter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centers"] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      setDeleteTarget(null);
    },
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Centers</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setEditCenter(null);
            setModalOpen(true);
          }}
        >
          Add Center
        </button>
      </div>
      {isLoading ? (
        <p className="text-[rgb(var(--muted))]">Loading...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {centers?.map((center) => (
            <div key={center.id} className="card p-5">
              <h3 className="font-semibold">{center.name}</h3>
              <p className="text-sm text-[rgb(var(--muted))] mt-1">Code: {center.code}</p>
              <div className="mt-4 flex gap-3">
                <button
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => {
                    setEditCenter(center);
                    setModalOpen(true);
                  }}
                >
                  Edit
                </button>
                <button
                  className="text-sm text-red-600 hover:underline"
                  onClick={() => setDeleteTarget(center)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CenterFormModal
        open={modalOpen}
        title={editCenter ? "Edit Center" : "Create Center"}
        submitLabel={editCenter ? "Save Changes" : "Create Center"}
        initialCenter={editCenter}
        onClose={() => {
          setModalOpen(false);
          setEditCenter(null);
        }}
        onSubmit={async (data) => {
          await saveMutation.mutateAsync(data);
        }}
      />

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title="Delete Center"
        message={`Remove center "${deleteTarget?.name}"?`}
        loading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}

export default function MasterCentersPage() {
  return (
    <RoleLayout allowedRole="MASTER_ADMIN">
      <CentersPageContent />
    </RoleLayout>
  );
}
