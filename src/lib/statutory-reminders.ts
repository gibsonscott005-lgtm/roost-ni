/**
 * Schedules for the tenancy information notice and landlord registration reminders.
 * Pure date maths so the days can be tested. Wording comes from approved legal_facts at send time.
 */
const DAY = 86400000;
const TIN_DAYS = 28;
const TIN_COUNTDOWN = [21, 14, 7, 3, 1, 0];

function daysBetween(fromIso: string, today: Date): number {
  const from = new Date(`${fromIso.slice(0, 10)}T00:00:00Z`).getTime();
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.floor((t - from) / DAY);
}

/**
 * New RoostNI tenancies only (never existing agreements). Counts from the date the agreement was signed
 * (the closest recorded grant date), falling back to the tenancy start date.
 * Sends with 21, 14, 7, 3, 1 and 0 days left, then weekly once the 28 days have passed, until marked given.
 */
export function tinReminderKind(args: { signedAt?: string | null; startDate: string | null; tinGivenAt: string | null; leaseKind: string | null; today: Date }): string | null {
  const from = args.signedAt || args.startDate;
  if (args.leaseKind === "existing_agreement" || args.tinGivenAt || !from) return null;
  const since = daysBetween(from, args.today);
  if (since < 0) return null;
  const left = TIN_DAYS - since;
  if (TIN_COUNTDOWN.includes(left)) return `tin_due:${left}`;
  if (left < 0 && -left % 7 === 0) return `tin_passed:${-left}`;
  return null;
}

/** Day 1 after the home is added, then every 30 days, until a registration number is saved. */
export function registrationReminderKind(args: { addedAt: string; regNumber: string | null; today: Date }): string | null {
  if ((args.regNumber ?? "").trim()) return null;
  const day = daysBetween(args.addedAt, args.today);
  if (day === 1 || (day > 1 && (day - 1) % 30 === 0)) return `landlord_reg:${day}`;
  return null;
}
