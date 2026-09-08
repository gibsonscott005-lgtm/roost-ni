import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, jsonResult, errorResult } from "../supabase";

export default defineTool({
  name: "search_listings",
  title: "Search rental listings",
  description:
    "Search published Northern Ireland rental listings on Roost by text, town, rent range, bedrooms and heating type.",
  inputSchema: {
    query: z.string().trim().optional().describe("Free text matched against title, address and town."),
    maxRent: z.number().positive().optional().describe("Maximum monthly rent in GBP."),
    minBedrooms: z.number().int().min(0).optional().describe("Minimum number of bedrooms."),
    heatingType: z
      .enum(["oil", "gas", "electric", "lpg"])
      .optional()
      .describe("Heating type filter."),
    limit: z.number().int().min(1).max(50).default(20).describe("Maximum results to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, maxRent, minBedrooms, heatingType, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("property_listings")
      .select(
        "id, title, address, location, monthly_rent, deposit, bedrooms, bathrooms, property_type, furnished, heating_type, enforce_empty_in_full_out, available_from, status",
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);

    if (query) {
      // Strip characters PostgREST treats as filter syntax so user text can
      // never alter the structure of the generated query.
      const safe = query.replace(/[,.()%*\\"']/g, " ").trim().slice(0, 100);
      if (safe)
        q = q.or(`title.ilike.%${safe}%,address.ilike.%${safe}%,location.ilike.%${safe}%`);
    }
    if (typeof maxRent === "number") q = q.lte("monthly_rent", maxRent);
    if (typeof minBedrooms === "number") q = q.gte("bedrooms", minBedrooms);
    if (heatingType) q = q.eq("heating_type", heatingType);

    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return jsonResult({ count: data?.length ?? 0, listings: data ?? [] });
  },
});
