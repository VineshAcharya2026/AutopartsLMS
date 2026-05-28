"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RoleLayout } from "@/components/layout/RoleLayout";
import {
  LeadAgentWiseView,
  LeadCardGrid,
  LeadDetailDrawer,
  LeadFilterTabs,
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

function LeadsPageContent() {
  const { leadView, setLeadView } = useUIStore();
  const [selected, setSelected] = useState<ApiLead | null>(null);
  const [leadFilter, setLeadFilter] = useState<"all" | "unassigned">("all");
  const maps = useAssignmentMaps();

  const listQueryKey = ["leads", leadFilter] as const;

  const { data: listData } = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      apiFetch<PaginatedLeads>(
        `/leads?page_size=50${leadFilter === "unassigned" ? "&unassigned=true" : ""}`
      ),
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
        <h1 className="text-2xl font-bold">Lead Center</h1>
        <div className="flex flex-wrap items-center gap-3">
          <LeadFilterTabs filter={leadFilter} onChange={setLeadFilter} />
          <ViewSwitcher view={leadView} onChange={setLeadView} />
        </div>
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
        role="MASTER_ADMIN"
      />
    </div>
  );
}

export default function MasterLeadsPage() {
  return (
    <RoleLayout allowedRole="MASTER_ADMIN">
      <LeadsPageContent />
    </RoleLayout>
  );
}
