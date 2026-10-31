import { test, expect } from "bun:test";
import { countHomesByAddress, landlordsWithAHome } from "./src/lib/home-count";
import { foundingOfferLine } from "./src/lib/robin-plan";

test("same address added twice counts as one home", () => {
  expect(countHomesByAddress([{ address: "12 Main Street, Newtownards" }, { address: "12 main street  newtownards" }])).toBe(1);
});

test("different addresses count separately", () => {
  expect(countHomesByAddress([{ address: "12 Main Street" }, { address: "14 Main Street" }])).toBe(2);
});

test("a tenanted, unadvertised home still takes a founding place", () => {
  expect(landlordsWithAHome([{ landlord_id: "a", address: "1 High St" }, { landlord_id: "a", address: "1 High St" }, { landlord_id: "b", address: "2 Low Rd" }])).toEqual(["a", "b"]);
});

test("founding offer says 'add a home', not 'list'", () => {
  const line = foundingOfferLine(20);
  expect(line).toContain("add a home");
  expect(line).not.toContain("who list");
});
