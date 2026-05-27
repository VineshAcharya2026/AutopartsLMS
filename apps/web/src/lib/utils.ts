import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PRODUCTION_API_BASE = "https://centercrm-api.onrender.com/api/v1";
const PRODUCTION_API_ORIGIN = "https://centercrm-api.onrender.com";
const PRODUCTION_WS_URL = "wss://centercrm-api.onrender.com/ws/notifications";

function isHostedFrontend(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.endsWith(".web.app") || host.endsWith(".firebaseapp.com");
}

/** API base URL. Production hosting always uses Render; local dev uses /backend proxy. */
export const API_URL = (() => {
  const env = process.env.NEXT_PUBLIC_API_URL;
  if (env?.startsWith("http")) return env;
  if (isHostedFrontend()) return PRODUCTION_API_BASE;
  if (typeof window !== "undefined") return env || "/backend/api/v1";
  return env || "http://127.0.0.1:8000/api/v1";
})();

/** Origin for health checks (no /api/v1 suffix). */
export function getApiOrigin(): string {
  if (API_URL.startsWith("http")) return API_URL.replace(/\/api\/v1\/?$/, "");
  if (isHostedFrontend()) return PRODUCTION_API_ORIGIN;
  if (typeof window !== "undefined") return "/backend";
  return "http://127.0.0.1:8000";
}

export const WS_URL = (() => {
  const env = process.env.NEXT_PUBLIC_WS_URL;
  if (env?.startsWith("ws")) return env;
  if (isHostedFrontend()) return PRODUCTION_WS_URL;
  if (typeof window !== "undefined") {
    return (
      env ||
      `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/backend/ws/notifications`
    );
  }
  return env || "ws://127.0.0.1:8000/ws/notifications";
})();

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
