import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, jsonResult, errorResult } from "../supabase";

export default defineTool({
  name: "my_listings",
  title: "My properties",
  description:
    "List the properties owned by the signed-in landlord, including publication status and rent.",
  inputSchema: {
    includeUnpublished: z.boolean().default(true).describe("Include drafts and unpublished listings."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ includeUnpublished }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("property_listings")
      .select("id, title, address, location, monthly_rent, deposit, status, is_published, created_at")
      .eq("landlord_id", ctx.getUserId()!)
      .order("created_at", { ascending: false });
    if (includeUnpublished === false) q = q.eq("is_published", true);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return jsonResult({ count: data?.length ?? 0, listings: data ?? [] });
  },
});
