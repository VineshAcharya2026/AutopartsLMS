import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Same-origin proxy via Next.js rewrites — avoids CORS and "Failed to fetch" from cross-origin calls. */
export const API_URL =
  typeof window !== "undefined"
    ? "/backend/api/v1"
    : process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000/ws/notifications";

export const LEAD_STATUSES = [
  "NEW",
  "UNATTEMPTED",
  "ATTEMPTED",
  "FOLLOW_UP",
  "INTERESTED",
  "NOT_INTERESTED",
  "CALLBACK",
  "CONVERTED",
  "LOST",
  "SPAM",
] as const;

export const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  UNATTEMPTED: "bg-slate-100 text-slate-800",
  ATTEMPTED: "bg-yellow-100 text-yellow-800",
  FOLLOW_UP: "bg-purple-100 text-purple-800",
  INTERESTED: "bg-green-100 text-green-800",
  NOT_INTERESTED: "bg-orange-100 text-orange-800",
  CALLBACK: "bg-cyan-100 text-cyan-800",
  CONVERTED: "bg-emerald-100 text-emerald-800",
  LOST: "bg-red-100 text-red-800",
  SPAM: "bg-gray-100 text-gray-800",
};
