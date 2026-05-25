"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { StatsCard } from "@/components/leads/LeadViews";
import { apiFetch } from "@/lib/api";
import type { DashboardStats } from "@centercrm/shared-types";

type ExtendedStats = DashboardStats & {
  unassigned_to_agent?: number;
};

function AdminDashboardContent() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<ExtendedStats>("/analytics/dashboard"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card p-6 border-red-200 bg-red-50 text-red-700">
        <p className="text-sm">{error instanceof Error ? error.message : "Unable to load dashboard"}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Link href="/admin/leads" className="btn-primary">
          My Leads
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard title="My Leads" value={data?.total_leads ?? 0} />
        <StatsCard title="Unassigned to Agent" value={data?.unassigned_to_agent ?? 0} />
        <StatsCard title="Follow-ups Today" value={data?.follow_ups_today ?? 0} />
        <StatsCard title="Overdue Tasks" value={data?.overdue_tasks ?? 0} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 mb-8">
        <div className="card p-5">
          <h2 className="font-semibold mb-4">Leads by Status</h2>
          <div className="space-y-2">
            {Object.entries(data?.leads_by_status ?? {}).map(([status, count]) => (
              <div key={status} className="flex justify-between text-sm">
                <span>{status}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold mb-4">Agent Productivity</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgb(var(--border))]">
                <th className="py-2 text-left">Agent</th>
                <th className="py-2 text-left">Leads</th>
                <th className="py-2 text-left">Converted</th>
              </tr>
            </thead>
            <tbody>
              {data?.agent_productivity?.map((a: Record<string, unknown>) => (
                <tr key={String(a.agent_id)} className="border-b border-[rgb(var(--border))]">
                  <td className="py-2">{String(a.name)}</td>
                  <td className="py-2">{String(a.total_leads)}</td>
                  <td className="py-2">{String(a.converted)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <RoleLayout allowedRole="ADMIN">
      <AdminDashboardContent />
    </RoleLayout>
  );
}
