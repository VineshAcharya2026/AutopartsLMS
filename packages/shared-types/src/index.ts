export type Role = "MASTER_ADMIN" | "ADMIN" | "AGENT";

export type LeadStatus =
  | "NEW"
  | "UNATTEMPTED"
  | "ATTEMPTED"
  | "FOLLOW_UP"
  | "INTERESTED"
  | "NOT_INTERESTED"
  | "CALLBACK"
  | "CONVERTED"
  | "LOST"
  | "SPAM";

export type LeadSource =
  | "WEBSITE_FORM"
  | "LANDING_PAGE"
  | "EMAIL"
  | "WEBHOOK"
  | "MANUAL"
  | "CSV"
  | "WHATSAPP";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  centerId?: string | null;
  isActive: boolean;
  permissions: Record<string, boolean>;
}

export interface Center {
  id: string;
  name: string;
  code: string;
  settings: Record<string, unknown>;
}

export interface Lead {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  source: LeadSource;
  status: LeadStatus;
  priority: number;
  attemptCount: number;
  inquiryCount: number;
  centerId?: string | null;
  assignedAdminId?: string | null;
  assignedAgentId?: string | null;
  followUpAt?: string | null;
  courseInterest?: string | null;
  city?: string | null;
  message?: string | null;
  sourceWebsite?: string | null;
  campaign?: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  payload: Record<string, unknown>;
  readAt?: string | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuthTokens {
  accessToken: string;
  tokenType: string;
  user: User;
}

export interface DashboardStats {
  total_leads: number;
  new_leads: number;
  follow_ups_today: number;
  overdue_tasks: number;
  converted_leads: number;
  leads_by_status: Record<string, number>;
  leads_by_source: Record<string, number>;
  agent_productivity?: Array<Record<string, unknown>>;
}
