"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { UserFormModal } from "@/components/forms/UserFormModal";
import { apiFetch, createAgent, type ApiUser } from "@/lib/api";

function AgentsPageContent() {
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => apiFetch<ApiUser[]>("/users/agents"),
  });

  const createMutation = useMutation({
    mutationFn: createAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Agents</h1>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          Add Agent
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-[rgb(var(--border))] bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center">
                  Loading...
                </td>
              </tr>
            ) : agents?.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-[rgb(var(--muted))]">
                  No agents yet. Create one to assign leads.
                </td>
              </tr>
            ) : (
              agents?.map((agent) => (
                <tr key={agent.id} className="border-b border-[rgb(var(--border))]">
                  <td className="px-4 py-3">
                    {agent.first_name} {agent.last_name}
                  </td>
                  <td className="px-4 py-3">{agent.email}</td>
                  <td className="px-4 py-3">{agent.is_active ? "Active" : "Disabled"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <UserFormModal
        open={modalOpen}
        title="Create Agent"
        submitLabel="Create Agent"
        onClose={() => setModalOpen(false)}
        onSubmit={async (data) => {
          if (!data.password) throw new Error("Password is required");
          await createMutation.mutateAsync({
            email: data.email,
            password: data.password,
            first_name: data.first_name,
            last_name: data.last_name,
          });
        }}
      />
    </div>
  );
}

export default function AdminAgentsPage() {
  return (
    <RoleLayout allowedRole="ADMIN">
      <AgentsPageContent />
    </RoleLayout>
  );
}
