import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuickVariant = "blue" | "emerald" | "rose";

const variantClass: Record<QuickVariant, string> = {
  blue: "quick-blue",
  emerald: "quick-emerald",
  rose: "quick-rose",
};

export function QuickActionCard({
  href,
  title,
  description,
  icon: Icon,
  variant = "blue",
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  variant?: QuickVariant;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "card p-4 dashboard-card-interactive block group",
        variantClass[variant]
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800",
            "transition-transform duration-300 ease-out group-hover:scale-110"
          )}
        >
          <Icon className="h-5 w-5 text-[rgb(var(--foreground))] transition-colors duration-300" />
        </span>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-[rgb(var(--muted))] mt-1">{description}</p>
        </div>
      </div>
    </Link>
  );
}
