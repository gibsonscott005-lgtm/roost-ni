import { describe, expect, test } from "bun:test";
import { stepCounts, summariseLandlord } from "./src/lib/landlord-funnel";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-10-24T12:00:00Z");
const at = (daysAgo: number) => new Date(now - daysAgo * DAY).toISOString();
const row = (event: string, daysAgo: number) => ({ user_id: "u", event, created_at: at(daysAgo), last_at: at(daysAgo) });

describe("landlord funnel", () => {
  test("stuck after 3 days without publishing", () => {
    expect(summariseLandlord("u", [row("signed_up", 3)], now).stuck).toBe(true);
    expect(summariseLandlord("u", [row("signed_up", 2)], now).stuck).toBe(false);
  });

  test("unconfirmed for 3+ days is stuck; sign-up steps come before the dashboard", () => {
    expect(summariseLandlord("u", [row("signed_up", 4), row("confirmation_email_sent", 4)], now).stuck).toBe(true);
    const e = summariseLandlord("u", [row("signed_up", 1), row("email_confirmed", 1), row("first_sign_in", 1)], now);
    expect(e.furthestStep).toBe("first_sign_in");
  });

  test("a published landlord is never stuck", () => {
    expect(summariseLandlord("u", [row("listing_published", 10)], now).stuck).toBe(false);
  });

  test("furthest step and help flag", () => {
    const e = summariseLandlord("u", [row("signed_up", 5), row("add_property_clicked", 4), row("help_requested", 1)], now);
    expect(e.furthestStep).toBe("add_property_clicked");
    expect(e.helpRequested).toBe(true);
    expect(e.stuck).toBe(false);
  });

  test("counts and drop-off between steps", () => {
    const a = summariseLandlord("a", [row("signed_up", 1)], now);
    const b = summariseLandlord("b", [row("listing_published", 1)], now);
    const steps = stepCounts([a, b]);
    expect(steps[0]!.count).toBe(2);
    expect(steps[1]!.count).toBe(1);
    expect(steps[1]!.dropOffPct).toBe(50);
  });
});
