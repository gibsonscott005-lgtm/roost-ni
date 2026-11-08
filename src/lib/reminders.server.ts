/**
 * Scheduled reminder engine.
 *
 * Runs once a day from `/api/public/daily-reminders`. It scans every live
 * tenancy plus every safety certificate and emits the notifications that would
 * otherwise only ever fire when a landlord happened to open the workspace.
 *
 * Every emission is recorded in `reminder_log` with a unique key of
 * (entity, kind, recipient, date), so re-running the job on the same day is a
 * no-op rather than a burst of duplicates.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildRentSchedule, type ScheduleReceipt } from "@/lib/rent-schedule";
import { depositDeadlines } from "@/lib/deposit-deadlines";

type Admin = typeof supabaseAdmin;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Deposit deadline warnings fire at these day counts, then daily once past. */
const DEPOSIT_WARNING_DAYS = [14, 7, 3, 1];

/** Certificates warn from 30 days out. */
const CERTIFICATE_WARNING_DAYS = 30;

const CERTIFICATE_LABELS: Record<string, string> = {
  epc: "Energy Performance Certificate",
  gas: "Gas Safety Certificate",
  eicr: "Electrical Installation Condition Report",
  alarms: "Smoke, heat and carbon monoxide alarm confirmation",
};

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

