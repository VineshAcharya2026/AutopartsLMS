"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Role } from "@centercrm/shared-types";
import {
  addRemark,
  assignLead,
  deleteLead,
  fetchAdmins,
  fetchAgents,
  fetchCenters,
  fetchLeadActivity,
  fetchRemarks,
  logCall,
  updateLead,
  userDisplayName,
  type ApiLead,
  type ApiUser,
  type LeadActivityItem,
} from "@/lib/api";
import { STATUS_COLORS, cn } from "@/lib/utils";
import {
  type AnyLead,
  getAutoPartsMeta,
  isAutoPartsLead,
  leadField,
  partNameForLead,
  purchaseTimeline,
  vehicleTitle,
  zipCodeForLead,
} from "@/components/leads/autoPartsLead";
import {
  ACTIVITY_CHANNEL_BORDER,
  DetailField,
  DrawerSection,
} from "@/components/leads/leadDetailUi";

const leadCardAuto =
  "card lead-card-interactive lead-card-auto border-l-4 border-l-orange-500";
const leadCardGeneric =
  "card lead-card-interactive lead-card-generic border-l-4 border-l-blue-400";

export type { AnyLead } from "@/components/leads/autoPartsLead";

const CLOSED_STATUSES = ["CONVERTED", "LOST", "NOT_INTERESTED", "SPAM"] as const;
const STATUS_OPTIONS = [
  "NEW",
  "UNATTEMPTED",
  "ATTEMPTED",
  "FOLLOW_UP",
  "INTERESTED",
  "CALLBACK",
  "NOT_INTERESTED",
  "CONVERTED",
  "LOST",
  "SPAM",
] as const;

function AssignmentLine({
  maps,
  lead,
}: {
  maps?: AssignmentMaps;
  lead: AnyLead;
}) {
  if (!maps) return null;
  const centerId = leadField<string | null>(lead, "center_id", "centerId");
  const adminId = leadField<string | null>(lead, "assigned_admin_id", "assignedAdminId");
  const agentId = leadField<string | null>(lead, "assigned_agent_id", "assignedAgentId");
  return (
    <p className="text-xs text-[rgb(var(--muted))] mt-2">
      {centerId ? maps.centerNames.get(centerId) : "No center"}
      {" · "}
      {adminId ? maps.adminNames.get(adminId) : "No admin"}
      {" · "}
      {agentId ? maps.agentNames.get(agentId) : "No agent"}
    </p>
  );
}

export function LeadStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("badge", STATUS_COLORS[status] || "bg-gray-100 text-gray-800")}>{status}</span>
  );
}

