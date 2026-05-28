"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { DashboardPanel, DashboardRow, DashboardStatsCard } from "@/components/dashboard";
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
    <div className="dashboard-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Agent Dashboard</h1>
        <Link href="/agent/leads" className="btn-primary transition-all duration-300 hover:shadow-md">
          My Leads
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <DashboardStatsCard title="My Leads" value={stats?.total_leads ?? 0} variant="blue" />
        <DashboardStatsCard title="Follow-ups Today" value={stats?.follow_ups_today ?? 0} variant="violet" />
        <DashboardStatsCard title="Overdue" value={stats?.overdue_tasks ?? 0} variant="rose" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel title="Today's Follow-ups" accent="blue">
          {followUpsToday.length === 0 ? (
            <p className="text-sm text-[rgb(var(--muted))]">No follow-ups scheduled for today</p>
          ) : (
            <ul className="space-y-1">
              {followUpsToday.slice(0, 5).map((l) => (
                <DashboardRow key={l.id}>
                  <span>{l.name}</span>
                  <span className="text-[rgb(var(--muted))]">{l.phone || l.email}</span>
                </DashboardRow>
              ))}
            </ul>
          )}
        </DashboardPanel>
        <DashboardPanel title="Overdue" accent="rose">
          {overdue.length === 0 ? (
            <p className="text-sm text-[rgb(var(--muted))]">Nothing overdue</p>
          ) : (
            <ul className="space-y-1">
              {overdue.slice(0, 5).map((l) => (
                <DashboardRow key={l.id}>
                  <span>{l.name}</span>
                  <span className="text-[rgb(var(--muted))]">
                    {l.follow_up_at ? new Date(l.follow_up_at).toLocaleDateString() : "—"}
                  </span>
                </DashboardRow>
              ))}
            </ul>
          )}
          {overdue.length > 0 && (
            <Link
              href="/agent/overdue"
              className="text-sm text-blue-600 mt-3 inline-block transition-colors duration-200 hover:text-blue-700 hover:underline"
            >
              View all overdue
            </Link>
          )}
        </DashboardPanel>
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
