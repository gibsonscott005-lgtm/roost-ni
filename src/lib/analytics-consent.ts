// RoostNI's analytics consent: PostHog (and campaign tags) only run after an
// explicit "Accept". No answer, "Reject" or Global Privacy Control = nothing runs.
// Shown to every visitor (not region-based), so we only trust a stored grant.
import { readChoice, saveChoices, onConsentChange, type Choice } from "@/lib/consent";

/** Bump when the banner or Cookie settings wording changes. */
export const CONSENT_WORDING_VERSION = "2026-11-09-v1";
export const CONSENT_RECORD_KEY = "roost_consent_record";
export const OPEN_SETTINGS_EVENT = "roost:open-cookie-settings";

export const COOKIE_COPY = {
  banner:
    "We use analytics cookies to see how RoostNI is used and to improve it, including recordings of how pages are used. They're off unless you accept.",
  acceptAll: "Accept all",
  rejectAll: "Reject all",
  settings: "Cookie settings",
  necessaryTitle: "Necessary",
  necessaryText: "Always on: keeps you signed in and saves things like drafts.",
  analyticsTitle: "Analytics, provided by PostHog",
  save: "Save",
  gpcNote: "Your browser's privacy signal is on, so analytics stays off.",
} as const;

export type ConsentRecord = { choice: Choice; at: number; version: string };

export function hasGpc(): boolean {
  return (
    typeof navigator !== "undefined" &&
    (navigator as unknown as { globalPrivacyControl?: boolean }).globalPrivacyControl === true
  );
}

/** True only for a stored, current "Accept" with no privacy signal. */
export function analyticsAllowed(): boolean {
  if (typeof window === "undefined") return false;
  return readChoice("analytics") === "granted";
}

/** True when the visitor still needs to be asked. */
export function needsAnalyticsAnswer(): boolean {
  if (typeof window === "undefined" || hasGpc()) return false;
  return readChoice("analytics") === null;
}

export function readConsentRecord(): ConsentRecord | null {
  try {
    return JSON.parse(localStorage.getItem(CONSENT_RECORD_KEY) ?? "null");
  } catch {
    return null;
  }
}

export function saveAnalyticsChoice(choice: Choice) {
  const record: ConsentRecord = { choice, at: Date.now(), version: CONSENT_WORDING_VERSION };
  try {
    localStorage.setItem(CONSENT_RECORD_KEY, JSON.stringify(record));
  } catch {
    /* storage blocked */
  }
  saveChoices({ analytics: choice });
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}

export { onConsentChange };
