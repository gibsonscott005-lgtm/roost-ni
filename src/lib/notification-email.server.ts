/**
 * Email delivery for a short list of high-priority notifications.
 *
 * Everything else stays in the bell. This only fires for the things a tenant or
 * landlord cannot afford to miss while they are not signed in.
 *
 * The wording of every email is fixed below, per event type. Callers choose
 * only WHICH event happened — never the words — so a signed-in user cannot
 * put their own text into an official RoostNI email sent to someone else.
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

/**
 * Fixed, app-written wording for each emailable event. This is the only text
 * a notification email can ever carry.
 */
const EMAIL_TYPE_CONTENT: Record<EmailNotificationType, { title: string; message: string }> = {
  lease_issued: {
    title: "A lease is ready to review",
    message:
      "Your landlord has issued a lease for your review. Sign in to RoostNI to read and sign it.",
  },
  lease_signed_by_tenant: {
    title: "Your tenant has signed the lease",
    message:
      "The lease you issued has been signed by your tenant. Sign in to RoostNI to counter-sign and execute it.",
  },
  lease_counter_signed: {
    title: "Your lease is fully signed",
    message:
      "Your landlord has counter-signed the lease. Sign in to RoostNI to view the executed agreement.",
  },
  application_accepted: {
    title: "Your application was accepted",
    message:
      "Good news — a landlord has accepted your application. Sign in to RoostNI for the next steps.",
  },
  notice_served: {
    title: "A notice has been served",
    message:
      "A notice to quit has been served on your tenancy. Sign in to RoostNI to review the details.",
  },
  maintenance_reported: {
    title: "A repair has been reported",
    message: "Your tenant has reported a maintenance issue. Sign in to RoostNI to review it.",
  },
  rent_overdue: {
    title: "A rent payment is overdue",
    message:
      "A rent payment on your tenancy is now overdue. Sign in to RoostNI to review your rent schedule.",
  },
  deposit_deadline_approaching: {
    title: "A deposit deadline is approaching",
    message:
      "The deadline to protect a tenancy deposit is approaching. Sign in to RoostNI to check what is due.",
  },
  certificate_expired: {
    title: "A safety certificate has expired",
    message:
      "A property safety certificate has expired. Sign in to RoostNI to review and renew it.",
  },
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
    const content = EMAIL_TYPE_CONTENT[args.type];

    const result = await sendTemplateEmail("notification-alert", to, {
      templateData: {
        title: content.title,
        message: content.message,
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
