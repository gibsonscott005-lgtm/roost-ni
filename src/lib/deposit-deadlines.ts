// Deposit duties count from the day the deposit was RECEIVED (never the
// tenancy start): protect within 28 days, prescribed information within 35.
// No received date, or a deposit received before 1 April 2023, means no clock.
export const DEPOSIT_PROTECT_DAYS = 28;
export const PRESCRIBED_INFO_DAYS = 35;
const RULES_FROM = Date.UTC(2023, 3, 1);
const DAY = 864e5;

function parse(d: string | null | undefined): number | null {
  if (!d) return null;
  const t = Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  return Number.isNaN(t) ? null : t;
}

export function depositDeadlines(receivedAt: string | null | undefined) {
  const r = parse(receivedAt);
  if (r === null || r < RULES_FROM) return null;
  return {
    received: new Date(r),
    protectBy: new Date(r + DEPOSIT_PROTECT_DAYS * DAY),
    prescribedInfoBy: new Date(r + PRESCRIBED_INFO_DAYS * DAY),
  };
}
