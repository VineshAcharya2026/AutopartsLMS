"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Building2,
  Calendar,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { APP_NAME } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { useAuthStore, useUIStore } from "@/lib/store";
import { useNotifications } from "@/hooks/useNotifications";
import { logout } from "@/components/auth/RoleLoginForm";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const masterNav: NavItem[] = [
  { label: "Dashboard", href: "/master/dashboard", icon: LayoutDashboard },
  { label: "All Leads", href: "/master/leads", icon: Inbox },
  { label: "Admins", href: "/master/admins", icon: Users },
  { label: "Centers", href: "/master/centers", icon: Building2 },
  { label: "Integrations", href: "/master/integrations", icon: Settings },
  { label: "Routing Rules", href: "/master/routing", icon: BarChart3 },
  { label: "Audit Logs", href: "/master/audit", icon: BarChart3 },
  { label: "Trash", href: "/master/trash", icon: Trash2 },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Leads", href: "/admin/leads", icon: Inbox },
  { label: "Agents", href: "/admin/agents", icon: Users },
  { label: "Follow-ups", href: "/admin/follow-ups", icon: Calendar },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Templates", href: "/admin/templates", icon: Settings },
];

const agentNav: NavItem[] = [
  { label: "Dashboard", href: "/agent/dashboard", icon: LayoutDashboard },
  { label: "My Leads", href: "/agent/leads", icon: Inbox },
  { label: "Follow-ups", href: "/agent/follow-ups", icon: Calendar },
  { label: "Overdue", href: "/agent/overdue", icon: Bell },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { sidebarOpen, setSidebarOpen, theme, toggleTheme } = useUIStore();
  const { notifications, unreadCount } = useNotifications();

  const nav =
    user?.role === "MASTER_ADMIN" ? masterNav : user?.role === "ADMIN" ? adminNav : agentNav;

  return (
    <div className="min-h-screen flex">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-[rgb(var(--border))] bg-[rgb(var(--card))] transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-[rgb(var(--border))]">
          <span className="text-lg font-bold text-blue-600">CenterCRM</span>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-out",
                  active
                    ? "bg-gradient-to-r from-orange-50 to-blue-50 text-blue-700 shadow-sm dark:from-orange-950/40 dark:to-blue-950/40 dark:text-blue-300"
                    : "text-[rgb(var(--muted))] hover:bg-orange-50/60 hover:text-orange-800 dark:hover:bg-orange-950/30 dark:hover:text-orange-200"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[rgb(var(--border))]">
          <p className="text-xs text-[rgb(var(--muted))]">{user?.email}</p>
          <p className="text-sm font-medium capitalize">{user?.role?.replace("_", " ").toLowerCase()}</p>
          <button
            className="mt-2 flex items-center gap-2 text-sm text-red-600 hover:underline"
            onClick={() => user?.role && logout(user.role)}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className={cn("flex-1 flex flex-col", sidebarOpen ? "lg:ml-64" : "")}>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--card))]/80 backdrop-blur px-4">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <button onClick={toggleTheme} className="btn-secondary !px-2 !py-2">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <div className="relative">
            <Bell className="h-5 w-5 text-[rgb(var(--muted))]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {unreadCount}
              </span>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
