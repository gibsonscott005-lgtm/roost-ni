import { test, expect } from "bun:test";
import { WEEKLY_PLAN, foundingPlacesLeft, foundingOfferLine, tenantTipBlocked, compareWeek, withinCooldown } from "./src/lib/robin-plan";
import { validateMarketingCopy } from "./src/lib/marketing-knowledge";
import { DEFAULT_GROUPS, firstCommentText } from "./src/lib/robin-groups";

test("weekly plan is 5 posts: 3 landlord problems, 1 founding, 1 how to list", () => {
  expect(WEEKLY_PLAN.length).toBe(5);
  expect(WEEKLY_PLAN.filter(t => t === "landlord_problem").length).toBe(3);
  expect(WEEKLY_PLAN.filter(t => t === "founding_places").length).toBe(1);
  expect(WEEKLY_PLAN.filter(t => t === "how_to_list").length).toBe(1);
});
test("founding places count down from 20 and never go negative", () => {
  expect(foundingPlacesLeft(0)).toBe(20);
  expect(foundingPlacesLeft(7)).toBe(13);
  expect(foundingPlacesLeft(25)).toBe(0);
});
test("founding offer wording carries the decided prices", () => {
  const line = foundingOfferLine(13);
  for (const bit of ["13 of 20", "first month free", "£5", "£3", "£49", "24 months", "£7", "£4", "£59"]) expect(line).toContain(bit);
});
test("first month free is allowed; free forever and free during beta are not", () => {
  expect(() => validateMarketingCopy("First month free for founding landlords.", false)).not.toThrow();
  expect(() => validateMarketingCopy("It's free during beta.", false)).toThrow();
  expect(() => validateMarketingCopy("Free forever.", false)).toThrow();
  expect(() => validateMarketingCopy("Know the deposit cap.", false)).toThrow();
});
test("tenant tips are at most 1 in 5", () => {
  expect(tenantTipBlocked(["landlord", "tenant", "landlord", "landlord"])).toBe(true);
  expect(tenantTipBlocked(["landlord", "landlord", "landlord", "landlord", "tenant"])).toBe(false);
});
test("topics are blocked for 14 days", () => {
  const now = new Date("2026-10-27T12:00:00Z");
  expect(withinCooldown("2026-10-14T12:00:01Z", now)).toBe(true);
  expect(withinCooldown("2026-10-13T11:59:00Z", now)).toBe(false);
});
test("both groups allow promotion and every post gets a first comment with its campaign", () => {
  expect(DEFAULT_GROUPS.every(g => g.promotionAllowed)).toBe(true);
  const text = firstCommentText({ link_url: null, utm_campaign: "fb_x", notes: JSON.stringify({ group: DEFAULT_GROUPS[0], first_comment_cta: "Check yours here:" }) });
  expect(text.startsWith("Check yours here:\nhttps://roostni.co.uk/")).toBe(true);
  expect(text).toContain("utm_campaign=fb_x");
});
test("one post per value is too little data; clear gaps are win and loss", () => {
  const posts = ["a", "b", "c", "d"].map((id, i) => ({ id, angle: i < 2 ? "deadline" : "tip", persona: "landlord", group: "g", hasLink: true, mode: "direct" }));
  const res = (id: string, reactions: number) => ({ post_id: id, reach: 100, reactions, comments: 0, shares: 0, link_clicks: 0 });
  const out = compareWeek(posts, [res("a", 30), res("b", 30), res("c", 2), res("d", 2)]);
  expect(out.find(c => c.value === "deadline")?.verdict).toBe("win");
  expect(out.find(c => c.value === "tip")?.verdict).toBe("loss");
  expect(out.find(c => c.value === "deadline")?.postIds).toEqual(["a", "b"]);
  expect(compareWeek(posts.slice(0, 1), [res("a", 30)])[0]?.verdict).toBe("too_little_data");
});

import { lastCompletedSunday as lcs } from "./src/lib/robin-plan";
test("weekly review never covers the week still running", () => {
  expect(lcs(new Date("2026-11-01T12:00:00Z"))).toBe("2026-10-25"); // Sunday → previous Sunday
  expect(lcs(new Date("2026-11-02T12:00:00Z"))).toBe("2026-11-01"); // Monday → yesterday
});
