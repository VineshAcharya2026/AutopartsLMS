import { cn } from "@/lib/utils";

export type StatVariant = "blue" | "emerald" | "orange" | "violet" | "rose";

const variantClass: Record<StatVariant, string> = {
  blue: "stat-blue",
  emerald: "stat-emerald",
  orange: "stat-orange",
  violet: "stat-violet",
  rose: "stat-rose",
};

export function DashboardStatsCard({
  title,
  value,
  subtitle,
  variant = "blue",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: StatVariant;
}) {
  return (
    <div
      className={cn(
        "card p-5 dashboard-card-interactive",
        variantClass[variant]
      )}
    >
      <p className="text-sm text-[rgb(var(--muted))]">{title}</p>
      <p className="mt-2 text-3xl font-bold transition-transform duration-300 group-hover:scale-[1.02]">
        {value}
      </p>
      {subtitle && <p className="mt-1 text-xs text-[rgb(var(--muted))]">{subtitle}</p>}
    </div>
  );
}
