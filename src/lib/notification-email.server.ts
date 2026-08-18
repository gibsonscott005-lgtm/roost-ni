/**
 * Email delivery for a short list of high-priority notifications.
 *
 * Everything else stays in the bell. This only fires for the things a tenant or
 * landlord cannot afford to miss while they are not signed in.
 *
 * Sending is off until an email domain is connected for the workspace — the
 * helper then simply does nothing, so no notification path ever fails because
 * email is unavailable.
 */
import type { supabaseAdmin } from "@/integrations/supabase/client.server";

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
    "https://roost-ni.lovable.app"
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderEmail(title: string, body: string, url: string) {
  const t = escapeHtml(title);
  const b = escapeHtml(body);
  return `<!doctype html>
<html lang="en-GB"><body style="margin:0;padding:24px;background:#f6f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:28px">
    <p style="margin:0 0 20px;font-size:18px;font-weight:700;letter-spacing:-0.01em">Roost<span style="color:#059669">.</span>ni</p>
    <h1 style="margin:0 0 12px;font-size:18px;line-height:1.35">${t}</h1>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#475569">${b}</p>
    <a href="${url}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 18px;border-radius:9px">Open in Roost</a>
    <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#94a3b8">You are receiving this because it affects your tenancy or your property. You can turn these emails off in Roost under Settings, Notifications.</p>
  </div>
</body></html>`;
}

interface SendArgs {
  recipientId: string;
  type: string;
  title: string;
  body: string;
  linkPath: string;
}

/**
 * Best-effort email for one notification. Never throws — an email failure must
 * not roll back or block the in-app notification that already landed.
 */
export async function sendNotificationEmail(admin: Admin, args: SendArgs): Promise<boolean> {
  try {
    if (!isEmailNotificationType(args.type)) return false;

    const apiKey = process.env["RESEND_API_KEY"];
    const from = process.env["EMAIL_FROM"];
    if (!apiKey || !from) return false; // email not connected yet

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

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: `Roost — ${args.title}`,
        html: renderEmail(args.title, args.body, url),
        text: `${args.title}\n\n${args.body}\n\n${url}`,
      }),
    });

    if (!res.ok) {
      console.error("[notification-email] send failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[notification-email] unexpected failure", err);
    return false;
  }
}
