import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, jsonResult, errorResult } from "../supabase";

export default defineTool({
  name: "get_listing",
  title: "Get listing details",
  description:
    "Fetch the full detail of one RoostNI rental listing, including NI-specific fields such as heating type and Fair Fuel policy.",
  inputSchema: { listingId: z.string().uuid().describe("The listing id.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ listingId }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("property_listings")
      .select(
        "id, title, address, location, monthly_rent, deposit, bedrooms, bathrooms, property_type, furnished, heating_type, enforce_empty_in_full_out, available_from, min_tenancy_months, description, bills_included, parking, garden, features, tenant_preferences, status, is_published, created_at",
      )
      .eq("id", listingId)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("Listing not found or not visible to you.");
    return jsonResult(data);
  },
});
