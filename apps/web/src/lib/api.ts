import { API_URL } from "./utils";
import { useAuthStore } from "./store";

type RequestOptions = RequestInit & { auth?: boolean };

function formatApiError(status: number, payload: unknown): string {
  if (typeof payload === "object" && payload !== null) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) => (typeof item === "object" && item && "msg" in item ? String(item.msg) : String(item)))
        .join(", ");
    }
  }
  if (status === 503) {
    return "Database unavailable. Start PostgreSQL and run migrations (see login page banner).";
  }
  if (status === 500) {
    return "Server error. Check backend logs or try again.";
  }
  return `Request failed (${status})`;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const token = useAuthStore.getState().accessToken;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch (error) {
    const hint =
      typeof window !== "undefined"
        ? "Ensure the backend is running on port 8000 (cd apps/api && uvicorn app.main:app --reload --port 8000)."
        : "";
    throw new Error(
      error instanceof Error && error.message === "Failed to fetch"
        ? `Cannot reach the API. ${hint}`.trim()
        : `Cannot reach the API. ${hint}`.trim()
    );
  }

  if (res.status === 401 && auth) {
    useAuthStore.getState().clearAuth();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Session expired. Please sign in again.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiError(res.status, err));
  }

  return res.json();
}

export async function login(email: string, password: string) {
  const data = await apiFetch<{
    access_token: string;
    user: Record<string, unknown>;
  }>("/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, password }),
  });

  return {
    access_token: data.access_token,
    user: {
      id: String(data.user.id),
      email: String(data.user.email),
      firstName: String(data.user.first_name ?? data.user.firstName ?? ""),
      lastName: String(data.user.last_name ?? data.user.lastName ?? ""),
      role: data.user.role as import("@centercrm/shared-types").Role,
      centerId: (data.user.center_id ?? data.user.centerId ?? null) as string | null,
      isActive: Boolean(data.user.is_active ?? data.user.isActive ?? true),
      permissions: (data.user.permissions ?? {}) as Record<string, boolean>,
    },
  };
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const url = typeof window !== "undefined" ? "/backend/health" : "http://127.0.0.1:8000/health";
    const res = await fetch(url, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export type ApiUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  center_id?: string | null;
  is_active: boolean;
};

export type ApiCenter = {
  id: string;
  name: string;
  code: string;
  settings?: Record<string, unknown>;
};

export type ApiLead = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  source?: string;
  status: string;
  priority?: number;
  attempt_count?: number;
  inquiry_count?: number;
  center_id?: string | null;
  assigned_admin_id?: string | null;
  assigned_agent_id?: string | null;
  follow_up_at?: string | null;
  course_interest?: string | null;
  city?: string | null;
  message?: string | null;
  source_website?: string | null;
  campaign?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export async function fetchCenters() {
  return apiFetch<ApiCenter[]>("/centers");
}

export async function fetchAdmins() {
  return apiFetch<ApiUser[]>("/users/admins");
}

export async function fetchAgents() {
  return apiFetch<ApiUser[]>("/users/agents");
}

export async function createAdmin(data: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  center_id?: string;
}) {
  return apiFetch<ApiUser>("/users/admins", { method: "POST", body: JSON.stringify(data) });
}

export async function createAgent(data: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}) {
  return apiFetch<ApiUser>("/users/agents", { method: "POST", body: JSON.stringify(data) });
}

export async function assignLead(
  leadId: string,
  data: { center_id?: string; assigned_admin_id?: string; assigned_agent_id?: string }
) {
  return apiFetch<ApiLead>(`/leads/${leadId}/assign`, { method: "POST", body: JSON.stringify(data) });
}

export async function createRoutingRule(data: {
  name: string;
  center_id: string;
  priority?: number;
  conditions?: Record<string, string>;
  assign_admin_id?: string;
  assign_agent_id?: string;
  is_active?: boolean;
}) {
  return apiFetch("/routing-rules", { method: "POST", body: JSON.stringify(data) });
}

export function userDisplayName(user: Pick<ApiUser, "first_name" | "last_name" | "email">) {
  const name = `${user.first_name} ${user.last_name}`.trim();
  return name || user.email;
}

export type TrashRecord = {
  id: string;
  entity_type: string;
  entity_id: string;
  snapshot: Record<string, unknown>;
  deleted_by_id: string;
  created_at: string;
};

export async function updateUser(
  userId: string,
  data: Partial<{
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    center_id: string | null;
    is_active: boolean;
  }>
) {
  return apiFetch<ApiUser>(`/users/${userId}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteUser(userId: string) {
  return apiFetch<{ message: string }>(`/users/${userId}`, { method: "DELETE" });
}

export async function createCenter(data: { name: string; code: string; settings?: Record<string, unknown> }) {
  return apiFetch<ApiCenter>("/centers", { method: "POST", body: JSON.stringify(data) });
}

export async function updateCenter(
  centerId: string,
  data: Partial<{ name: string; code: string; settings: Record<string, unknown> }>
) {
  return apiFetch<ApiCenter>(`/centers/${centerId}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteCenter(centerId: string) {
  return apiFetch<{ message: string }>(`/centers/${centerId}`, { method: "DELETE" });
}

export async function deleteLead(leadId: string) {
  return apiFetch<{ message: string }>(`/leads/${leadId}`, { method: "DELETE" });
}

export async function fetchTrash() {
  return apiFetch<TrashRecord[]>("/trash");
}

export async function restoreTrash(recordId: string) {
  return apiFetch<{ message: string }>(`/trash/${recordId}/restore`, { method: "POST" });
}

export async function purgeTrash(recordId: string) {
  return apiFetch<{ message: string }>(`/trash/${recordId}/purge`, { method: "DELETE" });
}
