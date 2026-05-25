"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortalTheme } from "./rolePortalTheme";

export function RolePortalCard({ theme, index }: { theme: PortalTheme; index: number }) {
  const Icon = theme.icon;

  return (
    <Link
      href={theme.href}
      className={cn(
        "portal-card-enter group relative flex flex-col overflow-hidden rounded-2xl border border-[rgb(var(--border))]",
        "bg-[rgb(var(--card))] shadow-lg ring-2 transition-all duration-300 ease-out",
        "hover:-translate-y-2 hover:shadow-2xl",
        theme.ring,
        theme.glow
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div
        className={cn(
          "relative h-44 overflow-hidden bg-gradient-to-br",
          theme.gradient,
          theme.gradientDark
        )}
      >
        <Image
          src={theme.heroImage}
          alt=""
          width={400}
          height={280}
          className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
          priority={index === 0}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <div className="absolute bottom-4 left-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md ring-1 ring-white/30 transition-transform duration-300 group-hover:scale-110">
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted))]">
          {theme.subtitle}
        </p>
        <h2 className="mt-1 text-xl font-bold">{theme.title}</h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-[rgb(var(--muted))]">
          {theme.description}
        </p>
        <span
          className={cn(
            "mt-4 inline-flex items-center gap-1 text-sm font-semibold transition-all duration-300",
            theme.accent,
            theme.accentHover,
            "group-hover:gap-2"
          )}
        >
          Continue to portal
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
