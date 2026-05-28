"use client";

import { LayoutGrid, List, Search } from "lucide-react";
import {
  AutoPartsLeadCard,
  GenericLeadCard,
  LeadFilterTabs,
  LeadStatusBadge,
  useAssignmentMaps,
  type AnyLead,
  type AssignmentMaps,
} from "@/components/leads/LeadViews";
import { DashboardStatsCard } from "@/components/dashboard";
import {
  getAutoPartsMeta,
  isAutoPartsLead,
  leadField,
  partNameForLead,
  vehicleTitle,
} from "@/components/leads/autoPartsLead";
import { cn } from "@/lib/utils";

const STATUS_HEADER: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  UNATTEMPTED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  ATTEMPTED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  FOLLOW_UP: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  INTERESTED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  CALLBACK: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  CONVERTED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  LOST: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  NOT_INTERESTED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
  SPAM: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

function leadMatchesSearch(lead: AnyLead, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  const meta = getAutoPartsMeta(lead);
  const haystack = [
    lead.name,
    leadField(lead, "phone", "phone"),
    leadField(lead, "email", "email"),
    leadField(lead, "source", "source"),
    meta.make,
    meta.model,
    meta.part_name,
    meta.vin,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function filterKanbanColumns(
  columns: Record<string, AnyLead[]>,
  search: string
): Record<string, AnyLead[]> {
  const out: Record<string, AnyLead[]> = {};
  for (const [status, leads] of Object.entries(columns)) {
    const filtered = leads.filter((l) => leadMatchesSearch(l, search));
    if (filtered.length) out[status] = filtered;
  }
  return out;
}

export function countKanbanLeads(columns: Record<string, AnyLead[]>): number {
  return Object.values(columns).reduce((sum, arr) => sum + arr.length, 0);
}

const TERMINAL = new Set(["CONVERTED", "LOST", "NOT_INTERESTED", "SPAM"]);

export function filterUnassignedColumns(
  columns: Record<string, AnyLead[]>,
  filter: "all" | "unassigned"
): Record<string, AnyLead[]> {
  if (filter === "all") return columns;
  const out: Record<string, AnyLead[]> = {};
  for (const [status, leads] of Object.entries(columns)) {
    const filtered = leads.filter(
      (l) => !leadField<string | null>(l, "assigned_admin_id", "assignedAdminId")
    );
    if (filtered.length) out[status] = filtered;
  }
  return out;
}

export function countPipelineLeads(columns: Record<string, AnyLead[]>): number {
  return Object.entries(columns).reduce(
    (sum, [status, leads]) => sum + (TERMINAL.has(status) ? 0 : leads.length),
    0
  );
}

export function LeadCenterKpis({
  totalLeads,
  unassigned,
  inPipeline,
}: {
  totalLeads: number;
  unassigned: number;
  inPipeline: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3 mb-6">
      <DashboardStatsCard title="Total leads" value={totalLeads} variant="blue" />
      <DashboardStatsCard title="Unassigned to admin" value={unassigned} variant="orange" />
      <DashboardStatsCard title="In pipeline" value={inPipeline} variant="violet" />
    </div>
  );
}

export function LeadCenterToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  kanbanLayout,
  onKanbanLayoutChange,
  totalShown,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  filter: "all" | "unassigned";
  onFilterChange: (f: "all" | "unassigned") => void;
  kanbanLayout: "board" | "list";
  onKanbanLayoutChange: (v: "board" | "list") => void;
  totalShown: number;
}) {
  return (
    <div className="card p-3 mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--muted))]" />
        <input
          type="search"
          className="input w-full pl-9"
          placeholder="Search name, phone, vehicle, VIN..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <LeadFilterTabs filter={filter} onChange={onFilterChange} />
        <div className="inline-flex rounded-lg border border-[rgb(var(--border))] p-1">
          <button
            type="button"
            onClick={() => onKanbanLayoutChange("board")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200",
              kanbanLayout === "board"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-[rgb(var(--muted))] hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Board
          </button>
          <button
            type="button"
            onClick={() => onKanbanLayoutChange("list")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200",
              kanbanLayout === "list"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-[rgb(var(--muted))] hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <List className="h-4 w-4" />
            List
          </button>
        </div>
        <span className="text-xs text-[rgb(var(--muted))] tabular-nums">{totalShown} shown</span>
      </div>
    </div>
  );
}

function KanbanLeadCard({
  lead,
  onSelect,
  maps,
  compact,
}: {
  lead: AnyLead;
  onSelect?: (lead: AnyLead) => void;
  maps?: AssignmentMaps;
  compact?: boolean;
}) {
  if (isAutoPartsLead(lead)) {
    return <AutoPartsLeadCard lead={lead} onSelect={onSelect} maps={maps} compact={compact} />;
  }
  return <GenericLeadCard lead={lead} onSelect={onSelect} maps={maps} />;
}

export function LeadKanbanBoard({
  columns,
  onSelect,
  maps,
}: {
  columns: Record<string, AnyLead[]>;
  onSelect?: (lead: AnyLead) => void;
  maps?: AssignmentMaps;
}) {
  const entries = Object.entries(columns);
  if (!entries.length) {
    return (
      <div className="card p-12 text-center text-[rgb(var(--muted))]">No leads match your search.</div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[420px]">
      {entries.map(([status, leads]) => (
        <div
          key={status}
          className="min-w-[300px] max-w-[300px] flex-shrink-0 flex flex-col rounded-xl border border-[rgb(var(--border))] bg-slate-50/50 dark:bg-slate-900/30"
        >
          <div
            className={cn(
              "flex items-center justify-between px-3 py-2.5 rounded-t-xl border-b border-[rgb(var(--border))]",
              STATUS_HEADER[status] ?? "bg-slate-100 text-slate-800"
            )}
          >
            <h3 className="text-sm font-bold tracking-wide">{status.replace(/_/g, " ")}</h3>
            <span className="text-xs font-semibold tabular-nums opacity-80">{leads.length}</span>
          </div>
          <div className="flex-1 space-y-2 p-2 overflow-y-auto max-h-[calc(100vh-22rem)]">
            {leads.map((lead) => (
              <KanbanLeadCard key={String(lead.id)} lead={lead} onSelect={onSelect} maps={maps} compact />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LeadKanbanListView({
  columns,
  onSelect,
  maps,
}: {
  columns: Record<string, AnyLead[]>;
  onSelect?: (lead: AnyLead) => void;
  maps?: AssignmentMaps;
}) {
  const entries = Object.entries(columns);
  if (!entries.length) {
    return (
      <div className="card p-12 text-center text-[rgb(var(--muted))]">No leads match your search.</div>
    );
  }

  return (
    <div className="space-y-6">
      {entries.map(([status, leads]) => (
        <section key={status} className="card overflow-hidden">
          <div
            className={cn(
              "flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--border))]",
              STATUS_HEADER[status] ?? "bg-slate-100"
            )}
          >
            <h3 className="text-sm font-bold">{status.replace(/_/g, " ")}</h3>
            <span className="text-xs font-semibold">{leads.length} leads</span>
          </div>
          <div className="divide-y divide-[rgb(var(--border))]">
            {leads.map((lead) => {
              const meta = getAutoPartsMeta(lead);
              return (
                <button
                  key={String(lead.id)}
                  type="button"
                  onClick={() => onSelect?.(lead)}
                  className="w-full text-left px-4 py-3 transition-colors duration-200 hover:bg-orange-50/60 dark:hover:bg-orange-950/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      {isAutoPartsLead(lead) ? vehicleTitle(meta) : String(lead.name)}
                    </p>
                    <p className="text-sm text-[rgb(var(--muted))] mt-0.5">
                      {String(lead.name)}
                      {isAutoPartsLead(lead)
                        ? ` · ${partNameForLead(lead, meta)}`
                        : ` · ${leadField(lead, "phone", "phone") || leadField(lead, "email", "email") || "—"}`}
                    </p>
                  </div>
                  <LeadStatusBadge status={String(lead.status)} />
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function useLeadCenterMaps() {
  return useAssignmentMaps(true);
}
