import posthog from "posthog-js";

const POSTHOG_API_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY;
const POSTHOG_REGION = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION ?? "eu";

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (!POSTHOG_API_KEY) return;
  if (posthog.__loaded) return;

  const apiHost =
    POSTHOG_REGION === "us" ? "https://us.i.posthog.com" : "https://eu.i.posthog.com";

  posthog.init(POSTHOG_API_KEY, {
    api_host: apiHost,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    loaded: (posthogInstance) => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log("PostHog loaded", posthogInstance.get_distinct_id());
      }
    },
  });
}

export { posthog };
