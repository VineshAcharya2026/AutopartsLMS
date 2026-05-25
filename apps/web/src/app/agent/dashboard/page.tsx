"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { StatsCard } from "@/components/leads/LeadViews";
import { apiFetch, type ApiLead } from "@/lib/api";
import type { DashboardStats, PaginatedResponse } from "@centercrm/shared-types";

function AgentDashboardContent() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardStats>("/analytics/dashboard"),
  });

  const { data: leadsData } = useQuery({
    queryKey: ["agent-leads"],
    queryFn: () => apiFetch<PaginatedResponse<ApiLead>>("/leads?page_size=20"),
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const leads = leadsData?.items ?? [];
  const followUpsToday = leads.filter((l) => {
    const fu = l.follow_up_at;
    if (!fu) return false;
    const d = new Date(fu);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });
  const overdue = leads.filter((l) => l.follow_up_at && new Date(l.follow_up_at) < new Date());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return <div className="card p-6 text-red-600">Unable to load dashboard</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Agent Dashboard</h1>
        <Link href="/agent/leads" className="btn-primary">
          My Leads
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <StatsCard title="My Leads" value={stats?.total_leads ?? 0} />
        <StatsCard title="Follow-ups Today" value={stats?.follow_ups_today ?? 0} />
        <StatsCard title="Overdue" value={stats?.overdue_tasks ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold mb-4">Today&apos;s Follow-ups</h2>
          {followUpsToday.length === 0 ? (
            <p className="text-sm text-[rgb(var(--muted))]">No follow-ups scheduled for today</p>
          ) : (
            <ul className="space-y-2">
              {followUpsToday.slice(0, 5).map((l) => (
                <li key={l.id} className="text-sm flex justify-between">
                  <span>{l.name}</span>
                  <span className="text-[rgb(var(--muted))]">{l.phone || l.email}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <h2 className="font-semibold mb-4 text-red-600">Overdue</h2>
          {overdue.length === 0 ? (
            <p className="text-sm text-[rgb(var(--muted))]">Nothing overdue</p>
          ) : (
            <ul className="space-y-2">
              {overdue.slice(0, 5).map((l) => (
                <li key={l.id} className="text-sm flex justify-between">
                  <span>{l.name}</span>
                  <span className="text-[rgb(var(--muted))]">
                    {l.follow_up_at ? new Date(l.follow_up_at).toLocaleDateString() : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {overdue.length > 0 && (
            <Link href="/agent/overdue" className="text-sm text-blue-600 mt-3 inline-block hover:underline">
              View all overdue
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentDashboardPage() {
  return (
    <RoleLayout allowedRole="AGENT">
      <AgentDashboardContent />
    </RoleLayout>
  );
}
