import { test, expect } from "bun:test";
import { LEAD_FEATURES, POST_FEATURES, assertFeatureSpread, featuresIn, repeatedLineProblems, runItYourselfSlots, bodyWordCount, completeSignupPost, FOUNDING_SHORT_LINE, PAUSED_POST_TYPES, signupPostProblems, callToAction, TENANTED_ENTRY_URL, WEEKLY_PLAN, foundingPlacesLeft, foundingOfferLine, tenantTipBlocked, compareWeek, withinCooldown } from "./src/lib/robin-plan";
import { validateMarketingCopy } from "./src/lib/marketing-knowledge";
import { DEFAULT_GROUPS, firstCommentText } from "./src/lib/robin-groups";

test("weekly plan is 14 posts: 5 pain, 3 founding, 3 tenanted, 3 what RoostNI does, no tips", () => {
  expect(WEEKLY_PLAN.length).toBe(14);
  expect(WEEKLY_PLAN.filter(t => t === "pain_solution").length).toBe(5);
  expect(WEEKLY_PLAN.filter(t => t === "founding_offer").length).toBe(3);
  expect(WEEKLY_PLAN.filter(t => t === "move_tenanted").length).toBe(3);
  expect(WEEKLY_PLAN.filter(t => t === "what_roostni_does").length).toBe(3);
  expect(WEEKLY_PLAN.some(t => PAUSED_POST_TYPES.includes(t))).toBe(false);
  expect(PAUSED_POST_TYPES).toContain("useful_tip");
  WEEKLY_PLAN.slice(1).forEach((t, i) => expect(t).not.toBe(WEEKLY_PLAN[i]));
});
test("founding places count down from 20 and never go negative", () => {
  expect(foundingPlacesLeft(0)).toBe(20);
  expect(foundingPlacesLeft(7)).toBe(13);
  expect(foundingPlacesLeft(25)).toBe(0);
});
test("founding offer wording carries the decided prices", () => {
  const line = foundingOfferLine(13);
  expect(foundingOfferLine(null)).not.toMatch(/of 20 founding places left/);
  expect(foundingOfferLine(null)).toContain("First 20 landlords who add a home");
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

import { dailyPairSlots } from "./src/lib/robin-groups";
test("two posts a day for 7 days, UK time, slot A before slot B", () => {
  const slots = dailyPairSlots(new Date("2026-11-08T22:00:00Z"));
  expect(slots.length).toBe(7);
  expect(slots[0]!.a.toISOString()).toBe("2026-11-09T12:30:00.000Z");
  expect(slots[0]!.b.toISOString()).toBe("2026-11-09T19:00:00.000Z");
});
test("follows count towards engagement and are averaged by post type", () => {
  const posts = ["a", "b", "c"].map((id, i) => ({ id, angle: "x", persona: "landlord", group: "g", hasLink: true, mode: "direct", postType: i < 2 ? "pain_urgency" : "useful_tip" }));
  const r = (id: string, f: number) => ({ post_id: id, reach: 10, reactions: 0, comments: 0, shares: 0, link_clicks: 0, follows_gained: f });
  const out = compareWeek(posts, [r("a", 4), r("b", 2), r("c", 0)]);
  expect(out.find(c => c.dimension === "post type" && c.value === "pain_urgency")?.avgFollows).toBe(3);
});

const LINE = "RoostNI: Tenant Passport, rent records, deposit reminders.";
const good = (extra: string, cta = "Add your first home: link in the first comment.") => `Paperwork everywhere.\n${LINE}\n${extra}\n${cta}`;
test("a sign-up post needs RoostNI, the one-liner and the call to action last", () => {
  expect(signupPostProblems(good("Every date in one place."), "pain_solution", false)).toEqual([]);
  expect(signupPostProblems("Paperwork everywhere.\nAdd your first home: link in the first comment.", "pain_solution", false).length).toBeGreaterThan(0);
  expect(signupPostProblems(`${good("x")}\nWhat do you find hardest?`, "pain_solution", false).length).toBeGreaterThan(0);
});
test("banned voice, savings, agents and missing features are rejected", () => {
  for (const bad of ["I'd sort it.", "Good practice: keep receipts.", "No creative-writing competition.", "Save £300 a year.", "Cheaper than an agent.", "Book viewing slots online.", "We collect the rent."])
    expect(signupPostProblems(good(bad), "pain_solution", false).length).toBeGreaterThan(0);
});
test("legal fact posts carry the disclaimer; tips are paused", () => {
  expect(signupPostProblems(good("A fact."), "what_roostni_does", true)).toContain('Add "General information, not legal advice."');
  expect(signupPostProblems(good("A fact. General information, not legal advice."), "what_roostni_does", true)).toEqual([]);
  expect(signupPostProblems(good("x"), "useful_tip", false)).toContain("Tip posts are paused.");
});
test("founding and tenanted posts carry their required details and calls to action", () => {
  const founding = good("First 20 landlords who add a home: first month free, then £5 first home, £3 each extra, locked for 24 months.", "Claim a founding place: link in the first comment.");
  expect(signupPostProblems(founding, "founding_offer", false)).toEqual([]);
  expect(signupPostProblems(good("First 20 landlords."), "founding_offer", false).length).toBeGreaterThan(0);
  expect(signupPostProblems(good("Records done in about 10 days, with reminders."), "move_tenanted", false)).toEqual([]);
  expect(signupPostProblems(good("Records done fast."), "move_tenanted", false).length).toBeGreaterThan(0);
  expect(callToAction("move_tenanted").link).toBe(TENANTED_ENTRY_URL);
  expect(decodeURIComponent(new URL(TENANTED_ENTRY_URL).searchParams.get("next")!)).toBe("/dashboard?add=tenanted");
  expect(callToAction("founding_offer").cta).toBe("Claim a founding place:");
});
test("missing founding, tenanted and what-it-does lines are added above the call to action", () => {
  const f = completeSignupPost(`Start with one home.\n${LINE}\nClaim a founding place: link in the first comment.`, "founding_offer");
  expect(f).toContain("Billing is not switched on yet.");
  expect(f).toContain(FOUNDING_SHORT_LINE);
  expect(signupPostProblems(f, "founding_offer", false)).toEqual([]);
  const t = completeSignupPost(`Got a tenant already?\n${LINE}\nAdd your first home: link in the first comment.`, "move_tenanted");
  expect(signupPostProblems(t, "move_tenanted", false)).toEqual([]);
});

test("weak openers are blocked; hooks are fine", () => {
  for (const bad of ["I'm building this.", "We are here.", "Inviting you to try it.", "Putting RoostNI in front of you.", "Introducing RoostNI today."])
    expect(signupPostProblems(`${bad}\n${LINE}\nAdd your first home: link in the first comment.`, "pain_solution", false)).toContain("Open with the hook, not an introduction.");
  expect(signupPostProblems(good("Run it."), "pain_solution", false)).toEqual([]);
});
test("no what-it-does line repeats in the week or from earlier posts; at most 3 real features", () => {
  const a = good("x"), b = `Hook.\nRoostNI: rent records and the applicant inbox.\nAdd your first home: link in the first comment.`;
  expect(repeatedLineProblems([a, b], [])).toEqual([]);
  expect(repeatedLineProblems([a, a], [])).toEqual([1]);
  expect(repeatedLineProblems([b], [a, b])).toEqual([0]);
  expect(signupPostProblems(good("x").replace(LINE, "RoostNI: Tenant Passport, rent records, deposit reminders, applicant inbox."), "pain_solution", false)).toContain("Name at most 3 features in the what-it-does line.");
});
test("no places-left count and a 60-word body limit", () => {
  expect(signupPostProblems(good("20 of 20 founding places remain."), "pain_solution", false)).toContain("No places-left count.");
  expect(signupPostProblems(good("Only 3 places left."), "pain_solution", false)).toContain("No places-left count.");
  const long = good(Array(55).fill("word").join(" "));
  expect(bodyWordCount(long)).toBeGreaterThan(60);
  expect(signupPostProblems(long, "pain_solution", false)).toContain("Keep the body to 60 words.");
  expect(bodyWordCount(`Hook.\n${FOUNDING_SHORT_LINE}\nBilling is not switched on yet.\nClaim a founding place: x`)).toBe(1);
});
test("run it yourself is allowed; agent and fee claims stay blocked; 2 pain + 1 tenanted slots", () => {
  expect(signupPostProblems(good("Run the tenancy yourself. No agent needed to run it."), "pain_solution", false)).toEqual([]);
  for (const bad of ["Agents are expensive.", "Fees of £500 gone.", "Save 10% on fees."]) expect(signupPostProblems(good(bad), "pain_solution", false).length).toBeGreaterThan(0);
  const slots = runItYourselfSlots();
  expect(WEEKLY_PLAN.filter((t, i) => slots[i] && t === "pain_solution").length).toBe(2);
  expect(WEEKLY_PLAN.filter((t, i) => slots[i] && t === "move_tenanted").length).toBe(1);
  expect(slots.filter(Boolean).length).toBe(3);
});
test("inventories exist but are not an allowed post feature", () => {
  expect(featuresIn("RoostNI: inventories for every tenancy.")).toEqual([]);
});

test("the what-it-does line must name the slot's lead feature; 14 valid lead features", () => {
  expect(LEAD_FEATURES.length).toBe(14);
  expect(LEAD_FEATURES.every(f => POST_FEATURES.some(([n]) => n === f))).toBe(true);
  expect(signupPostProblems(good("x"), "pain_solution", false, "rent records")).toEqual([]);
  expect(signupPostProblems(good("x"), "pain_solution", false, "applicant inbox")).toContain("The what-it-does line must name the lead feature: applicant inbox.");
});
test("author-introduction openers are blocked", () => {
  for (const bad of ["My focus is records.", "My aim is simple.", "My goal: less mess.", "My plan works.", "My idea was this.", "I built RoostNI.", "I made this.", "I created it.", "I started RoostNI.", "I set up RoostNI.", "I wrote this."])
    expect(signupPostProblems(`Hook.\n${LINE}\n${bad}\nAdd your first home: link in the first comment.`, "pain_solution", false)).toContain("Open with the hook, not an introduction.");
});
test("no feature in more than 5 posts' what-it-does line in a week", () => {
  const post = (line: string) => `Hook.\n${line}\nAdd your first home: link in the first comment.`;
  expect(() => assertFeatureSpread(Array(5).fill(post("RoostNI: rent records.")))).not.toThrow();
  expect(() => assertFeatureSpread(Array(6).fill(post("RoostNI: rent records.")))).toThrow(/rent records.*No drafts saved/);
});
