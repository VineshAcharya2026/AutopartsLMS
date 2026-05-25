"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { StatsCard } from "@/components/leads/LeadViews";
import { apiFetch } from "@/lib/api";
import type { DashboardStats } from "@centercrm/shared-types";

type ExtendedStats = DashboardStats & {
  unassigned_to_admin?: number;
  trash_count?: number;
};

function MasterDashboardContent() {
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
        <h2 className="font-semibold mb-2">Unable to load dashboard</h2>
        <p className="text-sm">{error instanceof Error ? error.message : "Unknown error"}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Master Admin Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard title="Total Leads" value={data?.total_leads ?? 0} />
        <StatsCard title="Unassigned to Admin" value={data?.unassigned_to_admin ?? 0} />
        <StatsCard title="Items in Trash" value={data?.trash_count ?? 0} />
        <StatsCard title="Converted" value={data?.converted_leads ?? 0} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Link href="/master/leads" className="card p-4 hover:shadow-md transition-shadow">
          <h3 className="font-semibold">Lead Center</h3>
          <p className="text-sm text-[rgb(var(--muted))] mt-1">Route leads to admins</p>
        </Link>
        <Link href="/master/admins" className="card p-4 hover:shadow-md transition-shadow">
          <h3 className="font-semibold">Manage Admins</h3>
          <p className="text-sm text-[rgb(var(--muted))] mt-1">Create and edit admin accounts</p>
        </Link>
        <Link href="/master/trash" className="card p-4 hover:shadow-md transition-shadow">
          <h3 className="font-semibold">Trash</h3>
          <p className="text-sm text-[rgb(var(--muted))] mt-1">Restore or permanently delete</p>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
          <h2 className="font-semibold mb-4">Leads by Source</h2>
          <div className="space-y-2">
            {Object.entries(data?.leads_by_source ?? {}).map(([source, count]) => (
              <div key={source} className="flex justify-between text-sm">
                <span>{source}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MasterDashboardPage() {
  return (
    <RoleLayout allowedRole="MASTER_ADMIN">
      <MasterDashboardContent />
    </RoleLayout>
  );
}