function formatGBP(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDay(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export interface ReminderOutcome {
  sent: number;
  skipped: number;
  errors: string[];
}

interface SendArgs {
  recipientId: string;
  type: string;
  entityType: string;
  entityId: string;
  /** Distinguishes reminders about the same entity, e.g. "rent_due:Sep 2026". */
  kind: string;
  title: string;
  body: string;
  linkPath: string;
}

/**
 * Claims the (entity, kind, recipient, day) slot and only then sends. The
 * unique constraint is what makes the job idempotent — a duplicate insert
 * fails and we skip the notification instead of sending it twice.
 */
async function sendOnce(admin: Admin, runDate: string, args: SendArgs, out: ReminderOutcome) {
  const { error: claimError } = await admin.from("reminder_log").insert({
    entity_type: args.entityType,
    entity_id: args.entityId,
    kind: args.kind,
    recipient_id: args.recipientId,
    run_date: runDate,
  });

  if (claimError) {
    // 23505 = already sent today. Anything else is a real problem.
    if (claimError.code === "23505") {
      out.skipped += 1;
      return;
    }
    out.errors.push(`claim ${args.kind}: ${claimError.message}`);
    return;
  }

  const { error } = await admin.rpc("emit_notification", {
    p_recipient_id: args.recipientId,
    p_actor_id: null as unknown as string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p_type: args.type as any,
    p_entity_type: args.entityType,
    p_entity_id: args.entityId,
    p_title: args.title,
    p_body: args.body,
    p_link_path: args.linkPath,
  });

  if (error) {
    out.errors.push(`emit ${args.kind}: ${error.message}`);
    return;
  }

  out.sent += 1;

  const { sendNotificationEmail } = await import("@/lib/notification-email.server");
  await sendNotificationEmail(admin, {
    recipientId: args.recipientId,
    type: args.type,
    linkPath: args.linkPath,
    eventId: `${args.kind}-${args.entityId}-${new Date().toISOString().slice(0, 10)}`,
  });
}

interface TenancyRow {
  id: string;
  tenant_id: string;
  listing_id: string;
  tenancy_start_date: string | null;
  tenancy_status: string | null;
  deposit_status: string | null;
  deposit_protected_at: string | null;
  deposit_received_at: string | null;
  prescribed_info_given_at: string | null;
  lease_kind: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  property_listings: any;
}

async function runRentAndDepositReminders(admin: Admin, runDate: string, out: ReminderOutcome) {
  const { data, error } = await admin
    .from("passport_shares")
    .select(
      "id, tenant_id, listing_id, tenancy_start_date, tenancy_status, deposit_status, deposit_protected_at, deposit_received_at, prescribed_info_given_at, lease_kind, property_listings!inner(landlord_id, title, monthly_rent, deposit)",
    )
    .eq("lease_status", "counter_signed")
    .not("tenancy_status", "in", "(completed)");

  if (error) {
    out.errors.push(`tenancies: ${error.message}`);
    return;
  }

  const rows = (data ?? []) as unknown as TenancyRow[];
  if (rows.length === 0) return;

  const { data: receiptRows } = await admin
    .from("tenancy_receipts")
    .select("id, share_id, kind, amount, method, statutory_cash, issued_at, due_date, period_label")
    .in(
      "share_id",
      rows.map((r) => r.id),
    );

  const receiptsByShare = new Map<string, ScheduleReceipt[]>();
  for (const r of receiptRows ?? []) {
    const list = receiptsByShare.get(r.share_id) ?? [];
    list.push(r as unknown as ScheduleReceipt);
    receiptsByShare.set(r.share_id, list);
  }

  const today = todayUtc();

  for (const share of rows) {
    const listing = share.property_listings ?? {};
    const landlordId = listing.landlord_id as string | undefined;
    const title = (listing.title as string) ?? "your property";
    const monthlyRent = Number(listing.monthly_rent ?? 0);

    // ---- Rent ----------------------------------------------------------
    if (share.tenancy_status !== "ended") {
      const schedule = buildRentSchedule({
        startDate: share.tenancy_start_date,
        monthlyRent,
        receipts: receiptsByShare.get(share.id) ?? [],
        months: 24,
      });

      for (const month of schedule) {
        const due = parseDay(month.dueDate);
        if (!due) continue;
        const daysToDue = daysBetween(today, due);

        if (month.state === "overdue") {
          // Only chase the most recent 6 months of arrears.
          if (daysToDue < -190) continue;
          const body = `${formatGBP(month.amount)} for ${month.periodLabel} was due on ${formatDay(due)} and has not been recorded as paid.`;
          await sendOnce(
            admin,
            runDate,
            {
              recipientId: share.tenant_id,
              type: "rent_overdue",
              entityType: "passport_share",
              entityId: share.id,
              kind: `rent_overdue:${month.periodLabel}`,
              title: `Rent overdue — ${month.periodLabel}`,
              body,
              linkPath: "/tenant/tenancy",
            },
            out,
          );
          if (landlordId) {
            await sendOnce(
              admin,
              runDate,
              {
                recipientId: landlordId,
                type: "rent_overdue",
                entityType: "passport_share",
                entityId: share.id,
                kind: `rent_overdue_landlord:${month.periodLabel}`,
                title: `Rent overdue — ${title}`,
                body: `${formatGBP(month.amount)} for ${month.periodLabel} was due on ${formatDay(due)} and is not yet recorded as received.`,
                linkPath: `/landlord/manage-tenancy?share=${share.id}`,
              },
              out,
            );
          }
          continue;
        }

        // Due in three days or less (and not yet paid) — nudge the tenant.
        if (month.state !== "paid" && daysToDue >= 0 && daysToDue <= 3) {
          const when = daysToDue === 0 ? "today" : `in ${daysToDue} day${daysToDue === 1 ? "" : "s"}`;
          await sendOnce(
            admin,
            runDate,
            {
              recipientId: share.tenant_id,
              type: "rent_due_reminder",
              entityType: "passport_share",
              entityId: share.id,
              kind: `rent_due:${month.periodLabel}`,
              title: `Rent due ${when}`,
              body: `${formatGBP(month.amount)} for ${month.periodLabel} is due on ${formatDay(due)}.`,
              linkPath: "/tenant/tenancy",
            },
            out,
          );
        }
      }
    }

    // ---- Deposit protection deadline ------------------------------------
    // Counts only from the date the deposit was received; existing tenancies get no alarms.
    const depositDates = share.lease_kind === "existing_agreement" ? null : depositDeadlines(share.deposit_received_at);
    const alreadyProtected = Boolean(share.deposit_protected_at);

    // ---- Prescribed information (35 days from receipt) -------------------
    if (depositDates && !share.prescribed_info_given_at && landlordId) {
      const piDays = daysBetween(today, depositDates.prescribedInfoBy);
      if (piDays < 0 || piDays === 0 || DEPOSIT_WARNING_DAYS.includes(piDays)) {
        const piOverdue = piDays < 0;
        await sendOnce(
          admin,
          runDate,
          {
            recipientId: landlordId,
            type: "deposit_deadline_approaching",
            entityType: "passport_share",
            entityId: share.id,
            kind: piOverdue ? "prescribed_info_passed" : `prescribed_info:${piDays}`,
            title: piOverdue ? "Prescribed information deadline passed" : "Prescribed information due soon",
            body: piOverdue
              ? `The 35-day deadline to give the tenant the prescribed deposit information for ${title} passed on ${formatDay(depositDates.prescribedInfoBy)}. Give it now and record the date.`
              : `Give the tenant the prescribed deposit information for ${title} by ${formatDay(depositDates.prescribedInfoBy)} (35 days from receiving the deposit).`,
            linkPath: `/landlord/manage-tenancy?share=${share.id}&tab=deposit`,
          },
          out,
        );
      }
    }

    if (depositDates && !alreadyProtected && landlordId) {
      const deadline = depositDates.protectBy;
      const daysLeft = daysBetween(today, deadline);

      const shouldWarn = daysLeft < 0 || DEPOSIT_WARNING_DAYS.includes(daysLeft) || daysLeft === 0;
      if (shouldWarn) {
        const overdue = daysLeft < 0;
        const body = overdue
          ? `The 28-day statutory deadline to protect the deposit for ${title} passed on ${formatDay(deadline)}. Protect it and record the scheme details now.`
          : `You have ${daysLeft === 0 ? "until the end of today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`} to protect the deposit for ${title} in an approved scheme. The deadline is ${formatDay(deadline)} (28 days from receiving it).`;

        await sendOnce(
          admin,
          runDate,
          {
            recipientId: landlordId,
            type: "deposit_deadline_approaching",
            entityType: "passport_share",
            entityId: share.id,
            kind: overdue ? "deposit_deadline_passed" : `deposit_deadline:${daysLeft}`,
            title: overdue ? "Deposit protection deadline passed" : "Deposit protection deadline approaching",
            body,
            linkPath: `/landlord/manage-tenancy?share=${share.id}&tab=deposit`,
          },
          out,
        );

        // The tenant is told once the deadline is close or gone.
        if (daysLeft <= 7) {
          await sendOnce(
            admin,
            runDate,
            {
              recipientId: share.tenant_id,
              type: "deposit_deadline_approaching",
              entityType: "passport_share",
              entityId: share.id,
              kind: overdue ? "deposit_deadline_passed_tenant" : `deposit_deadline_tenant:${daysLeft}`,
              title: overdue
                ? "Your deposit is not yet shown as protected"
                : "Deposit protection deadline approaching",
              body: overdue
                ? `Your landlord had until ${formatDay(deadline)} to protect your deposit and give you the scheme details. Nothing has been recorded in RoostNI yet.`
                : `Your deposit should be protected in an approved scheme by ${formatDay(deadline)}.`,
              linkPath: "/tenant/tenancy?tab=deposit",
            },
            out,
          );
        }
      }
    }
  }
}

async function runCertificateReminders(admin: Admin, runDate: string, out: ReminderOutcome) {
  const today = todayUtc();
  const horizon = new Date(today.getTime() + CERTIFICATE_WARNING_DAYS * DAY_MS);

  const { data, error } = await admin
    .from("property_certificates")
    .select("id, property_id, landlord_id, kind, expires_on, property_listings!inner(title)")
    .not("expires_on", "is", null)
    .lte("expires_on", isoDate(horizon));

  if (error) {
    out.errors.push(`certificates: ${error.message}`);
    return;
  }

  const rows = (data ?? []) as unknown as {
    id: string;
    property_id: string;
    landlord_id: string;
    kind: string;
    expires_on: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    property_listings: any;
  }[];
  if (rows.length === 0) return;

  // Current tenant per property, so they hear about expiries too.
  const { data: tenants } = await admin
    .from("passport_shares")
    .select("listing_id, tenant_id")
    .eq("lease_status", "counter_signed")
    .in("tenancy_status", ["active", "notice_served", "ended"]);

  const tenantsByListing = new Map<string, string[]>();
  for (const t of tenants ?? []) {
    if (!t.tenant_id) continue;
    const list = tenantsByListing.get(t.listing_id) ?? [];
    list.push(t.tenant_id);
    tenantsByListing.set(t.listing_id, list);
  }

  for (const cert of rows) {
    const expiry = parseDay(cert.expires_on);
    if (!expiry) continue;
    const daysLeft = daysBetween(today, expiry);
    const label = CERTIFICATE_LABELS[cert.kind] ?? cert.kind.toUpperCase();
    const propertyTitle = (cert.property_listings?.title as string) ?? "your property";
    const expired = daysLeft < 0;

    // Warn at 30/14/7/3/1/0 days, then once a week after expiry.
    const warnDays = [30, 14, 7, 3, 1, 0];
    const shouldWarn = expired ? Math.abs(daysLeft) % 7 === 0 : warnDays.includes(daysLeft);
    if (!shouldWarn) continue;

    await sendOnce(
      admin,
      runDate,
      {
        recipientId: cert.landlord_id,
        type: expired ? "certificate_expired" : "certificate_expiring",
        entityType: "property_listing",
        entityId: cert.property_id,
        kind: expired ? `cert_expired:${cert.id}` : `cert_expiring:${cert.id}:${daysLeft}`,
        title: expired
          ? `${label} has expired`
          : `${label} expires in ${daysLeft === 0 ? "less than a day" : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`}`,
        body: expired
          ? `The ${label} for ${propertyTitle} expired on ${formatDay(expiry)}. Upload the renewed certificate to keep the property compliant.`
          : `The ${label} for ${propertyTitle} expires on ${formatDay(expiry)}.`,
        linkPath: `/dashboard/listing-edit?id=${cert.property_id}`,
      },
      out,
    );

    if (expired) {
      for (const tenantId of tenantsByListing.get(cert.property_id) ?? []) {
        await sendOnce(
          admin,
          runDate,
          {
            recipientId: tenantId,
            type: "certificate_expired",
            entityType: "property_listing",
            entityId: cert.property_id,
            kind: `cert_expired_tenant:${cert.id}`,
            title: `${label} has expired`,
            body: `The ${label} held for your home expired on ${formatDay(expiry)}. Your landlord has been reminded to renew it.`,
            linkPath: "/tenant/tenancy?tab=documents",
          },
          out,
        );
      }
    }
  }
}

/**
 * Records checklist for tenancies that began before RoostNI. Days 3, 7 and 10
 * after the home was added, then weekly, until every item is filled in.
 * The 10-day target is RoostNI's own, not a legal deadline.
 */
async function runTenancyRecordsReminders(admin: Admin, runDate: string, out: ReminderOutcome) {
  const { tenancyChecklist, daysSinceAdded, isReminderDay } = await import("./tenancy-completeness");
  const { data, error } = await admin
    .from("passport_shares")
    .select(
      "id, tenancy_start_date, tenancy_status, rent_frequency, deposit_received_at, deposit_scheme, deposit_protected_at, tenant_phone, tin_given_at, property_listings!inner(landlord_id, created_at, monthly_rent, deposit, ni_landlord_reg_number, existing_tenant_name, existing_tenant_email, is_test, occupancy_status)",
    )
    .eq("lease_kind", "existing_agreement")
    .limit(2000);
  if (error) {
    out.errors.push(`records: ${error.message}`);
    return;
  }
  const now = new Date(`${runDate}T12:00:00Z`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data ?? []) as any[]) {
    const l = row.property_listings;
    if (!l || l.is_test || l.occupancy_status !== "tenanted") continue;
    if (row.tenancy_status && row.tenancy_status !== "active") continue;
    const day = daysSinceAdded(l.created_at, now);
    if (!isReminderDay(day)) continue;
    const list = tenancyChecklist({
      tenancy_start_date: row.tenancy_start_date,
      monthly_rent: l.monthly_rent,
      rent_frequency: row.rent_frequency,
      deposit: l.deposit,
      deposit_received_at: row.deposit_received_at,
      deposit_scheme: row.deposit_scheme,
      deposit_protected_at: row.deposit_protected_at,
      tenant_name: l.existing_tenant_name,
      tenant_email: l.existing_tenant_email,
      tenant_phone: row.tenant_phone,
      tin_given_at: row.tin_given_at,
      ni_landlord_reg_number: l.ni_landlord_reg_number,
    });
    const missing = list.filter((i) => !i.done);
    if (missing.length === 0) continue;
    const done = list.length - missing.length;
    await sendOnce(
      admin,
      runDate,
      {
        type: "tenancy_records_reminder",
        recipientId: l.landlord_id,
        entityType: "passport_share",
        entityId: row.id,
        kind: `records_reminder:${day}`,
        title: `Your tenancy records: ${done} of ${list.length} done`,
        body: `RoostNI helps you keep your records in order. Still to add: ${missing.map((m) => m.label.toLowerCase()).join(", ")}. The 10-day target is RoostNI's, not a legal deadline, and every tool stays open while you finish.`,
        linkPath: `/landlord/manage-tenancy?share=${row.id}&tab=overview`,
      },
      out,
    );
  }
}

/** Approved legal wording only; if a fact is no longer approved, its reminder is not sent. */
async function approvedFact(admin: Admin, id: string): Promise<string | null> {
  const { data } = await admin.from("legal_facts").select("fact_text, status").eq("id", id).maybeSingle();
  return data?.status === "approved" ? (data.fact_text as string) : null;
}
const TIN_FACT_ID = "438c8aaa-b72b-415e-8aeb-446cbc4f25bc";
const REGISTRATION_FACT_ID = "c214b49f-bc9b-4a9b-b259-b858f683f090";

/** Tenancy information notice: new RoostNI tenancies only, counted from the tenancy start, until marked given. */
async function runTinReminders(admin: Admin, runDate: string, out: ReminderOutcome) {
  const fact = await approvedFact(admin, TIN_FACT_ID);
  if (!fact) return;
  const { tinReminderKind } = await import("./statutory-reminders");
  const { data, error } = await admin
    .from("passport_shares")
    .select("id, tenancy_start_date, tin_given_at, lease_kind, tenancy_status, property_listings!inner(landlord_id, title, is_test)")
    .eq("lease_status", "counter_signed")
    .neq("lease_kind", "existing_agreement")
    .limit(2000);
  if (error) {
    out.errors.push(`tin: ${error.message}`);
    return;
  }
  const today = new Date(`${runDate}T12:00:00Z`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data ?? []) as any[]) {
    const l = row.property_listings;
    if (!l || l.is_test || (row.tenancy_status && row.tenancy_status !== "active")) continue;
    const kind = tinReminderKind({ startDate: row.tenancy_start_date, tinGivenAt: row.tin_given_at, leaseKind: row.lease_kind, today });
    if (!kind) continue;
    const left = Number(kind.split(":")[1]);
    const passed = kind.startsWith("tin_passed");
    await sendOnce(admin, runDate, {
      type: "tenancy_information_notice_reminder",
      recipientId: l.landlord_id,
      entityType: "passport_share",
      entityId: row.id,
      kind,
      title: passed ? `Tenancy information notice: not marked as given` : left === 0 ? `Tenancy information notice: last day` : `Tenancy information notice: ${left} days left`,
      body: `${fact} Tenancy at ${l.title ?? "your property"} started ${row.tenancy_start_date}. Generate it in RoostNI, then mark the date you gave it so these reminders stop.`,
      linkPath: `/landlord/manage-tenancy?share=${row.id}&tab=overview`,
    }, out);
  }
}

