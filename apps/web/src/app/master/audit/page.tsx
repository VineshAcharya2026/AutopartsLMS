"use client";

import { useQuery } from "@tanstack/react-query";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { apiFetch } from "@/lib/api";

function AuditPageContent() {
  const { data: logs } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => apiFetch<any[]>("/audit-logs"),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Audit Logs</h1>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-[rgb(var(--border))]">
            <tr>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Entity</th>
              <th className="px-4 py-3 text-left">IP</th>
              <th className="px-4 py-3 text-left">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map((log) => (
              <tr key={log.id} className="border-b border-[rgb(var(--border))]">
                <td className="px-4 py-3 font-medium">{log.action}</td>
                <td className="px-4 py-3">{log.entity_type} · {log.entity_id.slice(0, 8)}</td>
                <td className="px-4 py-3">{log.ip_address || "—"}</td>
                <td className="px-4 py-3">{new Date(log.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MasterAuditPage() {
  return (
    <RoleLayout allowedRole="MASTER_ADMIN">
      <AuditPageContent />
    </RoleLayout>
  );
}
