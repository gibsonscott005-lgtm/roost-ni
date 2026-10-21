/** Only these public settings may be copied into browser code. */
export function resolvePublicCloudDefines(env: Record<string, string | undefined>) {
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;
  // Managed preview configuration can add defines after this config returns.
  // Omit absent values rather than throwing or overriding that later injection.
  const defines: Record<string, string> = {};
  if (url) defines["import.meta.env.VITE_SUPABASE_URL"] = JSON.stringify(url);
  if (key) defines["import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY"] = JSON.stringify(key);
  return defines;
}