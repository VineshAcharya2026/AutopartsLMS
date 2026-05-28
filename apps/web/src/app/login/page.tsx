"use client";

import { PORTAL_THEMES } from "@/components/auth/rolePortalTheme";
import { RolePortalCard } from "@/components/auth/RolePortalCard";
import { APP_NAME } from "@/lib/branding";

export default function LoginPickerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        <header className="portal-fade-in mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
            {APP_NAME}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Choose your portal
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-[rgb(var(--muted))]">
            Three dedicated workspaces for Master Admin, Admin, and Agent roles — each with its own
            login and dashboard.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PORTAL_THEMES.map((theme, index) => (
            <RolePortalCard key={theme.role} theme={theme} index={index} />
          ))}
        </div>

        <p className="portal-fade-in mt-10 text-center text-xs text-[rgb(var(--muted))]">
          Demo password for all roles: <span className="font-mono">Admin@123</span>
        </p>
      </div>
    </div>
  );
}
