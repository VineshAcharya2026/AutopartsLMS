"use client";

import { useQuery } from "@tanstack/react-query";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { apiFetch } from "@/lib/api";
import type { Lead, PaginatedResponse } from "@centercrm/shared-types";

function FollowUpsPageContent() {
  const { data } = useQuery({
    queryKey: ["leads-followups"],
    queryFn: () => apiFetch<PaginatedResponse<Lead>>("/leads?status=FOLLOW_UP"),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Follow-ups</h1>
      <div className="space-y-3">
        {data?.items.map((lead) => (
          <div key={lead.id} className="card p-4 flex justify-between">
            <div>
              <p className="font-medium">{lead.name}</p>
              <p className="text-sm text-[rgb(var(--muted))]">{lead.phone || lead.email}</p>
            </div>
            <p className="text-sm">{lead.followUpAt ? new Date(lead.followUpAt).toLocaleString() : "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminFollowUpsPage() {
  return (
    <RoleLayout allowedRole="ADMIN">
      <FollowUpsPageContent />
    </RoleLayout>
  );
}
