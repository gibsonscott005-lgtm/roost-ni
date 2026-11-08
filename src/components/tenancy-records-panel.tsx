import { TenantInviteCard } from "@/components/tenant-invite-card";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import {
  COMPLETION_TARGET_DAYS,
  daysSinceAdded,
  tenancyChecklist,
} from "@/lib/tenancy-completeness";

const SCHEMES = ["TDS Northern Ireland", "MyDeposits Northern Ireland"];

interface Row {
  id: string;
  listing_id: string;
  tenant_id: string | null;
  tenancy_start_date: string | null;
  rent_frequency: string | null;
  deposit_received_at: string | null;
  deposit_scheme: string | null;
  deposit_protected_at: string | null;
  tenant_phone: string | null;
  tin_given_at: string | null;
  listing: {
    created_at: string;
    monthly_rent: number | null;
    deposit: number | null;
    ni_landlord_reg_number: string | null;
    existing_tenant_name: string | null;
    existing_tenant_email: string | null;
  } | null;
}

/** Records checklist for a tenancy that began before RoostNI. Never blocks any tool. */
export function TenancyRecordsPanel({ shareId }: { shareId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["tenancy-records", shareId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passport_shares")
        .select(
          "id, listing_id, tenant_id, tenancy_start_date, rent_frequency, deposit_received_at, deposit_scheme, deposit_protected_at, tenant_phone, tin_given_at, listing:property_listings!listing_id(created_at, monthly_rent, deposit, ni_landlord_reg_number, existing_tenant_name, existing_tenant_email)",
        )
        .eq("id", shareId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Row | null;
    },
  });
  const row = q.data;
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!row) return;
    const l = row.listing;
    setForm({
      tenancy_start_date: row.tenancy_start_date ?? "",
      rent_frequency: row.rent_frequency ?? "",
      deposit_received_at: row.deposit_received_at ?? "",
      deposit_scheme: row.deposit_scheme ?? "",
      deposit_protected_at: row.deposit_protected_at?.slice(0, 10) ?? "",
      tenant_phone: row.tenant_phone ?? "",
      tin_given_at: row.tin_given_at ?? "",
      monthly_rent: l?.monthly_rent != null ? String(l.monthly_rent) : "",
      deposit: l?.deposit != null ? String(l.deposit) : "",
      ni_landlord_reg_number: l?.ni_landlord_reg_number && l.ni_landlord_reg_number !== "Pending" ? l.ni_landlord_reg_number : "",
      existing_tenant_name: l?.existing_tenant_name ?? "",
      existing_tenant_email: l?.existing_tenant_email ?? "",
    });
  }, [row]);

  const save = useMutation({
    mutationFn: async () => {
      if (!row) return;
      const n = (v: string) => (v.trim() === "" ? null : v.trim());
      const { error: e1 } = await supabase
        .from("passport_shares")
        .update({
          tenancy_start_date: n(form.tenancy_start_date ?? ""),
          rent_frequency: n(form.rent_frequency ?? ""),
          deposit_received_at: n(form.deposit_received_at ?? ""),
          deposit_scheme: n(form.deposit_scheme ?? ""),
          deposit_protected_at: n(form.deposit_protected_at ?? ""),
          tenant_phone: n(form.tenant_phone ?? ""),
          tin_given_at: n(form.tin_given_at ?? ""),
        } as never)
        .eq("id", row.id);
      if (e1) throw e1;
      const rent = Number(form.monthly_rent);
      const dep = form.deposit?.trim() ? Number(form.deposit) : null;
      if (dep !== null && rent > 0 && dep > rent) {
        throw new Error("The deposit is more than one month's rent. Please check the amount.");
      }
      const { error: e2 } = await supabase
        .from("property_listings")
        .update({
          ...(rent > 0 ? { monthly_rent: rent } : {}),
          ...(dep !== null ? { deposit: dep } : {}),
          ni_landlord_reg_number: n(form.ni_landlord_reg_number ?? "") ?? "Pending",
          existing_tenant_name: n(form.existing_tenant_name ?? ""),
          existing_tenant_email: n(form.existing_tenant_email ?? ""),
        } as never)
        .eq("id", row.listing_id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Records saved");
      qc.invalidateQueries({ queryKey: ["tenancy-records", shareId] });
      qc.invalidateQueries({ queryKey: ["tenancy", shareId] });
    },
    onError: (e: unknown) =>
      toast.error("Could not save", { description: e instanceof Error ? e.message : "Please try again" }),
  });

  if (!row) return null;
  const list = tenancyChecklist({
    tenancy_start_date: form.tenancy_start_date || null,
    monthly_rent: Number(form.monthly_rent) || null,
    rent_frequency: form.rent_frequency || null,
    deposit: form.deposit ? Number(form.deposit) : null,
    deposit_received_at: form.deposit_received_at || null,
    deposit_scheme: form.deposit_scheme || null,
    deposit_protected_at: form.deposit_protected_at || null,
    tenant_name: form.existing_tenant_name || null,
    tenant_email: form.existing_tenant_email || null,
    tenant_phone: form.tenant_phone || null,
    tin_given_at: form.tin_given_at || null,
    ni_landlord_reg_number: form.ni_landlord_reg_number || null,
  });
  const done = list.filter((i) => i.done).length;
  const complete = done === list.length;
  const day = row.listing ? daysSinceAdded(row.listing.created_at) : 0;
  const daysLeft = Math.max(0, COMPLETION_TARGET_DAYS - day);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const input = "mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm";
  const field = (k: string, label: string, type = "text", extra?: React.ReactNode) => (
    <label className="block text-xs font-medium">
      {label}
      {extra ?? <input type={type} className={input} value={form[k] ?? ""} onChange={set(k)} />}
    </label>
  );

  return (
    <section className="rounded-sm border border-border bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">Your tenancy records</h2>
        <span className="text-sm font-semibold">
          {done} of {list.length} done
        </span>
      </div>
      <Progress value={(done / list.length) * 100} className="mt-3 h-2" />
      <p className="mt-2 text-xs text-muted-foreground">
        {complete
          ? "All records in place. RoostNI will stop reminding you."
          : `RoostNI helps you stay on top of your legal duties. Aim to finish within ${COMPLETION_TARGET_DAYS} days${daysLeft > 0 ? ` (${daysLeft} left)` : ""}. This is RoostNI's target, not a legal deadline, and every tool stays open while you finish.`}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {field("tenancy_start_date", "Tenancy start date", "date")}
        {field("monthly_rent", "Rent amount (£)", "number")}
        {field(
          "rent_frequency",
          "Rent frequency",
          "",
          <select className={input} value={form.rent_frequency ?? ""} onChange={set("rent_frequency")}>
            <option value="">Choose…</option>
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="monthly">Monthly</option>
          </select>,
        )}
        {field("deposit", "Deposit amount (£)", "number")}
        {field("deposit_received_at", "Date deposit received", "date")}
        {field(
          "deposit_scheme",
          "Deposit scheme",
          "",
          <select className={input} value={form.deposit_scheme ?? ""} onChange={set("deposit_scheme")}>
            <option value="">Choose…</option>
            {SCHEMES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>,
        )}
        {field("deposit_protected_at", "Date deposit protected", "date")}
        {field("existing_tenant_name", "Tenant names")}
        {field("existing_tenant_email", "Tenant email", "email")}
        {field("tenant_phone", "Tenant phone", "tel")}
        {field("tin_given_at", "Date tenancy information notice given", "date")}
        {field("ni_landlord_reg_number", "Landlord registration number")}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Rent frequency is for your records. The rent ledger still works month by month. These dates are your own
        records: RoostNI does not check them or start any countdowns from them.
      </p>
      <button
        type="button"
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="mt-4 inline-flex items-center rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background disabled:opacity-60"
      >
        {save.isPending ? "Saving…" : "Save records"}
      </button>
      <TenantInviteCard shareId={row.id} defaultEmail={row.listing?.existing_tenant_email} linked={!!row.tenant_id} />
    </section>
  );
}
