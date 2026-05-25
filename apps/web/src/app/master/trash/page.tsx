"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { ConfirmDeleteModal } from "@/components/forms/ConfirmDeleteModal";
import { cn } from "@/lib/utils";
import { fetchTrash, purgeTrash, restoreTrash, type TrashRecord } from "@/lib/api";

const FILTERS = ["ALL", "LEAD", "USER", "CENTER"] as const;

function trashLabel(record: TrashRecord) {
  const snap = record.snapshot || {};
  const name = snap.name || `${snap.first_name || ""} ${snap.last_name || ""}`.trim();
  const email = snap.email;
  if (name) return String(name);
  if (email) return String(email);
  return record.entity_id.slice(0, 8);
}

function TrashPageContent() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [purgeTarget, setPurgeTarget] = useState<TrashRecord | null>(null);

  const { data: records, isLoading } = useQuery({
    queryKey: ["trash"],
    queryFn: fetchTrash,
  });

  const filtered = useMemo(() => {
    if (!records) return [];
    if (filter === "ALL") return records;
    return records.filter((r) => r.entity_type === filter);
  }, [records, filter]);

  const restoreMutation = useMutation({
    mutationFn: restoreTrash,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      queryClient.invalidateQueries({ queryKey: ["centers"] });
    },
  });

  const purgeMutation = useMutation({
    mutationFn: purgeTrash,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      setPurgeTarget(null);
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Trash</h1>

      <div className="inline-flex rounded-lg border border-[rgb(var(--border))] p-1 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              filter === f ? "bg-blue-600 text-white" : "text-[rgb(var(--muted))] hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase() + "s"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-[rgb(var(--muted))]">Loading...</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => (
            <div key={record.id} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-medium">{trashLabel(record)}</span>
                <span className="text-sm text-[rgb(var(--muted))] ml-2">({record.entity_type})</span>
                <p className="text-xs text-[rgb(var(--muted))] mt-1">
                  Deleted {new Date(record.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-secondary text-sm"
                  disabled={restoreMutation.isPending}
                  onClick={() => restoreMutation.mutate(record.id)}
                >
                  Restore
                </button>
                <button
                  className="btn-primary bg-red-600 hover:bg-red-700 text-sm"
                  onClick={() => setPurgeTarget(record)}
                >
                  Delete Forever
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-[rgb(var(--muted))]">Trash is empty</p>}
        </div>
      )}

      <ConfirmDeleteModal
        open={!!purgeTarget}
        title="Permanently Delete"
        message={`Permanently delete "${purgeTarget ? trashLabel(purgeTarget) : ""}"? This cannot be undone.`}
        loading={purgeMutation.isPending}
        permanent
        onClose={() => setPurgeTarget(null)}
        onConfirm={() => purgeTarget && purgeMutation.mutate(purgeTarget.id)}
      />
    </div>
  );
}

export default function MasterTrashPage() {
  return (
    <RoleLayout allowedRole="MASTER_ADMIN">
      <TrashPageContent />
    </RoleLayout>
  );
}
