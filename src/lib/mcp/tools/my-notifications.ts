import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, jsonResult, errorResult } from "../supabase";

export default defineTool({
  name: "my_notifications",
  title: "My notifications",
  description: "List recent RoostNI notifications for the signed-in user, newest first.",
  inputSchema: {
    unreadOnly: z.boolean().default(false).describe("Only return notifications that are still unread."),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ unreadOnly, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (unreadOnly) q = q.is("read_at", null);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return jsonResult({ count: data?.length ?? 0, notifications: data ?? [] });
  },
});
