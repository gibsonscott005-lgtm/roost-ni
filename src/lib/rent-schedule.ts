/**
 * Shared rent schedule logic used by both the landlord and tenant tenancy
 * workspaces so the two sides can never disagree about what is owed.
 */

export interface ScheduleReceipt {
  id: string;
  kind: string;
  amount: number;
  method: string;
  statutory_cash: boolean;
  issued_at: string;
  due_date?: string | null;
  period_label?: string | null;
}

export type RentMonthState = "paid" | "due" | "overdue" | "upcoming";

export interface RentMonth {
  /** e.g. "Sep 2026" — stored on the receipt as period_label */
  periodLabel: string;
  /** ISO date (yyyy-mm-dd) the rent falls due */
  dueDate: string;
  amount: number;
  receipt: ScheduleReceipt | null;
  state: RentMonthState;
  index: number;
}

export function formatPeriodLabel(d: Date) {
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function toIsoDate(d: Date) {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function addMonths(base: Date, n: number) {
  const d = new Date(base.getFullYear(), base.getMonth() + n, 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(base.getDate(), lastDay));
  return d;
}

/**
 * Builds a rolling monthly rent schedule anchored on the tenancy start date.
 * Month 0 is the first month's rent, which may already have been recorded as a
 * plain "rent" receipt during move-in (before periods existed).
 */
export function buildRentSchedule(opts: {
  startDate: string | null | undefined;
  monthlyRent: number;
  receipts: ScheduleReceipt[];
  months?: number;
}): RentMonth[] {
  const { startDate, monthlyRent, receipts, months = 12 } = opts;
  if (!startDate) return [];

  const start = new Date(`${startDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(start.getTime())) return [];

  const rentReceipts = receipts.filter((r) => r.kind === "rent");
  const byLabel = new Map<string, ScheduleReceipt>();
  for (const r of rentReceipts) {
    if (r.period_label) byLabel.set(r.period_label, r);
  }
  // A legacy move-in rent receipt carries no period label; it settles month 0.
  const legacyFirst = rentReceipts.find((r) => !r.period_label) ?? null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const out: RentMonth[] = [];
  for (let i = 0; i < months; i++) {
    const due = addMonths(start, i);
    const periodLabel = formatPeriodLabel(due);
    const receipt = byLabel.get(periodLabel) ?? (i === 0 ? legacyFirst : null);

    let state: RentMonthState;
    if (receipt) state = "paid";
    else if (due.getTime() < today.getTime()) state = "overdue";
    else if (due.getFullYear() === today.getFullYear() && due.getMonth() === today.getMonth())
      state = "due";
    else state = "upcoming";

    out.push({
      periodLabel,
      dueDate: toIsoDate(due),
      amount: monthlyRent,
      receipt,
      state,
      index: i,
    });
  }
  return out;
}

export function arrearsSummary(schedule: RentMonth[]) {
  const overdue = schedule.filter((m) => m.state === "overdue");
  return {
    monthsBehind: overdue.length,
    total: overdue.reduce((sum, m) => sum + Number(m.amount || 0), 0),
    oldest: overdue[0] ?? null,
  };
}

export const RENT_STATE_LABEL: Record<RentMonthState, string> = {
  paid: "Paid",
  due: "Due now",
  overdue: "Overdue",
  upcoming: "Upcoming",
};

export function rentStateClasses(state: RentMonthState) {
  switch (state) {
    case "paid":
      return "bg-verified-soft text-verified";
    case "overdue":
      return "bg-red-100 text-red-700";
    case "due":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-surface-muted text-muted-foreground";
  }
}