/** Landlord registration: one nudge the day after a home is added, then monthly, until a registration number is saved. */
async function runRegistrationReminders(admin: Admin, runDate: string, out: ReminderOutcome) {
  const fact = await approvedFact(admin, REGISTRATION_FACT_ID);
  if (!fact) return;
  const { registrationReminderKind } = await import("./statutory-reminders");
  const { data, error } = await admin
    .from("property_listings")
    .select("id, landlord_id, title, created_at, ni_landlord_reg_number, is_test, occupancy_status")
    .eq("is_test", false)
    .limit(5000);
  if (error) {
    out.errors.push(`registration: ${error.message}`);
    return;
  }
  const today = new Date(`${runDate}T12:00:00Z`);
  for (const l of data ?? []) {
    // Existing-tenancy homes already get the records checklist, which includes the registration number.
    if (l.occupancy_status === "tenanted") continue;
    const kind = registrationReminderKind({ addedAt: l.created_at, regNumber: l.ni_landlord_reg_number, today });
    if (!kind) continue;
    await sendOnce(admin, runDate, {
      type: "landlord_registration_reminder",
      recipientId: l.landlord_id,
      entityType: "property_listing",
      entityId: l.id,
      kind,
      title: "Add your landlord registration number",
      body: `${fact} Add your registration number to ${l.title ?? "your home"} on RoostNI so your records are complete.`,
      linkPath: `/dashboard/listing-edit?id=${l.id}`,
    }, out);
  }
}

/** Entry point for the daily job. */
export async function runDailyReminders(): Promise<ReminderOutcome> {
  const out: ReminderOutcome = { sent: 0, skipped: 0, errors: [] };
  const runDate = isoDate(todayUtc());

  await runRentAndDepositReminders(supabaseAdmin, runDate, out);
  await runCertificateReminders(supabaseAdmin, runDate, out);
  await runTenancyRecordsReminders(supabaseAdmin, runDate, out);
  await runTinReminders(supabaseAdmin, runDate, out);
  await runRegistrationReminders(supabaseAdmin, runDate, out);

  // Housekeeping: the log only needs to be long enough to stop same-day repeats.
  await supabaseAdmin
    .from("reminder_log")
    .delete()
    .lt("run_date", isoDate(new Date(todayUtc().getTime() - 90 * DAY_MS)));

  return out;
}
