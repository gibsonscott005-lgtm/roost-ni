import { beforeEach, describe, expect, it } from "vitest";

const store = new Map<string, string>();
const g = globalThis as Record<string, unknown>;
g.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
};
g.window = Object.assign(globalThis, { dispatchEvent: () => true, addEventListener() {}, removeEventListener() {} });
const nav = { globalPrivacyControl: false };
Object.defineProperty(globalThis, "navigator", { value: nav, configurable: true });

const c = await import("./src/lib/analytics-consent");

describe("analytics consent", () => {
  beforeEach(() => {
    store.clear();
    nav.globalPrivacyControl = false;
  });

  it("nothing starts with no answer, and the banner is needed", () => {
    expect(c.analyticsAllowed()).toBe(false);
    expect(c.needsAnalyticsAnswer()).toBe(true);
  });

  it("Accept allows analytics and stores choice, date and wording version", () => {
    c.saveAnalyticsChoice("granted");
    expect(c.analyticsAllowed()).toBe(true);
    const rec = c.readConsentRecord()!;
    expect(rec.choice).toBe("granted");
    expect(rec.version).toBe(c.CONSENT_WORDING_VERSION);
    expect(typeof rec.at).toBe("number");
  });

  it("Reject keeps analytics off and hides the banner", () => {
    c.saveAnalyticsChoice("denied");
    expect(c.analyticsAllowed()).toBe(false);
    expect(c.needsAnalyticsAnswer()).toBe(false);
  });

  it("withdrawal after Accept turns analytics off", () => {
    c.saveAnalyticsChoice("granted");
    c.saveAnalyticsChoice("denied");
    expect(c.analyticsAllowed()).toBe(false);
  });

  it("Global Privacy Control counts as Reject, even over an Accept", () => {
    c.saveAnalyticsChoice("granted");
    nav.globalPrivacyControl = true;
    expect(c.analyticsAllowed()).toBe(false);
    expect(c.needsAnalyticsAnswer()).toBe(false);
  });

  it("uses the approved banner wording", () => {
    expect(c.COOKIE_COPY.banner).toBe(
      "We use analytics cookies to see how RoostNI is used and to improve it, including recordings of how pages are used. They're off unless you accept.",
    );
  });
});
