"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { LeadDetailDrawer, LeadTable } from "@/components/leads/LeadViews";
import { apiFetch } from "@/lib/api";
import type { Lead, PaginatedResponse } from "@centercrm/shared-types";

function AgentLeadsContent() {
  const [selected, setSelected] = useState<Lead | null>(null);
  const { data } = useQuery({
    queryKey: ["agent-leads"],
    queryFn: () => apiFetch<PaginatedResponse<Lead>>("/leads"),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Assigned Leads</h1>
      <LeadTable leads={data?.items ?? []} onSelect={(lead) => setSelected(lead as Lead)} />
      <LeadDetailDrawer lead={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export default function AgentLeadsPage() {
  return (
    <RoleLayout allowedRole="AGENT">
      <AgentLeadsContent />
    </RoleLayout>
  );
}
