import posthog from "posthog-js";
import { analyticsAllowed } from "@/lib/analytics-consent";

const POSTHOG_API_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY;
const POSTHOG_REGION = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION ?? "eu";
/** Admin "exclude this device" flag, kept outside PostHog so it survives consent changes. */
const DEVICE_EXCLUDED_KEY = "roost_analytics_device_excluded";

let started = false;

function getApiHost() {
  return POSTHOG_REGION === "us" ? "https://us.i.posthog.com" : "https://eu.i.posthog.com";
}

function deviceExcluded() {
  try {
    return localStorage.getItem(DEVICE_EXCLUDED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Starts PostHog only after the visitor has accepted analytics. */
export function initPostHog() {
  if (typeof window === "undefined") return;
  if (!POSTHOG_API_KEY) return;
  if (!analyticsAllowed()) return;
  if (started) {
    // Re-accepted in the same tab after a withdrawal.
    posthog.set_config({
      persistence: "localStorage+cookie",
      autocapture: true,
      capture_pageleave: true,
      disable_session_recording: false,
    });
    if (!deviceExcluded()) posthog.opt_in_capturing();
    posthog.capture("$pageview");
    return;
  }
  started = true;

  posthog.init(POSTHOG_API_KEY, {
    api_host: getApiHost(),
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    // React recovers from hydration mismatches (#418/#423/#425) by re-rendering
    // on the client; visitors see a normal page, so don't count them as crashes.
    before_send: (event) => {
      // Belt and braces: nothing leaves the browser once consent is withdrawn.
      if (!analyticsAllowed()) return null;
      if (event?.event === "$exception") {
        const text = JSON.stringify(event.properties?.$exception_list ?? event.properties ?? "");
        if (/Minified React error #(418|423|425)|Hydration failed/i.test(text)) return null;
      }
      return event;
    },
    loaded: (posthogInstance) => {
      // Carry over an exclusion made before this flag existed.
      if (posthogInstance.has_opted_out_capturing() && !deviceExcluded()) {
        try { localStorage.setItem(DEVICE_EXCLUDED_KEY, "1"); } catch { /* ignore */ }
      }
      if (deviceExcluded()) {
        posthogInstance.opt_out_capturing();
        return;
      }
      posthogInstance.capture("$pageview");
    },
  });
}

/** Withdrawal: stop recording and capture now, and remove PostHog's cookie and storage. */
export function stopPostHog() {
  if (typeof window === "undefined") return;
  if (started) {
    try {
      posthog.stopSessionRecording();
      posthog.set_config({
        persistence: "memory",
        autocapture: false,
        capture_pageleave: false,
        disable_session_recording: true,
      });
    } catch {
      /* ignore */
    }
  }
  clearPostHogStorage();
}

export function clearPostHogStorage() {
  try {
    for (const c of document.cookie.split(";")) {
      const name = c.split("=")[0]?.trim();
      if (name && /^ph_/.test(name)) {
        const host = location.hostname;
        const parts = host.split(".");
        const domains = ["", host, ...parts.map((_, i) => "." + parts.slice(i).join("."))];
        for (const d of domains) {
          document.cookie = `${name}=; path=/; max-age=0${d ? `; domain=${d}` : ""}`;
        }
      }
    }
    for (const store of [localStorage, sessionStorage]) {
      for (const key of Object.keys(store)) {
        if (/^ph_/.test(key)) store.removeItem(key);
      }
    }
  } catch {
    /* ignore */
  }
}

export { posthog };

/**
 * Mark the current visitor as an internal/test user so the PostHog
 * "Internal / Test users" cohort filters them out of every insight.
 * Used automatically for admin accounts on sign-in.
 */
export function tagAsInternalUser() {
  if (typeof window === "undefined" || !POSTHOG_API_KEY || !started) return;
  posthog.register({ $internal_or_test_user: true });
}

/** Link this visitor to their account using the account ID only (no email or name). */
export function identifyUser(userId: string) {
  if (typeof window === "undefined" || !POSTHOG_API_KEY || !started || !analyticsAllowed()) return;
  if (posthog.get_distinct_id?.() === userId) return;
  posthog.identify(userId);
}

/** Unlink the visitor on sign-out so the next person on this device starts fresh. */
export function resetIdentity() {
  if (typeof window === "undefined" || !POSTHOG_API_KEY || !started) return;
  posthog.reset();
}

/** True when this device has been excluded from analytics by an admin. */
export function isAnalyticsOptedOut() {
  if (typeof window === "undefined") return false;
  return deviceExcluded();
}

export function optOutOfAnalytics() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEVICE_EXCLUDED_KEY, "1");
  } catch {
    /* ignore */
  }
  if (started) posthog.opt_out_capturing();
}

export function optInToAnalytics() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DEVICE_EXCLUDED_KEY);
  } catch {
    /* ignore */
  }
  if (started && analyticsAllowed()) posthog.opt_in_capturing();
}
