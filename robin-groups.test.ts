import { test, expect } from "bun:test";
import { DEFAULT_GROUPS, groupSchema, parseRobinGroups, weekSlots, londonSlot, combinationTag, groupBody, trackedGroupLink, assertUniqueDrafts, combinationResults } from "./src/lib/robin-groups";
test("legacy RoostNI Page settings load and save as Page without changing other details", () => {
  const legacy = DEFAULT_GROUPS.map(group => ({ ...group, postAs: "RoostNI Page" }));
  const parsed = parseRobinGroups(legacy);
  expect(parsed).toEqual(DEFAULT_GROUPS.map(group => ({ ...group, postAs: "Page" })));
  expect(parseRobinGroups(parsed)).toEqual(parsed);
  expect(parseRobinGroups(DEFAULT_GROUPS)).toEqual(DEFAULT_GROUPS);
});
test("unknown posting identities remain invalid", () => {
  expect(() => parseRobinGroups([{ ...DEFAULT_GROUPS[0], postAs: "unknown" }])).toThrow("Group 1: choose Page or personal profile");
});
test("invalid weekly counts give readable errors", () => {
  expect(() => parseRobinGroups([{ ...DEFAULT_GROUPS[0], weeklyCount: 8 }])).toThrow("Group 1: choose a whole number from 1 to 7");
});
test("starts with only the requested two groups and three weekly drafts each",()=>{
  expect(DEFAULT_GROUPS.map(g=>g.name)).toEqual(["Newtownards & Ards Peninsula","Belfast community"]);
  expect(DEFAULT_GROUPS.map(g=>g.weeklyCount)).toEqual([3,3]);
});
test("permits at most seven drafts per group",()=>{
  expect(()=>groupSchema.parse({...DEFAULT_GROUPS[0],weeklyCount:7})).not.toThrow();
  expect(()=>groupSchema.parse({...DEFAULT_GROUPS[0],weeklyCount:8})).toThrow();
});
test("19:00 UK follows summer and winter time",()=>{
  expect(londonSlot("2026-10-23").toISOString()).toBe("2026-10-23T18:00:00.000Z");
  expect(londonSlot("2026-10-26").toISOString()).toBe("2026-10-26T19:00:00.000Z");
  expect(weekSlots(3,new Date("2026-10-22T22:58:00Z")).map(d=>d.toISOString())).toEqual(["2026-10-23T18:00:00.000Z","2026-10-25T19:00:00.000Z","2026-10-27T19:00:00.000Z"]);
});
test("tracked content identifies group, placement and identity",()=>{
  const group=DEFAULT_GROUPS[0]; if(!group) throw new Error("missing group");
  const post={body:"Paperwork again.\nWhat works for you?",link_url:"https://roostni.co.uk/audit",utm_campaign:"campaign",notes:JSON.stringify({group})};
  expect(new URL(trackedGroupLink(post)).searchParams.get("utm_content")).toBe("newtownards-ards-peninsula__first-comment__personal-profile");
  expect(groupBody(post)).not.toContain("https:");
  const inBody={...post,notes:JSON.stringify({group:{...group,linkPlacement:"in body",postAs:"Page"}})};
  expect(groupBody(inBody)).toContain("utm_content=newtownards-ards-peninsula__in-body__page");
  expect(groupBody(inBody).endsWith("What works for you?")).toBe(true);
});
test("identical text or repeated topics cannot be saved",()=>{
  expect(()=>assertUniqueDrafts([{body:"Same text",topic:"A"},{body:"Same text",topic:"B"}])).toThrow();
  expect(()=>assertUniqueDrafts([{body:"New text",topic:"A"}],[{body:"Old text",topic:"A"}])).toThrow();
});
test("results exclude drafts and split combination settings",()=>{
  const group=DEFAULT_GROUPS[0]; if(!group) throw new Error("missing group");
  const rows=combinationResults([{notes:JSON.stringify({group}),status:"posted",results:{audits:2,alerts:3,signups:1}},{notes:JSON.stringify({group}),status:"draft",results:{audits:99}},{notes:JSON.stringify({group:{...group,postAs:"Page"}}),status:"posted",results:{audits:4}}]);
  expect(rows).toHaveLength(2);expect(rows.reduce((n,r)=>n+r.audits,0)).toBe(6);
});