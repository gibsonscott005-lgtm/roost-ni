import { describe, expect, it } from "vitest";
import { articleStatus, londonLocalToUtcIso, utcIsoToLondonLocal } from "./src/lib/blog";
import { renderMarkdown } from "./src/lib/markdown";

describe("blog scheduling", () => {
  it("treats winter London time as UTC", () => {
    expect(londonLocalToUtcIso("2026-11-08T09:00")).toBe("2026-11-08T09:00:00.000Z");
  });
  it("converts summer London time (BST) to UTC an hour earlier", () => {
    expect(londonLocalToUtcIso("2027-07-01T09:00")).toBe("2027-07-01T08:00:00.000Z");
    expect(utcIsoToLondonLocal("2027-07-01T08:00:00.000Z")).toBe("2027-07-01T09:00");
  });
  it("keeps future posts scheduled and null posts as drafts", () => {
    const now = new Date("2026-11-01T12:00:00Z");
    expect(articleStatus(null, now)).toBe("draft");
    expect(articleStatus("2026-11-02T00:00:00Z", now)).toBe("scheduled");
    expect(articleStatus("2026-11-01T11:00:00Z", now)).toBe("published");
  });
});

describe("markdown", () => {
  it("wraps tables in a horizontal scroll container", () => {
    expect(renderMarkdown("| a | b |\n| --- | --- |\n| 1 | 2 |")).toContain('<div class="my-6 overflow-x-auto"><table');
  });
  it("escapes raw HTML", () => {
    expect(renderMarkdown("<script>x</script>")).not.toContain("<script>");
  });
});
