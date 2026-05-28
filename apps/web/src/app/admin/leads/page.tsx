"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RoleLayout } from "@/components/layout/RoleLayout";
import {
  LeadAgentWiseView,
  LeadCardGrid,
  LeadDetailDrawer,
  LeadKanban,
  LeadTable,
  useAssignmentMaps,
  ViewSwitcher,
} from "@/components/leads/LeadViews";
import { apiFetch, type ApiLead } from "@/lib/api";
import { useUIStore } from "@/lib/store";

type PaginatedLeads = {
  items: ApiLead[];
  total: number;
  page: number;
  page_size: number;
};

function AdminLeadsContent() {
  const { leadView, setLeadView } = useUIStore();
  const [selected, setSelected] = useState<ApiLead | null>(null);
  const maps = useAssignmentMaps();

  const { data: listData } = useQuery({
    queryKey: ["leads"],
    queryFn: () => apiFetch<PaginatedLeads>("/leads?page_size=50"),
    enabled: leadView !== "kanban" && leadView !== "agent",
  });

  const { data: kanbanData } = useQuery({
    queryKey: ["leads-kanban"],
    queryFn: () => apiFetch<Record<string, ApiLead[]>>("/leads/views/kanban"),
    enabled: leadView === "kanban",
  });

  const { data: agentData } = useQuery({
    queryKey: ["leads-agent"],
    queryFn: () =>
      apiFetch<{ grouped: Record<string, ApiLead[]>; unassigned: ApiLead[] }>("/leads/views/agent-wise"),
    enabled: leadView === "agent",
  });

  const leads = listData?.items ?? [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">My Leads</h1>
        <ViewSwitcher view={leadView} onChange={setLeadView} />
      </div>

      {leadView === "table" && (
        <LeadTable leads={leads} onSelect={setSelected} showAssignment maps={maps} />
      )}
      {leadView === "card" && <LeadCardGrid leads={leads} onSelect={setSelected} maps={maps} />}
      {leadView === "kanban" && kanbanData && <LeadKanban columns={kanbanData} />}
      {leadView === "agent" && agentData && (
        <LeadAgentWiseView
          grouped={agentData.grouped}
          unassigned={agentData.unassigned}
          maps={maps}
          onSelect={setSelected}
        />
      )}

      <LeadDetailDrawer
        lead={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        role="ADMIN"
      />
    </div>
  );
}

export default function AdminLeadsPage() {
  return (
    <RoleLayout allowedRole="ADMIN">
      <AdminLeadsContent />
    </RoleLayout>
  );
}
