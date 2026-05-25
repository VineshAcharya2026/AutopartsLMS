"use client";

import { useQuery } from "@tanstack/react-query";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { apiFetch } from "@/lib/api";
import type { Lead, PaginatedResponse } from "@centercrm/shared-types";

function OverduePageContent() {
  const { data } = useQuery({
    queryKey: ["overdue-leads"],
    queryFn: () => apiFetch<PaginatedResponse<Lead>>("/leads?status=FOLLOW_UP"),
  });

  const overdue = data?.items.filter(
    (l) => l.followUpAt && new Date(l.followUpAt) < new Date()
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Overdue Tasks</h1>
      <div className="space-y-3">
        {overdue?.map((lead) => (
          <div key={lead.id} className="card p-4 border-l-4 border-red-500">
            <p className="font-medium">{lead.name}</p>
            <p className="text-sm text-[rgb(var(--muted))]">Due: {lead.followUpAt ? new Date(lead.followUpAt).toLocaleString() : "—"}</p>
          </div>
        ))}
        {overdue?.length === 0 && <p className="text-[rgb(var(--muted))]">No overdue tasks</p>}
      </div>
    </div>
  );
}

export default function AgentOverduePage() {
  return (
    <RoleLayout allowedRole="AGENT">
      <OverduePageContent />
    </RoleLayout>
  );
}
