import { cn } from "@/lib/utils";

export type PanelAccent = "default" | "blue" | "rose";

const accentBorder: Record<PanelAccent, string> = {
  default: "",
  blue: "hover:border-blue-200 dark:hover:border-blue-800",
  rose: "hover:border-rose-200 dark:hover:border-rose-800",
};

const accentTitle: Record<PanelAccent, string> = {
  default: "",
  blue: "text-blue-700 dark:text-blue-300",
  rose: "text-rose-600 dark:text-rose-400",
};

export function DashboardPanel({
  title,
  children,
  accent = "default",
  className,
}: {
  title: string;
  children: React.ReactNode;
  accent?: PanelAccent;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "card p-5 dashboard-card-interactive transition-colors duration-300",
        accentBorder[accent],
        className
      )}
    >
      <h2 className={cn("font-semibold mb-4", accentTitle[accent])}>{title}</h2>
      {children}
    </div>
  );
}

export function DashboardRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("dashboard-row-interactive flex justify-between text-sm", className)}>
      {children}
    </div>
  );
}
