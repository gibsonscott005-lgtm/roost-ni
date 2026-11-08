/**
 * Records checklist for a tenancy that began before RoostNI.
 * The 10-day target is RoostNI's own target, never a legal deadline.
 */
export const COMPLETION_TARGET_DAYS = 10;
export const REMINDER_DAYS = [3, 7, 10] as const;
const DAY_MS = 86_400_000;

export interface CompletenessInput {
  tenancy_start_date: string | null;
  monthly_rent: number | null;
  rent_frequency: string | null;
  deposit: number | null;
  deposit_received_at: string | null;
  deposit_scheme: string | null;
  deposit_protected_at: string | null;
  tenant_name: string | null;
  tenant_email: string | null;
  tenant_phone: string | null;
  tin_given_at: string | null;
  ni_landlord_reg_number: string | null;
}

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
}

const has = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== "";

export function tenancyChecklist(r: CompletenessInput): ChecklistItem[] {
  const reg = (r.ni_landlord_reg_number ?? "").trim();
  return [
    { key: "start", label: "Tenancy start date", done: has(r.tenancy_start_date) },
    { key: "rent", label: "Rent amount", done: Number(r.monthly_rent ?? 0) > 0 },
    { key: "frequency", label: "Rent frequency", done: has(r.rent_frequency) },
    { key: "deposit", label: "Deposit amount", done: r.deposit !== null && r.deposit !== undefined },
    { key: "received", label: "Date deposit received", done: has(r.deposit_received_at) },
    { key: "scheme", label: "Deposit scheme", done: has(r.deposit_scheme) },
    { key: "protected", label: "Date deposit protected", done: has(r.deposit_protected_at) },
    { key: "tenant", label: "Tenant names", done: has(r.tenant_name) },
    { key: "contact", label: "Tenant contact details", done: has(r.tenant_email) || has(r.tenant_phone) },
    { key: "tin", label: "Date tenancy information notice given", done: has(r.tin_given_at) },
    { key: "reg", label: "Landlord registration number", done: reg !== "" && reg.toLowerCase() !== "pending" },
  ];
}

/** Day number since the home was added (day 0 = the day it was added). */
export function daysSinceAdded(addedAt: string | Date, now: Date = new Date()): number {
  const start = new Date(addedAt);
  const a = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const b = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((b - a) / DAY_MS);
}

/** Reminder on days 3, 7 and 10, then every 7 days after day 10, until complete. */
export function isReminderDay(day: number): boolean {
  if ((REMINDER_DAYS as readonly number[]).includes(day)) return true;
  return day > COMPLETION_TARGET_DAYS && (day - COMPLETION_TARGET_DAYS) % 7 === 0;
}

/** Card progress: returns null when the checklist is complete (card shows nothing). */
export function checklistProgress(r: CompletenessInput): { done: number; total: number } | null {
  const list = tenancyChecklist(r);
  const done = list.filter((i) => i.done).length;
  return done === list.length ? null : { done, total: list.length };
}
