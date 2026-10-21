import { describe, expect, test } from "bun:test";
import { resolvePublicCloudDefines } from "./public-build-env";

describe("public Cloud publishing configuration", () => {
  test("uses browser settings ahead of server fallbacks", () => {
    expect(resolvePublicCloudDefines({
      VITE_SUPABASE_URL: "https://public.example.test",
      VITE_SUPABASE_PUBLISHABLE_KEY: "public-key",
      SUPABASE_URL: "https://server.example.test",
      SUPABASE_PUBLISHABLE_KEY: "server-public-key",
    })).toEqual({
      "import.meta.env.VITE_SUPABASE_URL": '"https://public.example.test"',
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '"public-key"',
    });
  });
  test("includes only public settings when publishing supplies server names", () => {
    expect(resolvePublicCloudDefines({
      SUPABASE_URL: "https://cloud.example.test",
      SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      SUPABASE_SERVICE_ROLE_KEY: "must-not-be-included",
      LOVABLE_API_KEY: "must-not-be-included",
    })).toEqual({
      "import.meta.env.VITE_SUPABASE_URL": '"https://cloud.example.test"',
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '"publishable-key"',
    });
  });
  test("rejects missing settings instead of publishing a broken browser bundle", () => {
    expect(() => resolvePublicCloudDefines({ SUPABASE_URL: "https://cloud.example.test" })).toThrow();
    expect(() => resolvePublicCloudDefines({ SUPABASE_PUBLISHABLE_KEY: "publishable-key" })).toThrow();
  });
});