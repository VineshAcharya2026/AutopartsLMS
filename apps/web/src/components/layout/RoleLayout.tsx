"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { AppShell } from "@/components/layout/AppShell";

export function RoleLayout({
  children,
  allowedRole,
}: {
  children: React.ReactNode;
  allowedRole: string;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== allowedRole) {
      if (user.role === "MASTER_ADMIN") router.replace("/master/dashboard");
      else if (user.role === "ADMIN") router.replace("/admin/dashboard");
      else router.replace("/agent/dashboard");
    }
  }, [user, allowedRole, router]);

  if (!user || user.role !== allowedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
