import posthog from "posthog-js";

const POSTHOG_API_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY;
const POSTHOG_REGION = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION ?? "eu";

function getApiHost() {
  return POSTHOG_REGION === "us" ? "https://us.i.posthog.com" : "https://eu.i.posthog.com";
}

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (!POSTHOG_API_KEY) return;
  if ((window as unknown as Record<string, unknown>).__roostPostHogInit) return;
  (window as unknown as Record<string, unknown>).__roostPostHogInit = true;

  posthog.init(POSTHOG_API_KEY, {
    api_host: getApiHost(),
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    // React recovers from hydration mismatches (#418/#423/#425) by re-rendering
    // on the client; visitors see a normal page, so don't count them as crashes.
    before_send: (event) => {
      if (event?.event === "$exception") {
        const text = JSON.stringify(event.properties?.$exception_list ?? event.properties ?? "");
        if (/Minified React error #(418|423|425)|Hydration failed/i.test(text)) return null;
      }
      return event;
    },
    loaded: (posthogInstance) => {
      posthogInstance.capture("$pageview");
    },
  });
}

export { posthog };

/**
 * Mark the current visitor as an internal/test user so the PostHog
 * "Internal / Test users" cohort filters them out of every insight.
 * Used automatically for admin accounts on sign-in.
 */
export function tagAsInternalUser() {
  if (typeof window === "undefined" || !POSTHOG_API_KEY) return;
  posthog.register({ $internal_or_test_user: true });
}

/** True when this device has been opted out of analytics capture. */
export function isAnalyticsOptedOut() {
  if (typeof window === "undefined" || !POSTHOG_API_KEY) return false;
  return posthog.has_opted_out_capturing();
}

export function optOutOfAnalytics() {
  if (typeof window === "undefined" || !POSTHOG_API_KEY) return;
  posthog.opt_out_capturing();
}

export function optInToAnalytics() {
  if (typeof window === "undefined" || !POSTHOG_API_KEY) return;
  posthog.opt_in_capturing();
}
