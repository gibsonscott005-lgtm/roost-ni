import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const NOTIFICATION_TYPES = [
  "application_received",
  "application_accepted",
  "application_declined",
  "application_withdrawn",
  "application_reapplied",
  "lease_issued",
  "lease_signed_by_tenant",
  "lease_counter_signed",
  "property_let_agreed",
  "receipt_logged",
  "receipt_confirmed",
  "rent_due_reminder",
  "rent_overdue",
  "deposit_protected",
  "deposit_deadline_approaching",
  "inventory_submitted",
  "inventory_approved",
  "maintenance_reported",
  "maintenance_updated",
  "maintenance_resolved",
  "notice_served",
  "notice_acknowledged",
  "certificate_expiring",
  "certificate_expired",
  "final_inspection_submitted",
  "final_inspection_agreed",
  "final_inspection_disputed",
  "deposit_settlement_proposed",
  "deposit_returned",
  "tenancy_completed",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const emitNotificationSchema = z.object({
  recipient_id: z.string().uuid(),
  type: z.enum(NOTIFICATION_TYPES),
  entity_type: z.enum([
    "passport_share",
    "property_listing",
    "tenancy_receipt",
    "inventory_item",
    "maintenance_ticket",
  ]),
  entity_id: z.string().uuid(),
  title: z.string().min(1).max(140),
  body: z.string().max(500).nullable().optional(),
  // Only same-origin relative paths — never an absolute/external URL.
  link_path: z
    .string()
    .min(1)
    .max(500)
    .regex(/^\/(?!\/)[A-Za-z0-9\-._~!$&'()*+,;=:@/?%#[\]]*$/, "link_path must be a relative app path"),
});

export type EmitNotificationInput = z.infer<typeof emitNotificationSchema>;

export const emitNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => emitNotificationSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Never send a notification to yourself.
    if (data.recipient_id === context.userId) return { id: null };

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { resolveParties } = await import("@/lib/notifications.server");

    // Verify the caller and the recipient are the two counterparties of the
    // entity referenced. Without this, any signed-in user could push
    // official-looking notifications to any other user.
    const parties = await resolveParties(supabaseAdmin, data.entity_type, data.entity_id);
    if (
      !parties ||
      !parties.includes(context.userId) ||
      !parties.includes(data.recipient_id)
    ) {
      throw new Error("Forbidden: no relationship with the recipient for this record");
    }

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

    // High-priority types also go out by email, best-effort: a failure here
    // must never undo the in-app notification that already landed.
    if (rpcData) {
      // Email wording is fixed server-side per type — the caller chooses the
      // event, never the words that leave the platform.
      const { sendNotificationEmail } = await import("@/lib/notification-email.server");
      await sendNotificationEmail(supabaseAdmin, {
        recipientId: data.recipient_id,
        type: data.type,
        linkPath: data.link_path,
        eventId: String(rpcData),
      });
    }

    return { id: rpcData };
  });