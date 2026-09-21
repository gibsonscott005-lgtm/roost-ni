/**
 * Email delivery for a short list of high-priority notifications.
 *
 * Everything else stays in the bell. This only fires for the things a tenant or
 * landlord cannot afford to miss while they are not signed in.
 *
 * Sending runs through Lovable's managed email service on the verified sender
 * domain. The helper never throws — an email failure must not roll back or
 * block the in-app notification that already landed.
 */
import type { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

type Admin = typeof supabaseAdmin;

/** The only notification types that leave the app as email. */
export const EMAIL_NOTIFICATION_TYPES = [
  "lease_issued",
  "lease_signed_by_tenant",
  "lease_counter_signed",
  "application_accepted",
  "notice_served",
  "maintenance_reported",
  "rent_overdue",
  "deposit_deadline_approaching",
  "certificate_expired",
] as const;

export type EmailNotificationType = (typeof EMAIL_NOTIFICATION_TYPES)[number];

export function isEmailNotificationType(type: string): type is EmailNotificationType {
  return (EMAIL_NOTIFICATION_TYPES as readonly string[]).includes(type);
}

export const EMAIL_TYPE_LABELS: Record<EmailNotificationType, string> = {
  lease_issued: "A lease is issued to you",
  lease_signed_by_tenant: "Your tenant signs the lease",
  lease_counter_signed: "A lease is counter-signed",
  application_accepted: "Your application is accepted",
  notice_served: "A notice to quit is served",
  maintenance_reported: "A repair is reported",
  rent_overdue: "Rent is overdue",
  deposit_deadline_approaching: "A deposit deadline is approaching",
  certificate_expired: "A safety certificate expires",
};

function appOrigin() {
  return (
    process.env["PUBLIC_APP_URL"] ??
    process.env["VITE_PUBLIC_APP_URL"] ??
    "https://roostni.co.uk"
  );
}

interface SendArgs {
  recipientId: string;
  type: string;
  title: string;
  body: string;
  linkPath: string;
  /** Stable id of the triggering event, used to dedupe retries. */
  eventId?: string;
}

/**
 * Best-effort email for one notification. Never throws.
 */
export async function sendNotificationEmail(admin: Admin, args: SendArgs): Promise<boolean> {
  try {
    if (!isEmailNotificationType(args.type)) return false;
    if (!process.env["LOVABLE_API_KEY"]) return false; // sending not available yet

    // Respect the recipient's email preferences.
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("email_enabled, email_muted_types")
      .eq("user_id", args.recipientId)
      .maybeSingle();

    if (prefs) {
      if (prefs.email_enabled === false) return false;
      const muted = (prefs.email_muted_types ?? []) as string[];
      if (muted.includes(args.type)) return false;
    }

    const { data: userRes } = await admin.auth.admin.getUserById(args.recipientId);
    const to = userRes?.user?.email;
    if (!to) return false;

    const url = `${appOrigin().replace(/\/$/, "")}${args.linkPath}`;

    const result = await sendTemplateEmail("notification-alert", to, {
      templateData: {
        title: args.title,
        message: args.body,
        url,
        actionLabel: "Open in RoostNI",
      },
      idempotencyKey: args.eventId
        ? `notification-alert-${args.type}-${args.eventId}`
        : `notification-alert-${args.type}-${args.recipientId}-${Date.now()}`,
    });

    return result.sent;
  } catch (err) {
    console.error("[notification-email] send failed", err);
    return false;
  }
}
