import type { Role } from "@centercrm/shared-types";
import type { LucideIcon } from "lucide-react";
import { Building2, Shield, UserCircle } from "lucide-react";

export type PortalTheme = {
  role: Role;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  demoEmail: string;
  dashboard: string;
  icon: LucideIcon;
  heroImage: string;
  gradient: string;
  gradientDark: string;
  accent: string;
  accentHover: string;
  ring: string;
  glow: string;
};

export const PORTAL_THEMES: PortalTheme[] = [
  {
    role: "MASTER_ADMIN",
    title: "Master Admin",
    subtitle: "Organization control",
    description: "Manage centers, admins, routing, and trash",
    href: "/login/master",
    demoEmail: "master@centercrm.com",
    dashboard: "/master/dashboard",
    icon: Shield,
    heroImage: "/login/master.svg",
    gradient: "from-indigo-600 via-violet-600 to-purple-800",
    gradientDark: "dark:from-indigo-950 dark:via-violet-950 dark:to-purple-950",
    accent: "text-indigo-600 dark:text-indigo-400",
    accentHover: "group-hover:text-indigo-700",
    ring: "ring-indigo-500/20 hover:ring-indigo-500/40",
    glow: "shadow-indigo-500/10 hover:shadow-indigo-500/25",
  },
  {
    role: "ADMIN",
    title: "Admin",
    subtitle: "Center operations",
    description: "Manage agents and assign leads in your center",
    href: "/login/admin",
    demoEmail: "admin@centercrm.com",
    dashboard: "/admin/dashboard",
    icon: Building2,
    heroImage: "/login/admin.svg",
    gradient: "from-blue-600 via-sky-600 to-cyan-700",
    gradientDark: "dark:from-blue-950 dark:via-sky-950 dark:to-cyan-950",
    accent: "text-blue-600 dark:text-blue-400",
    accentHover: "group-hover:text-blue-700",
    ring: "ring-blue-500/20 hover:ring-blue-500/40",
    glow: "shadow-blue-500/10 hover:shadow-blue-500/25",
  },
  {
    role: "AGENT",
    title: "Agent",
    subtitle: "Lead execution",
    description: "Work assigned leads and follow-ups",
    href: "/login/agent",
    demoEmail: "agent@centercrm.com",
    dashboard: "/agent/dashboard",
    icon: UserCircle,
    heroImage: "/login/agent.svg",
    gradient: "from-emerald-600 via-teal-600 to-green-700",
    gradientDark: "dark:from-emerald-950 dark:via-teal-950 dark:to-green-950",
    accent: "text-emerald-600 dark:text-emerald-400",
    accentHover: "group-hover:text-emerald-700",
    ring: "ring-emerald-500/20 hover:ring-emerald-500/40",
    glow: "shadow-emerald-500/10 hover:shadow-emerald-500/25",
  },
];

export function getPortalTheme(role: Role): PortalTheme {
  return PORTAL_THEMES.find((t) => t.role === role)!;
}
