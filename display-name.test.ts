import { describe, expect, it } from "vitest";
import { cleanName, greeting } from "./src/lib/display-name";
describe("names never show blank or undefined", () => {
  it("falls back to Hi there for blank, spaces, undefined and null", () => {
    for (const v of [null, undefined, "", "   ", "undefined", "null"]) expect(greeting(v)).toBe("Hi there");
  });
  it("uses the first name when present", () => expect(greeting("  Jane Smith ")).toBe("Hi Jane"));
  it("cleanName returns null for the text undefined", () => expect(cleanName("undefined")).toBeNull());
});
