import { cn } from "@/lib/utils";

export type DrawerAccent = "default" | "orange" | "blue" | "violet" | "emerald" | "rose";

const sectionAccent: Record<DrawerAccent, string> = {
  default:
    "border-[rgb(var(--border))] bg-slate-50/60 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-600",
  orange:
    "border-orange-200/80 bg-orange-50/40 dark:border-orange-900/50 dark:bg-orange-950/20 hover:border-orange-300 dark:hover:border-orange-700",
  blue:
    "border-blue-200/80 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-700",
  violet:
    "border-violet-200/80 bg-violet-50/40 dark:border-violet-900/50 dark:bg-violet-950/20 hover:border-violet-300 dark:hover:border-violet-700",
  emerald:
    "border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20 hover:border-emerald-300 dark:hover:border-emerald-700",
  rose:
    "border-rose-200/80 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20 hover:border-rose-300 dark:hover:border-rose-700",
};

const titleAccent: Record<DrawerAccent, string> = {
  default: "text-[rgb(var(--foreground))]",
  orange: "text-orange-700 dark:text-orange-300",
  blue: "text-blue-700 dark:text-blue-300",
  violet: "text-violet-700 dark:text-violet-300",
  emerald: "text-emerald-700 dark:text-emerald-300",
  rose: "text-rose-700 dark:text-rose-300",
};

export function DrawerSection({
  title,
  accent = "default",
  children,
  className,
}: {
  title: string;
  accent?: DrawerAccent;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border p-4 transition-all duration-300 ease-out",
        sectionAccent[accent],
        className
      )}
    >
      <h3
        className={cn(
          "text-xs font-semibold uppercase tracking-wide mb-3",
          titleAccent[accent]
        )}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

export function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[rgb(var(--muted))]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-[rgb(var(--foreground))] break-words">{value}</p>
    </div>
  );
}

export const ACTIVITY_CHANNEL_BORDER: Record<string, string> = {
  SYSTEM: "border-slate-300 dark:border-slate-600",
  SMS: "border-blue-400 dark:border-blue-600",
  EMAIL: "border-violet-400 dark:border-violet-600",
  CALL: "border-emerald-400 dark:border-emerald-600",
  REMARK: "border-orange-400 dark:border-orange-600",
  FOLLOW_UP: "border-violet-400 dark:border-violet-600",
  AUDIT: "border-blue-300 dark:border-blue-700",
};
