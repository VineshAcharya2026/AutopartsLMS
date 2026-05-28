"use client";

import { Inbox, Trash2, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { RoleLayout } from "@/components/layout/RoleLayout";
import {
  DashboardPanel,
  DashboardRow,
  DashboardStatsCard,
  QuickActionCard,
} from "@/components/dashboard";
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
    <div className="dashboard-enter">
      <h1 className="text-2xl font-bold mb-6">Master Admin Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <DashboardStatsCard title="Total Leads" value={data?.total_leads ?? 0} variant="blue" />
        <DashboardStatsCard
          title="Unassigned to Admin"
          value={data?.unassigned_to_admin ?? 0}
          variant="orange"
        />
        <DashboardStatsCard title="Items in Trash" value={data?.trash_count ?? 0} variant="rose" />
        <DashboardStatsCard title="Converted" value={data?.converted_leads ?? 0} variant="emerald" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <QuickActionCard
          href="/master/leads"
          title="Lead Center"
          description="Route leads to admins"
          icon={Inbox}
          variant="blue"
        />
        <QuickActionCard
          href="/master/admins"
          title="Manage Admins"
          description="Create and edit admin accounts"
          icon={Users}
          variant="emerald"
        />
        <QuickActionCard
          href="/master/trash"
          title="Trash"
          description="Restore or permanently delete"
          icon={Trash2}
          variant="rose"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel title="Leads by Status">
          <div className="space-y-1">
            {Object.entries(data?.leads_by_status ?? {}).map(([status, count]) => (
              <DashboardRow key={status}>
                <span>{status}</span>
                <span className="font-medium">{count}</span>
              </DashboardRow>
            ))}
          </div>
        </DashboardPanel>
        <DashboardPanel title="Leads by Source">
          <div className="space-y-1">
            {Object.entries(data?.leads_by_source ?? {}).map(([source, count]) => (
              <DashboardRow key={source}>
                <span>{source}</span>
                <span className="font-medium">{count}</span>
              </DashboardRow>
            ))}
          </div>
        </DashboardPanel>
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
