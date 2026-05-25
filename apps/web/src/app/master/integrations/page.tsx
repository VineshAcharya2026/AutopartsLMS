"use client";

import { useQuery } from "@tanstack/react-query";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { apiFetch } from "@/lib/api";

function IntegrationsPageContent() {
  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => apiFetch<any[]>("/integrations"),
  });

  const { data: failedQueue } = useQuery({
    queryKey: ["failed-emails"],
    queryFn: () => apiFetch<any[]>("/integrations/email/failed-queue"),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Integrations</h1>
      <div className="grid gap-4 mb-8">
        {integrations?.map((i) => (
          <div key={i.id} className="card p-5 flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{i.name}</h3>
              <p className="text-sm text-[rgb(var(--muted))]">{i.type} · {i.is_active ? "Active" : "Inactive"}</p>
            </div>
            {i.api_key && <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{i.api_key.slice(0, 16)}...</code>}
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-4">Failed Email Parse Queue</h2>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-[rgb(var(--border))]">
            <tr>
              <th className="px-4 py-3 text-left">Error</th>
              <th className="px-4 py-3 text-left">Preview</th>
              <th className="px-4 py-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {failedQueue?.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-[rgb(var(--muted))]">No failed emails</td></tr>
            )}
            {failedQueue?.map((item) => (
              <tr key={item.id} className="border-b border-[rgb(var(--border))]">
                <td className="px-4 py-3 text-red-600">{item.parse_error}</td>
                <td className="px-4 py-3 max-w-md truncate">{item.raw_content}</td>
                <td className="px-4 py-3">{new Date(item.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MasterIntegrationsPage() {
  return (
    <RoleLayout allowedRole="MASTER_ADMIN">
      <IntegrationsPageContent />
    </RoleLayout>
  );
}
