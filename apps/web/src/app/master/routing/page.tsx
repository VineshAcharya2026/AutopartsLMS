"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { apiFetch, createRoutingRule, fetchAdmins, fetchAgents, fetchCenters, userDisplayName } from "@/lib/api";

function RoutingPageContent() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [centerId, setCenterId] = useState("");
  const [priority, setPriority] = useState("0");
  const [source, setSource] = useState("");
  const [city, setCity] = useState("");
  const [campaign, setCampaign] = useState("");
  const [assignAdminId, setAssignAdminId] = useState("");
  const [assignAgentId, setAssignAgentId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: rules } = useQuery({
    queryKey: ["routing-rules"],
    queryFn: () => apiFetch<any[]>("/routing-rules"),
  });

  const { data: centers } = useQuery({
    queryKey: ["centers"],
    queryFn: fetchCenters,
  });

  const { data: admins } = useQuery({
    queryKey: ["admins"],
    queryFn: fetchAdmins,
  });

  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
  });

  const centerMap = useMemo(() => new Map(centers?.map((c) => [c.id, c.name]) ?? []), [centers]);
  const adminMap = useMemo(() => new Map(admins?.map((a) => [a.id, userDisplayName(a)]) ?? []), [admins]);
  const agentMap = useMemo(() => new Map(agents?.map((a) => [a.id, userDisplayName(a)]) ?? []), [agents]);

  const filteredAdmins = useMemo(
    () => (admins ?? []).filter((a) => !centerId || a.center_id === centerId),
    [admins, centerId]
  );

  const filteredAgents = useMemo(
    () => (agents ?? []).filter((a) => !centerId || a.center_id === centerId),
    [agents, centerId]
  );

  const createMutation = useMutation({
    mutationFn: createRoutingRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
      setShowForm(false);
      setName("");
      setCenterId("");
      setPriority("0");
      setSource("");
      setCity("");
      setCampaign("");
      setAssignAdminId("");
      setAssignAgentId("");
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const conditions: Record<string, string> = {};
    if (source) conditions.source = source;
    if (city) conditions.city = city;
    if (campaign) conditions.campaign = campaign;

    createMutation.mutate({
      name,
      center_id: centerId,
      priority: Number(priority) || 0,
      conditions,
      assign_admin_id: assignAdminId || undefined,
      assign_agent_id: assignAgentId || undefined,
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Lead Routing Rules</h1>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "Create Rule"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card p-5 mb-6 space-y-4">
          <h2 className="font-semibold">New Routing Rule</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm mb-1">Rule name</label>
              <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm mb-1">Center</label>
              <select className="input w-full" value={centerId} onChange={(e) => setCenterId(e.target.value)} required>
                <option value="">Select center</option>
                {centers?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Priority</label>
              <input
                type="number"
                className="input w-full"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Assign Admin</label>
              <select className="input w-full" value={assignAdminId} onChange={(e) => setAssignAdminId(e.target.value)}>
                <option value="">None</option>
                {filteredAdmins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {userDisplayName(a)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Assign Agent</label>
              <select className="input w-full" value={assignAgentId} onChange={(e) => setAssignAgentId(e.target.value)}>
                <option value="">None</option>
                {filteredAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {userDisplayName(a)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Conditions (optional)</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                className="input w-full"
                placeholder="Source e.g. WEBSITE_FORM"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
              <input
                className="input w-full"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <input
                className="input w-full"
                placeholder="Campaign"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Save Rule"}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {rules?.length === 0 && (
          <p className="text-[rgb(var(--muted))]">No routing rules yet. Create one to auto-assign leads on ingest.</p>
        )}
        {rules?.map((rule) => (
          <div key={rule.id} className="card p-5">
            <div className="flex flex-wrap justify-between gap-2">
              <h3 className="font-semibold">{rule.name}</h3>
              <span className="text-sm text-[rgb(var(--muted))]">Priority: {rule.priority}</span>
            </div>
            <div className="mt-2 text-sm text-[rgb(var(--muted))] space-y-1">
              <p>Center: {centerMap.get(rule.center_id) || rule.center_id}</p>
              {rule.assign_admin_id && (
                <p>Admin: {adminMap.get(rule.assign_admin_id) || rule.assign_admin_id}</p>
              )}
              {rule.assign_agent_id && (
                <p>Agent: {agentMap.get(rule.assign_agent_id) || rule.assign_agent_id}</p>
              )}
            </div>
            <pre className="mt-2 text-xs bg-slate-50 dark:bg-slate-900 p-2 rounded overflow-auto">
              {JSON.stringify(rule.conditions, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MasterRoutingPage() {
  return (
    <RoleLayout allowedRole="MASTER_ADMIN">
      <RoutingPageContent />
    </RoleLayout>
  );
}
