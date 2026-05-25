"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { ConfirmDeleteModal } from "@/components/forms/ConfirmDeleteModal";
import { UserFormModal } from "@/components/forms/UserFormModal";
import {
  apiFetch,
  createAdmin,
  deleteUser,
  fetchCenters,
  updateUser,
  type ApiUser,
} from "@/lib/api";

function AdminsPageContent() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<ApiUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiUser | null>(null);

  const { data: admins, isLoading } = useQuery({
    queryKey: ["admins"],
    queryFn: () => apiFetch<ApiUser[]>("/users/admins"),
  });

  const { data: centers } = useQuery({
    queryKey: ["centers"],
    queryFn: fetchCenters,
  });

  const centerMap = new Map(centers?.map((c) => [c.id, c.name]) ?? []);

  const saveMutation = useMutation({
    mutationFn: async (data: {
      email: string;
      password?: string;
      first_name: string;
      last_name: string;
      center_id?: string;
    }) => {
      if (editUser) {
        return updateUser(editUser.id, data);
      }
      if (!data.password) throw new Error("Password is required");
      return createAdmin({ ...data, password: data.password });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      setEditUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      setDeleteTarget(null);
    },
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Admin Accounts</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setEditUser(null);
            setModalOpen(true);
          }}
        >
          Add Admin
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-[rgb(var(--border))] bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Center</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center">
                  Loading...
                </td>
              </tr>
            ) : admins?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[rgb(var(--muted))]">
                  No admins yet. Create one to get started.
                </td>
              </tr>
            ) : (
              admins?.map((admin) => (
                <tr key={admin.id} className="border-b border-[rgb(var(--border))]">
                  <td className="px-4 py-3">
                    {admin.first_name} {admin.last_name}
                  </td>
                  <td className="px-4 py-3">{admin.email}</td>
                  <td className="px-4 py-3">
                    {admin.center_id ? centerMap.get(admin.center_id) || admin.center_id : "—"}
                  </td>
                  <td className="px-4 py-3">{admin.is_active ? "Active" : "Disabled"}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => {
                        setEditUser(admin);
                        setModalOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => setDeleteTarget(admin)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <UserFormModal
        open={modalOpen}
        title={editUser ? "Edit Admin" : "Create Admin"}
        submitLabel={editUser ? "Save Changes" : "Create Admin"}
        showCenterField
        centers={centers}
        initialUser={editUser}
        onClose={() => {
          setModalOpen(false);
          setEditUser(null);
        }}
        onSubmit={async (data) => {
          await saveMutation.mutateAsync(data);
        }}
      />

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title="Delete Admin"
        message={`Remove ${deleteTarget?.first_name} ${deleteTarget?.last_name} (${deleteTarget?.email})?`}
        loading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}

export default function MasterAdminsPage() {
  return (
    <RoleLayout allowedRole="MASTER_ADMIN">
      <AdminsPageContent />
    </RoleLayout>
  );
}
