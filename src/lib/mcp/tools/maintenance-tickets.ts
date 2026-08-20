import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, jsonResult, errorResult } from "../supabase";

export default defineTool({
  name: "maintenance_tickets",
  title: "Maintenance tickets",
  description:
    "List maintenance tickets visible to the signed-in user — reported by them as a tenant, or raised on their properties as a landlord.",
  inputSchema: {
    status: z.enum(["open", "in_progress", "resolved"]).optional().describe("Filter by ticket status."),
    limit: z.number().int().min(1).max(50).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("maintenance_tickets")
      .select("id, property_id, title, description, urgency, status, created_at, resolved_at, landlord_notes")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return jsonResult({ count: data?.length ?? 0, tickets: data ?? [] });
  },
});
