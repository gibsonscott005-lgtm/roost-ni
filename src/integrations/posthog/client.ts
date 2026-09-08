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
    debug: import.meta.env.DEV,
    loaded: (posthogInstance) => {
      posthogInstance.capture("$pageview");
      posthogInstance.capture("roost_test_loaded_event");
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log("PostHog loaded", posthogInstance.get_distinct_id());
      }
    },
  });
}

export { posthog };
