import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const NOTIFICATION_TYPES = [
  "application_received",
  "application_accepted",
  "application_declined",
  "lease_issued",
  "lease_signed_by_tenant",
  "lease_counter_signed",
  "property_let_agreed",
  "receipt_logged",
  "receipt_confirmed",
  "deposit_protected",
  "deposit_deadline_approaching",
  "inventory_submitted",
  "inventory_approved",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

const emitSchema = z.object({
  recipient_id: z.string().uuid(),
  type: z.enum(NOTIFICATION_TYPES),
  entity_type: z.enum([
    "passport_share",
    "property_listing",
    "tenancy_receipt",
    "inventory_item",
  ]),
  entity_id: z.string().uuid(),
  title: z.string().min(1).max(140),
  body: z.string().max(500).nullable().optional(),
  link_path: z.string().min(1).max(500),
});

export const emitNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => emitSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Never send a notification to yourself.
    if (data.recipient_id === context.userId) return { id: null };

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: rpcData, error } = await supabaseAdmin.rpc("emit_notification", {
      p_recipient_id: data.recipient_id,
      p_actor_id: context.userId,
      p_type: data.type,
      p_entity_type: data.entity_type,
      p_entity_id: data.entity_id,
      p_title: data.title,
      p_body: data.body ?? "",
      p_link_path: data.link_path,
    });

    if (error) {
      console.error("[emitNotification] rpc failed", error);
      throw new Error(error.message);
    }
    return { id: rpcData };
  });