function AutoPartsDetailSection({ lead }: { lead: AnyLead }) {
  const meta = getAutoPartsMeta(lead);
  if (!isAutoPartsLead(lead)) return null;

  const rows = [
    { label: "Year", value: meta.year },
    { label: "Make", value: meta.make || meta.brand },
    { label: "Model", value: meta.model },
    { label: "Part", value: partNameForLead(lead, meta) },
    { label: "VIN", value: meta.vin },
    { label: "ZIP Code", value: zipCodeForLead(lead, meta) },
    { label: "Purchase timeline", value: purchaseTimeline(meta) },
    { label: "Notes", value: meta.comment || leadField<string>(lead, "message", "message") },
  ].filter((row) => row.value);

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 transition-all duration-300 ease-out hover:border-orange-300 hover:shadow-md hover:shadow-orange-100/40 dark:border-orange-900/40 dark:bg-orange-950/20 dark:hover:border-orange-700 dark:hover:shadow-orange-900/20">
      <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">
        Vehicle &amp; Part Quote
      </p>
      <p className="mt-1 font-semibold">{vehicleTitle(meta)}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        {rows.map((row) => (
          <div key={row.label}>
            <span className="text-[rgb(var(--muted))]">{row.label}</span>
            <p>{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AutoPartsLeadCard({
  lead,
  onSelect,
  compact = false,
  maps,
}: {
  lead: AnyLead;
  onSelect?: (lead: AnyLead) => void;
  compact?: boolean;
  maps?: AssignmentMaps;
}) {
  const meta = getAutoPartsMeta(lead);
  const partName = partNameForLead(lead, meta);
  const zip = zipCodeForLead(lead, meta);
  const timeline = purchaseTimeline(meta);
  const created = leadField<string>(lead, "created_at", "createdAt");

  if (compact) {
    return (
      <div
        className={cn(leadCardAuto, "p-3")}
        onClick={() => onSelect?.(lead)}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">{vehicleTitle(meta)}</p>
            <p className="text-xs text-[rgb(var(--muted))] mt-1">Part: {partName}</p>
          </div>
          <LeadStatusBadge status={String(lead.status)} />
        </div>
        <p className="text-xs text-[rgb(var(--muted))] mt-2">{String(lead.name)}</p>
        <AssignmentLine maps={maps} lead={lead} />
      </div>
    );
  }

  return (
    <div className={cn(leadCardAuto, "p-4")} onClick={() => onSelect?.(lead)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-orange-600 dark:text-orange-400">
            Auto Parts Quote
          </p>
          <h3 className="font-semibold text-base mt-0.5">{vehicleTitle(meta)}</h3>
          <p className="text-sm text-[rgb(var(--muted))] mt-1">
            Part: <span className="font-medium text-[rgb(var(--foreground))]">{partName}</span>
          </p>
        </div>
        <LeadStatusBadge status={String(lead.status)} />
      </div>

      <div className="mt-3 space-y-1 text-sm">
        <p className="font-medium">{String(lead.name)}</p>
        <p className="text-[rgb(var(--muted))]">
          {String(leadField(lead, "phone", "phone") || "—")}
          {leadField(lead, "email", "email") ? ` · ${leadField(lead, "email", "email")}` : ""}
        </p>
        <p className="text-xs text-[rgb(var(--muted))]">
          {zip ? `ZIP ${zip}` : "No ZIP"}
          {timeline ? ` · ${timeline}` : ""}
        </p>
        {meta.vin && <p className="text-xs font-mono text-[rgb(var(--muted))]">VIN: {meta.vin}</p>}
        <AssignmentLine maps={maps} lead={lead} />
      </div>

      <div className="mt-3 pt-3 border-t border-[rgb(var(--border))] flex justify-between text-xs text-[rgb(var(--muted))]">
        <span>
          {String(leadField(lead, "source", "source") || "—")}
          {leadField(lead, "source_website", "sourceWebsite")
            ? ` · ${leadField(lead, "source_website", "sourceWebsite")}`
            : ""}
        </span>
        {created && <span>{new Date(created).toLocaleString()}</span>}
      </div>
    </div>
  );
}

function GenericLeadCard({
  lead,
  onSelect,
  maps,
}: {
  lead: AnyLead;
  onSelect?: (lead: AnyLead) => void;
  maps?: AssignmentMaps;
}) {
  return (
    <div className={cn(leadCardGeneric, "p-4")} onClick={() => onSelect?.(lead)}>
      <div className="flex items-start justify-between">
        <h3 className="font-semibold">{String(lead.name)}</h3>
        <LeadStatusBadge status={String(lead.status)} />
      </div>
      <p className="mt-2 text-sm text-[rgb(var(--muted))]">
        {String(leadField(lead, "phone", "phone") || leadField(lead, "email", "email") || "—")}
      </p>
      <p className="mt-1 text-xs text-[rgb(var(--muted))]">
        {String(leadField(lead, "source", "source") || "—")} · {String(leadField(lead, "city", "city") || "No city")}
      </p>
      <AssignmentLine maps={maps} lead={lead} />
    </div>
  );
}

export { DashboardStatsCard as StatsCard } from "@/components/dashboard/DashboardStatsCard";

export type AssignmentMaps = {
  centerNames: Map<string, string>;
  adminNames: Map<string, string>;
  agentNames: Map<string, string>;
};

export function useAssignmentMaps(enabled = true) {
  const { data: centers } = useQuery({
    queryKey: ["centers"],
    queryFn: fetchCenters,
    enabled,
  });
  const { data: admins } = useQuery({
    queryKey: ["admins"],
    queryFn: fetchAdmins,
    enabled,
  });
  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
    enabled,
  });

  return useMemo<AssignmentMaps>(() => {
    const centerNames = new Map(centers?.map((c) => [c.id, c.name]) ?? []);
    const adminNames = new Map(admins?.map((a) => [a.id, userDisplayName(a)]) ?? []);
    const agentNames = new Map(agents?.map((a) => [a.id, userDisplayName(a)]) ?? []);
    return { centerNames, adminNames, agentNames };
  }, [centers, admins, agents]);
}

export function LeadFilterTabs({
  filter,
  onChange,
}: {
  filter: "all" | "unassigned";
  onChange: (f: "all" | "unassigned") => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-[rgb(var(--border))] p-1">
      {(
        [
          { id: "all" as const, label: "All" },
          { id: "unassigned" as const, label: "Unassigned" },
        ] as const
      ).map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            filter === tab.id ? "bg-blue-600 text-white" : "text-[rgb(var(--muted))] hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function LeadTable({
  leads,
  onSelect,
  showAssignment = false,
  maps,
}: {
  leads: AnyLead[];
  onSelect?: (lead: AnyLead) => void;
  showAssignment?: boolean;
  maps?: AssignmentMaps;
}) {
  const showAutoPartsColumns = leads.some(isAutoPartsLead);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[rgb(var(--border))] bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              {showAutoPartsColumns && (
                <>
                  <th className="px-4 py-3 text-left font-medium">Vehicle</th>
                  <th className="px-4 py-3 text-left font-medium">Part</th>
                </>
              )}
              <th className="px-4 py-3 text-left font-medium">Phone</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Source</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              {showAssignment && (
                <>
                  <th className="px-4 py-3 text-left font-medium">Center</th>
                  <th className="px-4 py-3 text-left font-medium">Admin</th>
                  <th className="px-4 py-3 text-left font-medium">Agent</th>
                </>
              )}
              <th className="px-4 py-3 text-left font-medium">Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const centerId = leadField<string | null>(lead, "center_id", "centerId");
              const adminId = leadField<string | null>(lead, "assigned_admin_id", "assignedAdminId");
              const agentId = leadField<string | null>(lead, "assigned_agent_id", "assignedAgentId");
              const followUp = leadField<string | null>(lead, "follow_up_at", "followUpAt");
              const meta = getAutoPartsMeta(lead);
              return (
                <tr
                  key={String(lead.id)}
                  className={cn(
                    "border-b border-[rgb(var(--border))] cursor-pointer transition-colors duration-200",
                    isAutoPartsLead(lead)
                      ? "hover:bg-orange-50/60 dark:hover:bg-orange-950/25"
                      : "hover:bg-blue-50/50 dark:hover:bg-blue-950/25"
                  )}
                  onClick={() => onSelect?.(lead)}
                >
                  <td className="px-4 py-3 font-medium">{String(lead.name)}</td>
                  {showAutoPartsColumns && (
                    <>
                      <td className="px-4 py-3">
                        {isAutoPartsLead(lead) ? vehicleTitle(meta) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {isAutoPartsLead(lead) ? partNameForLead(lead, meta) : "—"}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3">{String(leadField(lead, "phone", "phone") || "—")}</td>
                  <td className="px-4 py-3">{String(leadField(lead, "email", "email") || "—")}</td>
                  <td className="px-4 py-3">{String(leadField(lead, "source", "source") || "—")}</td>
                  <td className="px-4 py-3">
                    <LeadStatusBadge status={String(lead.status)} />
                  </td>
                  {showAssignment && maps && (
                    <>
                      <td className="px-4 py-3">{centerId ? maps.centerNames.get(centerId) || "—" : "—"}</td>
                      <td className="px-4 py-3">{adminId ? maps.adminNames.get(adminId) || "—" : "—"}</td>
                      <td className="px-4 py-3">{agentId ? maps.agentNames.get(agentId) || "—" : "—"}</td>
                    </>
                  )}
                  <td className="px-4 py-3">{followUp ? new Date(followUp).toLocaleDateString() : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LeadCardGrid({
  leads,
  onSelect,
  maps,
}: {
  leads: AnyLead[];
  onSelect?: (lead: AnyLead) => void;
  maps?: AssignmentMaps;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {leads.map((lead) =>
        isAutoPartsLead(lead) ? (
          <AutoPartsLeadCard key={String(lead.id)} lead={lead} onSelect={onSelect} maps={maps} />
        ) : (
          <GenericLeadCard key={String(lead.id)} lead={lead} onSelect={onSelect} maps={maps} />
        )
      )}
    </div>
  );
}

export function LeadKanban({ columns }: { columns: Record<string, AnyLead[]> }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Object.entries(columns).map(([status, leads]) => (
        <div key={status} className="min-w-[280px] flex-shrink-0">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{status.replace("_", " ")}</h3>
            <span className="text-xs text-[rgb(var(--muted))]">{leads.length}</span>
          </div>
          <div className="space-y-2">
            {leads.map((lead) =>
              isAutoPartsLead(lead) ? (
                <AutoPartsLeadCard key={String(lead.id)} lead={lead} compact />
              ) : (
                <div key={String(lead.id)} className={cn(leadCardGeneric, "p-3")}>
                  <p className="font-medium text-sm">{String(lead.name)}</p>
                  <p className="text-xs text-[rgb(var(--muted))] mt-1">
                    {String(leadField(lead, "phone", "phone") || leadField(lead, "email", "email") || "—")}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LeadAgentWiseView({
  grouped,
  unassigned,
  maps,
  onSelect,
}: {
  grouped: Record<string, AnyLead[]>;
  unassigned: AnyLead[];
  maps: AssignmentMaps;
  onSelect?: (lead: AnyLead) => void;
}) {
  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([agentId, agentLeads]) => (
        <div key={agentId}>
          <h3 className="font-semibold mb-2">{maps.agentNames.get(agentId) || `Agent ${agentId.slice(0, 8)}`}</h3>
          <LeadCardGrid leads={agentLeads} onSelect={onSelect} />
        </div>
      ))}
      {unassigned.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Unassigned to Agent</h3>
          <LeadCardGrid leads={unassigned} onSelect={onSelect} />
        </div>
      )}
    </div>
  );
}

export function ViewSwitcher({
  view,
  onChange,
}: {
  view: "table" | "card" | "kanban" | "agent";
  onChange: (v: "table" | "card" | "kanban" | "agent") => void;
}) {
  const views = [
    { id: "table" as const, label: "Table" },
    { id: "card" as const, label: "Cards" },
    { id: "kanban" as const, label: "Kanban" },
    { id: "agent" as const, label: "By Agent" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-[rgb(var(--border))] p-1">
      {views.map((v) => (
        <button
          key={v.id}
          onClick={() => onChange(v.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            view === v.id ? "bg-blue-600 text-white" : "text-[rgb(var(--muted))] hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

function ActivityTimeline({ items }: { items: LeadActivityItem[] }) {
  if (!items.length) {
    return <p className="text-sm text-[rgb(var(--muted))]">No activity yet.</p>;
  }
  return (
    <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {items.map((item) => (
        <li
          key={item.id}
          className={cn(
            "text-sm border-l-[3px] pl-3 py-2 rounded-r-lg transition-colors duration-200",
            "hover:bg-white/60 dark:hover:bg-slate-800/50",
            ACTIVITY_CHANNEL_BORDER[item.channel] ?? ACTIVITY_CHANNEL_BORDER.SYSTEM
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-xs uppercase tracking-wide text-[rgb(var(--muted))]">
              {item.channel}
              {item.actor_name ? ` · ${item.actor_name}` : ""}
            </span>
            <span className="text-xs text-[rgb(var(--muted))] shrink-0 tabular-nums">
              {new Date(item.created_at).toLocaleString()}
            </span>
          </div>
          <p className="font-semibold text-sm mt-0.5">{item.title}</p>
          {item.body && <p className="text-sm text-[rgb(var(--muted))] mt-0.5 leading-relaxed">{item.body}</p>}
        </li>
      ))}
    </ul>
  );
}

export function LeadDetailDrawer({
  lead,
  open,
  onClose,
  role,
  onAssigned,
  maps: mapsProp,
}: {
  lead: AnyLead | null;
  open: boolean;
  onClose: () => void;
  role?: Role;
  onAssigned?: () => void;
  maps?: AssignmentMaps;
}) {
  const queryClient = useQueryClient();
  const internalMaps = useAssignmentMaps(open);
  const maps = mapsProp ?? internalMaps;
  const leadId = lead ? String(lead.id) : "";

  const [centerId, setCenterId] = useState("");
  const [adminId, setAdminId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [status, setStatus] = useState("");
  const [closeRemark, setCloseRemark] = useState("");
  const [clientUpdate, setClientUpdate] = useState("");
  const [newRemark, setNewRemark] = useState("");
  const [callOutcome, setCallOutcome] = useState("Reached — discussed requirements");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canWorkLead = role === "MASTER_ADMIN" || role === "ADMIN" || role === "AGENT";

  const { data: centers } = useQuery({
    queryKey: ["centers"],
    queryFn: fetchCenters,
    enabled: open && role === "MASTER_ADMIN",
  });
  const { data: admins } = useQuery({
    queryKey: ["admins"],
    queryFn: fetchAdmins,
    enabled: open && role === "MASTER_ADMIN",
  });
  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
    enabled: open && (role === "MASTER_ADMIN" || role === "ADMIN"),
  });
  const { data: remarks } = useQuery({
    queryKey: ["lead-remarks", leadId],
    queryFn: () => fetchRemarks(leadId),
    enabled: open && !!leadId && canWorkLead,
  });
  const { data: activity } = useQuery({
    queryKey: ["lead-activity", leadId],
    queryFn: () => fetchLeadActivity(leadId),
    enabled: open && !!leadId && canWorkLead,
  });

  const invalidateLeads = () => {
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["leads-kanban"] });
    queryClient.invalidateQueries({ queryKey: ["leads-agent"] });
    queryClient.invalidateQueries({ queryKey: ["agent-leads"] });
    if (leadId) {
      queryClient.invalidateQueries({ queryKey: ["lead-remarks", leadId] });
      queryClient.invalidateQueries({ queryKey: ["lead-activity", leadId] });
    }
  };

  useEffect(() => {
    if (!lead) return;
    setCenterId(leadField<string | null>(lead, "center_id", "centerId") || "");
    setAdminId(leadField<string | null>(lead, "assigned_admin_id", "assignedAdminId") || "");
    setAgentId(leadField<string | null>(lead, "assigned_agent_id", "assignedAgentId") || "");
    setStatus(String(lead.status));
    setCloseRemark("");
    setClientUpdate("");
    setNewRemark("");
    setError(null);
  }, [lead]);

  const assignMutation = useMutation({
    mutationFn: (data: { center_id?: string; assigned_admin_id?: string; assigned_agent_id?: string }) =>
      assignLead(leadId, data),
    onSuccess: () => {
      invalidateLeads();
      onAssigned?.();
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      const payload: Parameters<typeof updateLead>[1] = {};
      if (status && status !== String(lead?.status)) payload.status = status;
      if (clientUpdate.trim()) payload.client_update = clientUpdate.trim();
      if (CLOSED_STATUSES.includes(status as (typeof CLOSED_STATUSES)[number])) {
        payload.remark = closeRemark.trim();
      }
      return updateLead(leadId, payload);
    },
    onSuccess: () => {
      invalidateLeads();
      setCloseRemark("");
      setClientUpdate("");
    },
    onError: (err: Error) => setError(err.message),
  });

  const remarkMutation = useMutation({
    mutationFn: () => addRemark(leadId, newRemark.trim()),
    onSuccess: () => {
      setNewRemark("");
      invalidateLeads();
    },
    onError: (err: Error) => setError(err.message),
  });

  const callMutation = useMutation({
    mutationFn: () => logCall(leadId, { outcome: callOutcome, duration: 60 }),
    onSuccess: () => invalidateLeads(),
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLead(leadId),
    onSuccess: () => {
      invalidateLeads();
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      setConfirmDelete(false);
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const filteredAdmins = useMemo(
    () => (admins ?? []).filter((a: ApiUser) => !centerId || a.center_id === centerId),
    [admins, centerId]
  );

  if (!open || !lead) return null;

  const currentCenterId = leadField<string | null>(lead, "center_id", "centerId");
  const currentAdminId = leadField<string | null>(lead, "assigned_admin_id", "assignedAdminId");
  const currentAgentId = leadField<string | null>(lead, "assigned_agent_id", "assignedAgentId");
  const closing = CLOSED_STATUSES.includes(status as (typeof CLOSED_STATUSES)[number]);
  const rawMeta = leadField<Record<string, unknown>>(lead, "metadata", "metadata") ?? {};
  const lastClient =
    typeof rawMeta.last_client_update === "string" ? rawMeta.last_client_update : undefined;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-[rgb(var(--card))] shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-[rgb(var(--border))] bg-[rgb(var(--card))]/95 backdrop-blur px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-bold truncate">{String(lead.name)}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <LeadStatusBadge status={String(lead.status)} />
              </div>
              <AssignmentLine maps={maps} lead={lead} />
            </div>
            <button onClick={onClose} className="btn-secondary !px-3 !py-1.5 shrink-0">
              Close
            </button>
          </div>
        </div>
        <div className="p-5 space-y-5">
          <AutoPartsDetailSection lead={lead} />

          <DrawerSection title="Contact & lead info" accent="blue">
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Phone" value={String(leadField(lead, "phone", "phone") || "—")} />
              <DetailField label="Email" value={String(leadField(lead, "email", "email") || "—")} />
              <DetailField label="Source" value={String(leadField(lead, "source", "source") || "—")} />
              <DetailField
                label={isAutoPartsLead(lead) ? "ZIP Code" : "City"}
                value={String(zipCodeForLead(lead) || leadField(lead, "city", "city") || "—")}
              />
              <DetailField
                label="Attempts"
                value={String(leadField(lead, "attempt_count", "attemptCount") ?? 0)}
              />
              <DetailField
                label="Inquiries"
                value={String(leadField(lead, "inquiry_count", "inquiryCount") ?? 0)}
              />
            </div>
            {Boolean(leadField(lead, "message", "message")) && !isAutoPartsLead(lead) && (
              <div className="mt-4 pt-4 border-t border-[rgb(var(--border))]">
                <DetailField label="Message" value={String(leadField(lead, "message", "message"))} />
              </div>
            )}
          </DrawerSection>

          {lastClient && (
            <DrawerSection title="Last client response" accent="emerald">
              <p className="text-sm leading-relaxed">{lastClient}</p>
            </DrawerSection>
          )}

          {canWorkLead && (
            <DrawerSection title="Update lead" accent="violet">
              <div>
                <label className="block text-sm mb-1">Status</label>
                <select className="input w-full" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              {closing && (
                <div>
                  <label className="block text-sm mb-1 text-red-600">Closing remark (required)</label>
                  <textarea
                    className="input w-full min-h-[80px]"
                    value={closeRemark}
                    onChange={(e) => setCloseRemark(e.target.value)}
                    placeholder="Why is this lead being closed?"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm mb-1">Client response</label>
                <textarea
                  className="input w-full min-h-[60px]"
                  value={clientUpdate}
                  onChange={(e) => setClientUpdate(e.target.value)}
                  placeholder="What did the client say?"
                />
              </div>
              <button
                className="btn-primary w-full"
                disabled={
                  updateMutation.isPending ||
                  (closing && !closeRemark.trim()) ||
                  (status === String(lead.status) && !clientUpdate.trim())
                }
                onClick={() => updateMutation.mutate()}
              >
                {updateMutation.isPending ? "Saving..." : "Save update"}
              </button>
              <button
                className="btn-secondary w-full transition-all duration-200 hover:border-emerald-300"
                disabled={callMutation.isPending}
                onClick={() => callMutation.mutate()}
              >
                {callMutation.isPending ? "Logging..." : "Log outbound call"}
              </button>
            </DrawerSection>
          )}

          {canWorkLead && (
            <DrawerSection title="Remarks" accent="orange">
              <ul className="space-y-2 max-h-44 overflow-y-auto">
                {(remarks ?? []).map((r) => (
                  <li key={r.id} className="lead-remark-card text-sm bg-white/50 dark:bg-slate-900/50">
                    <p className="text-xs font-medium text-[rgb(var(--muted))]">
                      {r.author_name || "Agent"} · {new Date(r.created_at).toLocaleString()}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed">{r.body}</p>
                  </li>
                ))}
              </ul>
              <textarea
                className="input w-full min-h-[60px]"
                value={newRemark}
                onChange={(e) => setNewRemark(e.target.value)}
                placeholder="Add a remark..."
              />
              <button
                className="btn-secondary w-full mt-3"
                disabled={!newRemark.trim() || remarkMutation.isPending}
                onClick={() => remarkMutation.mutate()}
              >
                {remarkMutation.isPending ? "Adding..." : "Add remark"}
              </button>
            </DrawerSection>
          )}

          {canWorkLead && (
            <DrawerSection title="Activity timeline" accent="default">
              <ActivityTimeline items={activity ?? []} />
            </DrawerSection>
          )}

          {role === "MASTER_ADMIN" && (
            <DrawerSection title="Route to Admin" accent="blue">
              <p className="text-xs text-[rgb(var(--muted))]">
                Current: {currentAdminId ? "assigned" : "unassigned"}
                {currentCenterId ? ` · center set` : ""}
              </p>
              <div>
                <label className="block text-sm mb-1">Center</label>
                <select className="input w-full" value={centerId} onChange={(e) => setCenterId(e.target.value)}>
                  <option value="">Select center</option>
                  {centers?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Admin</label>
                <select className="input w-full" value={adminId} onChange={(e) => setAdminId(e.target.value)}>
                  <option value="">Select admin</option>
                  {filteredAdmins.map((a) => (
                    <option key={a.id} value={a.id}>
                      {userDisplayName(a)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn-primary w-full"
                disabled={!centerId || !adminId || assignMutation.isPending}
                onClick={() =>
                  assignMutation.mutate({ center_id: centerId, assigned_admin_id: adminId })
                }
              >
                {assignMutation.isPending ? "Routing..." : "Route to Admin"}
              </button>
            </DrawerSection>
          )}

          {role === "ADMIN" && (
            <DrawerSection title="Assign to Agent" accent="blue">
              <p className="text-xs text-[rgb(var(--muted))]">
                Current agent: {currentAgentId ? "assigned" : "unassigned"}
              </p>
              <div>
                <label className="block text-sm mb-1">Agent</label>
                <select className="input w-full" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                  <option value="">Select agent</option>
                  {agents?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {userDisplayName(a)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn-primary w-full"
                disabled={!agentId || assignMutation.isPending}
                onClick={() => assignMutation.mutate({ assigned_agent_id: agentId })}
              >
                {assignMutation.isPending ? "Assigning..." : "Assign to Agent"}
              </button>
            </DrawerSection>
          )}

          {error && (
            <p className="text-sm text-red-600 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:bg-red-950/30">
              {error}
            </p>
          )}

          {role === "MASTER_ADMIN" && (
            <DrawerSection title="Danger zone" accent="rose">
              <button
                className="w-full btn-secondary text-red-600 border-red-200 transition-colors duration-200 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={() => setConfirmDelete(true)}
              >
                Delete Lead
              </button>
            </DrawerSection>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(false)} />
          <div className="relative w-full max-w-md card p-6">
            <h3 className="font-semibold mb-2">Delete Lead</h3>
            <p className="text-sm text-[rgb(var(--muted))] mb-4">
              Move &quot;{String(lead.name)}&quot; to Trash?
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
              <button
                className="btn-primary bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                {deleteMutation.isPending ? "Deleting..." : "Move to Trash"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
