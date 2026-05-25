"use client";

import { useQuery } from "@tanstack/react-query";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { apiFetch } from "@/lib/api";

function TemplatesPageContent() {
  const { data: templates } = useQuery({
    queryKey: ["templates"],
    queryFn: () => apiFetch<any[]>("/comms/templates"),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Message Templates</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {templates?.map((t) => (
          <div key={t.id} className="card p-5">
            <div className="flex justify-between mb-2">
              <h3 className="font-semibold">{t.name}</h3>
              <span className="badge bg-blue-100 text-blue-800">{t.channel}</span>
            </div>
            <p className="text-sm text-[rgb(var(--muted))]">{t.body.slice(0, 120)}...</p>
          </div>
        ))}
        {templates?.length === 0 && <p className="text-[rgb(var(--muted))]">No templates yet</p>}
      </div>
    </div>
  );
}

export default function AdminTemplatesPage() {
  return (
    <RoleLayout allowedRole="ADMIN">
      <TemplatesPageContent />
    </RoleLayout>
  );
}
