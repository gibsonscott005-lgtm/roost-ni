// Landlord funnel: step order and summary maths. Pure and browser-safe so the
// admin page and tests share one definition.

export const FUNNEL_STEPS = [
  "signed_up",
  "landlord_dashboard_viewed",
  "add_property_clicked",
  "listing_started",
  "listing_saved_draft",
  "listing_published",
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];
export type FunnelEvent = FunnelStep | "help_requested";

export const STEP_LABELS: Record<FunnelStep, string> = {
  signed_up: "Signed up",
  landlord_dashboard_viewed: "Viewed dashboard",
  add_property_clicked: "Clicked add property",
  listing_started: "Started a listing",
  listing_saved_draft: "Saved a property",
  listing_published: "Published a listing",
};

export const STUCK_AFTER_DAYS = 3;

export interface FunnelRow {
  user_id: string;
  event: string;
  created_at: string;
  last_at: string;
}

export interface LandlordFunnelEntry {
  userId: string;
  furthestStep: FunnelStep | null;
  furthestIndex: number;
  lastActivity: string | null;
  helpRequested: boolean;
  helpRequestedAt: string | null;
  stuck: boolean;
}

/** Furthest step reached, last activity and flags for one landlord. */
export function summariseLandlord(
  userId: string,
  rows: FunnelRow[],
  now: number = Date.now(),
): LandlordFunnelEntry {
  let furthestIndex = -1;
  let last = 0;
  let help: FunnelRow | undefined;
  for (const r of rows) {
    const i = FUNNEL_STEPS.indexOf(r.event as FunnelStep);
    if (i > furthestIndex) furthestIndex = i;
    if (r.event === "help_requested") help = r;
    const t = new Date(r.last_at).getTime();
    if (t > last) last = t;
  }
  const published = furthestIndex === FUNNEL_STEPS.length - 1;
  const stuck =
    !published && last > 0 && now - last >= STUCK_AFTER_DAYS * 24 * 60 * 60 * 1000;
  return {
    userId,
    furthestStep: furthestIndex >= 0 ? FUNNEL_STEPS[furthestIndex]! : null,
    furthestIndex,
    lastActivity: last ? new Date(last).toISOString() : null,
    helpRequested: !!help,
    helpRequestedAt: help ? help.last_at : null,
    stuck,
  };
}

export interface StepCount {
  step: FunnelStep;
  label: string;
  count: number;
  /** Percentage lost since the previous step (null for the first step). */
  dropOffPct: number | null;
}

/** Landlords who reached each step (or any later step), plus drop-off. */
export function stepCounts(entries: LandlordFunnelEntry[]): StepCount[] {
  return FUNNEL_STEPS.map((step, i) => {
    const count = entries.filter((e) => e.furthestIndex >= i).length;
    const prev = i === 0 ? null : entries.filter((e) => e.furthestIndex >= i - 1).length;
    return {
      step,
      label: STEP_LABELS[step],
      count,
      dropOffPct: prev === null ? null : prev === 0 ? 0 : Math.round(((prev - count) / prev) * 100),
    };
  });
}
