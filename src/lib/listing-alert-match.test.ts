import { describe, expect, it } from "vitest";
import { isTestListing, matchesArea, sentToday } from "./listing-alert-match";

const listing = { title: "2-bed flat", location: "Bangor, Co Down", address: "1 Main St, Bangor BT20" };

describe("listing alert rules", () => {
  it("skips listings whose title starts with [TEST LISTING", () => {
    expect(isTestListing({ ...listing, title: "[TEST LISTING] 36 Main Road" })).toBe(true);
  });
  it("skips listings flagged is_test", () => {
    expect(isTestListing({ ...listing, is_test: true })).toBe(true);
  });
  it("matches a subscriber whose area is in the listing location", () => {
    expect(matchesArea(listing, { utm: { alert_area: "Bangor" }, last_alert_sent_at: null })).toBe(true);
  });
  it("does not match a different area", () => {
    expect(matchesArea(listing, { utm: { alert_area: "Lisburn" }, last_alert_sent_at: null })).toBe(false);
  });
  it("limits to one email per London day", () => {
    const now = new Date("2026-11-02T15:00:00Z");
    expect(sentToday("2026-11-02T08:00:00Z", now)).toBe(true);
    expect(sentToday("2026-11-01T22:00:00Z", now)).toBe(false);
  });
});
