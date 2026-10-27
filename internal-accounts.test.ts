import { describe, it, expect } from "bun:test";
import { isInternalEmail } from "./src/lib/internal-accounts";

describe("internal test accounts", () => {
  it("excludes both owner test accounts", () => {
    expect(isInternalEmail("gibsonscott005@gmail.com")).toBe(true);
    expect(isInternalEmail(" UsGibsons2004@gmail.com ")).toBe(true);
  });
  it("keeps real visitors", () => {
    expect(isInternalEmail("someone@gmail.com")).toBe(false);
  });
});
