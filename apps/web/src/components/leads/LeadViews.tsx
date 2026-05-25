"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Lead, Role } from "@centercrm/shared-types";
import {
  assignLead,
  deleteLead,
  fetchAdmins,
  fetchAgents,
  fetchCenters,
  userDisplayName,
  type ApiLead,
  type ApiUser,
} from "@/lib/api";
import { STATUS_COLORS, cn } from "@/lib/utils";

type AnyLead = Lead | ApiLead;

function leadField<T>(lead: AnyLead, snake: string, camel: string): T | undefined {
  const record = lead as Record<string, unknown>;
  return (record[snake] ?? record[camel]) as T | undefined;
}

export function LeadStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("badge", STATUS_COLORS[status] || "bg-gray-100 text-gray-800")}>{status}</span>
  );
}

export function StatsCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-[rgb(var(--muted))]">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-[rgb(var(--muted))]">{subtitle}</p>}
    </div>
  );
}

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
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[rgb(var(--border))] bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
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
              return (
                <tr
                  key={String(lead.id)}
                  className="border-b border-[rgb(var(--border))] hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
                  onClick={() => onSelect?.(lead)}
                >
                  <td className="px-4 py-3 font-medium">{String(lead.name)}</td>
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

export function LeadCardGrid({ leads, onSelect }: { leads: AnyLead[]; onSelect?: (lead: AnyLead) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {leads.map((lead) => (
        <div
          key={String(lead.id)}
          className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onSelect?.(lead)}
        >
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
        </div>
      ))}
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
            {leads.map((lead) => (
              <div key={String(lead.id)} className="card p-3">
                <p className="font-medium text-sm">{String(lead.name)}</p>
                <p className="text-xs text-[rgb(var(--muted))] mt-1">
                  {String(leadField(lead, "phone", "phone") || leadField(lead, "email", "email") || "—")}
                </p>
              </div>
            ))}
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

export function LeadDetailDrawer({
  lead,
  open,
  onClose,
  role,
  onAssigned,
}: {
  lead: AnyLead | null;
  open: boolean;
  onClose: () => void;
  role?: Role;
  onAssigned?: () => void;
}) {
  const queryClient = useQueryClient();
  const [centerId, setCenterId] = useState("");
  const [adminId, setAdminId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  useEffect(() => {
    if (!lead) return;
    setCenterId(leadField<string | null>(lead, "center_id", "centerId") || "");
    setAdminId(leadField<string | null>(lead, "assigned_admin_id", "assignedAdminId") || "");
    setAgentId(leadField<string | null>(lead, "assigned_agent_id", "assignedAgentId") || "");
    setError(null);
  }, [lead]);

  const assignMutation = useMutation({
    mutationFn: (data: { center_id?: string; assigned_admin_id?: string; assigned_agent_id?: string }) =>
      assignLead(String(lead?.id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-kanban"] });
      queryClient.invalidateQueries({ queryKey: ["leads-agent"] });
      onAssigned?.();
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLead(String(lead?.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-kanban"] });
      queryClient.invalidateQueries({ queryKey: ["leads-agent"] });
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[rgb(var(--card))] shadow-xl overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between border-b border-[rgb(var(--border))] p-4 bg-[rgb(var(--card))]">
          <h2 className="text-lg font-semibold">{String(lead.name)}</h2>
          <button onClick={onClose} className="btn-secondary !px-2 !py-1">
            Close
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <LeadStatusBadge status={String(lead.status)} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-[rgb(var(--muted))]">Phone</span>
              <p>{String(leadField(lead, "phone", "phone") || "—")}</p>
            </div>
            <div>
              <span className="text-[rgb(var(--muted))]">Email</span>
              <p>{String(leadField(lead, "email", "email") || "—")}</p>
            </div>
            <div>
              <span className="text-[rgb(var(--muted))]">Source</span>
              <p>{String(leadField(lead, "source", "source") || "—")}</p>
            </div>
            <div>
              <span className="text-[rgb(var(--muted))]">City</span>
              <p>{String(leadField(lead, "city", "city") || "—")}</p>
            </div>
            <div>
              <span className="text-[rgb(var(--muted))]">Attempts</span>
              <p>{String(leadField(lead, "attempt_count", "attemptCount") ?? 0)}</p>
            </div>
            <div>
              <span className="text-[rgb(var(--muted))]">Inquiries</span>
              <p>{String(leadField(lead, "inquiry_count", "inquiryCount") ?? 0)}</p>
            </div>
          </div>
          {Boolean(leadField(lead, "message", "message")) && (
            <div className="text-sm">
              <span className="text-[rgb(var(--muted))]">Message</span>
              <p className="mt-1">{String(leadField(lead, "message", "message"))}</p>
            </div>
          )}

          {role === "MASTER_ADMIN" && (
            <div className="border-t border-[rgb(var(--border))] pt-4 space-y-3">
              <h3 className="font-semibold">Route to Admin</h3>
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
            </div>
          )}

          {role === "ADMIN" && (
            <div className="border-t border-[rgb(var(--border))] pt-4 space-y-3">
              <h3 className="font-semibold">Assign to Agent</h3>
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
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {role === "MASTER_ADMIN" && (
            <div className="border-t border-[rgb(var(--border))] pt-4">
              <button
                className="w-full btn-secondary text-red-600 border-red-200"
                onClick={() => setConfirmDelete(true)}
              >
                Delete Lead
              </button>
            </div>
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
