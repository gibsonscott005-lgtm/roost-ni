import { expect, test } from "bun:test";
import { shouldPublishWeeklyInsights, uniqueWeeklyInsights, weeklyInsightActive } from "./src/lib/robin-weekly-insights";

test("refreshing with missing results never publishes lessons", () => {
  for (let refresh = 0; refresh < 10; refresh++) {
    expect(shouldPublishWeeklyInsights(["sunday-post"], { missing_results: ["sunday-post"] })).toBe(false);
  }
  expect(shouldPublishWeeklyInsights(["sunday-post"], null)).toBe(false);
});
test("late results publish once, only when all results are entered", () => {
  expect(shouldPublishWeeklyInsights([], { missing_results: ["sunday-post"] })).toBe(true);
  expect(shouldPublishWeeklyInsights([], { missing_results: [] })).toBe(false);
  expect(shouldPublishWeeklyInsights([], null)).toBe(true);
});
test("retire and reinstate choices survive finalising a week", () => {
  expect(weeklyInsightActive({ active: false }, "win")).toBe(false);
  expect(weeklyInsightActive({ active: true }, "too_little_data")).toBe(true);
  expect(weeklyInsightActive(undefined, "win")).toBe(true);
  expect(weeklyInsightActive(undefined, "too_little_data")).toBe(false);
});
test("legacy duplicates do not push older independent lessons out of view", () => {
  const evidence = { week_end: "2026-10-25", dimension: "angle", value: "deadline" };
  const rows = [{ id: "new", evidence }, ...Array.from({ length: 45 }, (_, i) => ({ id: `old-${i}`, evidence })), { id: "independent", evidence: {} }, { id: "previous-week", evidence: { ...evidence, week_end: "2026-10-18" } }];
  expect(uniqueWeeklyInsights(rows).map(i => i.id)).toEqual(["new", "independent", "previous-week"]);
  expect(rows.length).toBe(48);
});