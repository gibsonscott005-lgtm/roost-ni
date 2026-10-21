/** Only these public settings may be copied into browser code. */
export function resolvePublicCloudDefines(env: Record<string, string | undefined>) {
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;
  // Managed preview configuration can add defines after this config returns.
  // Omit absent values rather than throwing or overriding that later injection.
  const defines: Record<string, string> = {};
  if (url) defines["import.meta.env.VITE_SUPABASE_URL"] = JSON.stringify(url);
  if (key) defines["import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY"] = JSON.stringify(key);
  // PostHog project tokens (phc_) are public ingest-only keys; never pass personal (phx_) keys.
  const ph = env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY || env.POSTHOG_API_KEY;
  if (ph && ph.startsWith("phc_")) {
    defines["import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY"] = JSON.stringify(ph);
    const region = env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION || env.POSTHOG_REGION || "eu";
    defines["import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION"] = JSON.stringify(region === "us" ? "us" : "eu");
  }
  return defines;
}