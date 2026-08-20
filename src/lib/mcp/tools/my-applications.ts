import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, jsonResult, errorResult } from "../supabase";

export default defineTool({
  name: "my_applications",
  title: "My applications and tenancies",
  description:
    "List passport applications and tenancies visible to the signed-in user — those they sent as a tenant, or received as a landlord.",
  inputSchema: {
    status: z
      .enum(["pending", "reviewed", "accepted", "declined", "withdrawn"])
      .optional()
      .describe("Filter by application status."),
    limit: z.number().int().min(1).max(50).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("passport_shares")
      .select(
        "id, listing_id, tenant_id, status, shared_at, lease_status, tenancy_status, tenancy_start_date, deposit_status, rent_status, property_listings(title, address, monthly_rent)",
      )
      .order("shared_at", { ascending: false })
      .limit(limit ?? 25);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return jsonResult({ count: data?.length ?? 0, applications: data ?? [] });
  },
});
