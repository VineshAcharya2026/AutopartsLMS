"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RoleLayout } from "@/components/layout/RoleLayout";
import {
  countKanbanLeads,
  countPipelineLeads,
  filterKanbanColumns,
  filterUnassignedColumns,
  LeadCenterKpis,
  LeadCenterToolbar,
  LeadKanbanBoard,
  LeadKanbanListView,
} from "@/components/leads/LeadCenter";
import {
  LeadAgentWiseView,
  LeadCardGrid,
  LeadDetailDrawer,
  LeadTable,
  useAssignmentMaps,
  ViewSwitcher,
} from "@/components/leads/LeadViews";
import { apiFetch, type ApiLead } from "@/lib/api";
import { useUIStore } from "@/lib/store";
import type { DashboardStats } from "@centercrm/shared-types";

type PaginatedLeads = {
  items: ApiLead[];
  total: number;
  page: number;
  page_size: number;
};

type ExtendedStats = DashboardStats & {
  unassigned_to_admin?: number;
};

function LeadsPageContent() {
  const { leadView, setLeadView } = useUIStore();
  const [selected, setSelected] = useState<ApiLead | null>(null);
  const [leadFilter, setLeadFilter] = useState<"all" | "unassigned">("all");
  const [search, setSearch] = useState("");
  const [kanbanLayout, setKanbanLayout] = useState<"board" | "list">("board");
  const maps = useAssignmentMaps();

  const { data: stats } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<ExtendedStats>("/analytics/dashboard"),
  });

  const listQueryKey = ["leads", leadFilter] as const;

  const { data: listData } = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      apiFetch<PaginatedLeads>(
        `/leads?page_size=50${leadFilter === "unassigned" ? "&unassigned=true" : ""}`
      ),
    enabled: leadView !== "kanban" && leadView !== "agent",
  });

  const { data: kanbanData, isLoading: kanbanLoading } = useQuery({
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

  const filteredKanban = useMemo(() => {
    if (!kanbanData) return {};
    const byFilter = filterUnassignedColumns(kanbanData, leadFilter);
    return filterKanbanColumns(byFilter, search);
  }, [kanbanData, leadFilter, search]);

  const kanbanTotal = countKanbanLeads(filteredKanban);
  const pipelineCount = kanbanData ? countPipelineLeads(kanbanData) : 0;
  const leads = listData?.items ?? [];
  const showKanbanChrome = leadView === "kanban";
  const showLeadPanel = showKanbanChrome && !!selected;

  return (
    <div className="dashboard-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Lead Center</h1>
          <p className="text-sm text-[rgb(var(--muted))] mt-1">
            Manage and route auto parts leads across your pipeline
          </p>
        </div>
        <ViewSwitcher view={leadView} onChange={setLeadView} />
      </div>

      {showKanbanChrome && (
        <LeadCenterKpis
          totalLeads={stats?.total_leads ?? kanbanTotal}
          unassigned={stats?.unassigned_to_admin ?? 0}
          inPipeline={pipelineCount}
        />
      )}

      {showKanbanChrome && !showLeadPanel && (
        <LeadCenterToolbar
          search={search}
          onSearchChange={setSearch}
          filter={leadFilter}
          onFilterChange={setLeadFilter}
          kanbanLayout={kanbanLayout}
          onKanbanLayoutChange={setKanbanLayout}
          totalShown={kanbanTotal}
        />
      )}

      {showLeadPanel ? (
        <LeadDetailDrawer
          lead={selected}
          open
          onClose={() => setSelected(null)}
          role="MASTER_ADMIN"
          maps={maps}
          layout="panel"
        />
      ) : (
        <>
          {leadView === "table" && (
            <LeadTable leads={leads} onSelect={setSelected} showAssignment maps={maps} />
          )}
          {leadView === "card" && (
            <LeadCardGrid leads={leads} onSelect={setSelected} maps={maps} />
          )}
          {leadView === "kanban" && (
            <>
              {kanbanLoading && (
                <div className="flex justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                </div>
              )}
              {!kanbanLoading && kanbanData && kanbanLayout === "board" && (
                <LeadKanbanBoard columns={filteredKanban} onSelect={setSelected} maps={maps} />
              )}
              {!kanbanLoading && kanbanData && kanbanLayout === "list" && (
                <LeadKanbanListView columns={filteredKanban} onSelect={setSelected} maps={maps} />
              )}
            </>
          )}
          {leadView === "agent" && agentData && (
            <LeadAgentWiseView
              grouped={agentData.grouped}
              unassigned={agentData.unassigned}
              maps={maps}
              onSelect={setSelected}
            />
          )}
        </>
      )}

      {!showKanbanChrome && (
        <LeadDetailDrawer
          lead={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          role="MASTER_ADMIN"
          maps={maps}
          layout="drawer"
        />
      )}
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
