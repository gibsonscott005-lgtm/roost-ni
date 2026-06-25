import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useMemo, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, FileText, Upload, ShieldCheck, Check, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard-shell";

export const Route = createFileRoute("/_authenticated/landlord/issue-lease")({
  validateSearch: z.object({ share: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Prepare & Issue Lease — Roost NI" },
      { name: "description", content: "Issue a Private Tenancies Act NI 2022 compliant lease to your accepted tenant." },
    ],
  }),
  component: IssueLeasePage,
});

type Choice = "standard" | "custom" | null;

function IssueLeasePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { share: shareId } = Route.useSearch();
  const [choice, setChoice] = useState<Choice>("standard");
  const [oilClause, setOilClause] = useState(true);
  const [sent, setSent] = useState(false);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const ctxQuery = useQuery({
    enabled: !!shareId,
    queryKey: ["lease-context", shareId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passport_shares")
        .select(
          "id, status, tenant:profiles!tenant_id(full_name), listing:property_listings!listing_id(title, address, location, monthly_rent, deposit)",
        )
        .eq("id", shareId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as {
        id: string;
        status: string;
        tenant: { full_name: string } | null;
        listing: { title: string; address: string | null; location: string | null; monthly_rent: number | null; deposit: number | null } | null;
      } | null;
    },
  });

  const ctx = ctxQuery.data;
  const tenantName = ctx?.tenant?.full_name || "Tenant";
  const landlordName = profile?.full_name || "Landlord";
  const propertyAddress = ctx?.listing?.address || ctx?.listing?.location || ctx?.listing?.title || "Property address";
  const monthlyRent = ctx?.listing?.monthly_rent ?? 0;
  const deposit = ctx?.listing?.deposit ?? Number(monthlyRent) || 0;

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setCustomFile(f);
  };

  const issue = () => {
    if (choice === "custom" && !customFile) {
      toast.error("Upload a lease PDF first");
      return;
    }
    setSent(true);
    toast.success("Lease sent to tenant", {
      description: `${tenantName} has been notified. Status: Sent to Tenant.`,
    });
  };

  return (
    <DashboardShell user={user} profile={profile} activeKey="applications">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <Link
            to="/dashboard/applications"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to applications
          </Link>
          <h2 className="mt-2 font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Prepare &amp; Issue Lease
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            For <span className="font-medium text-foreground">{tenantName}</span> · {propertyAddress}
          </p>
        </div>
        {sent ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-verified px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-verified-foreground)]">
            <ShieldCheck className="h-3.5 w-3.5" /> Sent to Tenant
          </span>
        ) : null}
      </div>

      {/* Layout choice cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        <ChoiceCard
          active={choice === "standard"}
          onClick={() => setChoice("standard")}
          icon={<FileText className="h-5 w-5" />}
          title="Use Roost Standard NI Template"
          subtitle="Private Tenancies Act (NI) 2022 compliant"
          meta="Includes statutory Deposit Protection notice"
        />
        <ChoiceCard
          active={choice === "custom"}
          onClick={() => setChoice("custom")}
          icon={<Upload className="h-5 w-5" />}
          title="Upload Custom Lease (PDF)"
          subtitle="Drag and drop your own agreement"
          meta="Custom leases enter compliance vetting before issue"
        />
      </div>

      {/* Standard template preview */}
      {choice === "standard" ? (
        <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Document preview
              </p>
              <p className="mt-1 font-display text-base font-semibold tracking-tight">
                Private Residential Tenancy Agreement (NI)
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-full border border-border bg-surface-muted/60 px-3 py-2 text-xs font-medium text-foreground">
              <span>Include Domestic Oil Tank Clause (Full In / Full Out)</span>
              <span
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                  oilClause ? "bg-verified" : "bg-border"
                }`}
                onClick={() => setOilClause((v) => !v)}
                role="switch"
                aria-checked={oilClause}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                    oilClause ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </span>
            </label>
          </div>

          <div className="max-h-[480px] overflow-y-auto bg-surface-muted/30 px-6 py-6">
            <article className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-border bg-surface p-6 text-sm leading-relaxed text-foreground/90 shadow-sm">
              <header className="border-b border-border pb-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Schedule A — Tenancy Particulars
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold tracking-tight">
                  Private Residential Tenancy Agreement
                </h3>
              </header>
              <p>
                THIS AGREEMENT is made under the <strong>Private Tenancies Act (Northern Ireland) 2022</strong>
                {" "}between <strong>{landlordName}</strong> (the &ldquo;Landlord&rdquo;) and{" "}
                <strong>{tenantName}</strong> (the &ldquo;Tenant&rdquo;) in respect of the property
                known as <strong>{propertyAddress}</strong>.
              </p>
              <Clause n="1" title="Rent">
                The Tenant shall pay rent of <strong>£{Number(monthlyRent).toLocaleString()}</strong> per
                calendar month, payable in advance on the 1st of each month by standing order.
              </Clause>
              <Clause n="2" title="Deposit & Protection">
                A tenancy deposit of <strong>£{Number(deposit).toLocaleString()}</strong> shall be lodged
                with an approved tenancy deposit scheme within 14 days of receipt, in accordance with the
                Tenancy Deposit Schemes Regulations (NI) 2012.
              </Clause>
              <Clause n="3" title="Term">
                The tenancy shall commence on a date to be agreed in writing and continue for an initial
                term of 12 months, thereafter rolling on a monthly basis subject to statutory notice.
              </Clause>
              <Clause n="4" title="Property Condition">
                The Landlord shall provide the property in a clean and safe condition with all required
                certificates (EICR, gas safety where applicable, EPC) supplied to the Tenant on or before
                the commencement date.
              </Clause>
              {oilClause ? (
                <Clause n="5" title="Domestic Oil Tank — Full In / Full Out">
                  The oil tank serving <strong>{propertyAddress}</strong> shall be supplied <em>full</em>
                  {" "}at the commencement of the tenancy. The Tenant agrees to return the tank{" "}
                  <em>full</em> at the end of the tenancy, or reimburse the Landlord for the cost of
                  refilling at the prevailing market rate. Both parties shall verify levels at check-in
                  and check-out and record them on the inventory.
                </Clause>
              ) : null}
              <Clause n={oilClause ? "6" : "5"} title="Repairs & Maintenance">
                The Landlord is responsible for structural repairs and the maintenance of installations
                for the supply of water, gas, electricity, heating and sanitation as required by statute.
              </Clause>
              <footer className="border-t border-border pt-3 text-xs text-muted-foreground">
                Signed electronically by the parties via Roost on issue. Roost retains an audit copy.
              </footer>
            </article>
          </div>
        </div>
      ) : null}

      {/* Custom upload */}
      {choice === "custom" ? (
        <div className="mt-6 rounded-3xl border border-border bg-surface p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Upload custom lease
          </p>
          <p className="mt-1 font-display text-base font-semibold tracking-tight">
            Drag &amp; drop your PDF
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Custom leases are placed into <span className="font-medium text-foreground">compliance vetting</span>
            {" "}before they can be issued to the tenant.
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`mt-4 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
              dragOver ? "border-verified bg-verified-soft" : "border-border bg-surface-muted/40 hover:bg-surface-muted"
            }`}
          >
            <Upload className="h-7 w-7 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">
              {customFile ? customFile.name : "Drop PDF here or click to browse"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {customFile ? `${Math.round(customFile.size / 1024)} KB · awaiting compliance review` : "PDF up to 10 MB"}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setCustomFile(f);
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Footer actions */}
      <div className="mt-6 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-border bg-surface p-4">
        <button
          type="button"
          onClick={() => navigate({ to: "/dashboard/applications" })}
          className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-foreground transition hover:bg-secondary"
        >
          Cancel
        </button>
        {sent ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-verified px-4 py-2 text-xs font-semibold text-[var(--color-verified-foreground)]">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
            Sent to Tenant
          </span>
        ) : (
          <button
            type="button"
            onClick={issue}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:brightness-110"
          >
            <Send className="h-3.5 w-3.5" />
            Issue Lease to Tenant
          </button>
        )}
      </div>
    </DashboardShell>
  );
}

function ChoiceCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
  meta,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  meta: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-3xl border bg-surface p-5 text-left transition ${
        active
          ? "border-verified ring-2 ring-verified/30"
          : "border-border hover:border-foreground/30"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`grid h-10 w-10 place-items-center rounded-2xl ${
            active ? "bg-verified text-[var(--color-verified-foreground)]" : "bg-surface-muted text-foreground"
          }`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-display text-base font-semibold tracking-tight">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{meta}</p>
    </button>
  );
}

function Clause({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Clause {n}
      </p>
      <h4 className="mt-0.5 font-display text-sm font-semibold tracking-tight">{title}</h4>
      <p className="mt-1 text-sm text-foreground/85">{children}</p>
    </section>
  );
}