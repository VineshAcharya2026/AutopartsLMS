import type { Lead } from "@centercrm/shared-types";
import type { ApiLead } from "@/lib/api";

export type AnyLead = Lead | ApiLead;

export type AutoPartsMeta = {
  year?: string;
  make?: string;
  brand?: string;
  model?: string;
  part_name?: string;
  vin?: string;
  zip_code?: string;
  purchase_timeline?: string;
  purchase?: string;
  comment?: string;
};

export function leadField<T>(lead: AnyLead, snake: string, camel: string): T | undefined {
  const record = lead as Record<string, unknown>;
  return (record[snake] ?? record[camel]) as T | undefined;
}

export function getAutoPartsMeta(lead: AnyLead): AutoPartsMeta {
  const raw = leadField<Record<string, unknown>>(lead, "metadata", "metadata") ?? {};
  return raw as AutoPartsMeta;
}

export function isAutoPartsLead(lead: AnyLead): boolean {
  const meta = getAutoPartsMeta(lead);
  const interest = leadField<string>(lead, "course_interest", "courseInterest");
  return Boolean(
    meta.part_name ||
      meta.year ||
      meta.make ||
      meta.brand ||
      meta.model ||
      meta.vin ||
      interest
  );
}

export function vehicleTitle(meta: AutoPartsMeta): string {
  const parts = [meta.year, meta.make || meta.brand, meta.model].filter(Boolean);
  return parts.length ? parts.join(" ") : "Vehicle not specified";
}

export function partNameForLead(lead: AnyLead, meta?: AutoPartsMeta): string {
  const m = meta ?? getAutoPartsMeta(lead);
  return (
    m.part_name ||
    leadField<string>(lead, "course_interest", "courseInterest") ||
    "Part not specified"
  );
}

export function purchaseTimeline(meta: AutoPartsMeta): string | undefined {
  return meta.purchase_timeline || meta.purchase;
}

export function zipCodeForLead(lead: AnyLead, meta?: AutoPartsMeta): string | undefined {
  const m = meta ?? getAutoPartsMeta(lead);
  return m.zip_code || leadField<string>(lead, "city", "city") || undefined;
}
