import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Roost NI — Sign in or sign up" },
      {
        name: "description",
        content:
          "Create a verified Tenant or Landlord account on Roost NI. Email sign-up for renters and property owners in Northern Ireland.",
      },
    ],
  }),
  component: () => <Navigate to="/auth" />,
});


function PreferenceTracker() {
  const chips = [
    { icon: MapPin, label: "South & East Belfast, Lisburn, Holywood" },
    { icon: PoundSterling, label: "£750 – £950 pcm" },
    { icon: BedDouble, label: "2 bed · unfurnished" },
    { icon: CalendarDays, label: "Move-in by 1 Sept 2026" },
  ];
  return (
    <section className="mt-5 rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_0_rgba(15,23,42,0.03),0_12px_28px_-24px_rgba(15,23,42,0.18)] sm:p-6">
      <div className="flex flex-wrap gap-2">
        {chips.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 py-1.5 text-xs font-medium text-foreground/80"
          >
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            {label}
          </span>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 rounded-2xl border border-verified/20 bg-verified-soft/50 p-4 sm:p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-verified shadow-sm">
          <Flame className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-verified">
            Local NI preference
          </p>
          <p className="mt-1 font-display text-base font-semibold tracking-tight text-foreground">
            Bulk Oil / Gas heating — empty-in, full-out
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Happy to top up the tank on move-in and leave it full on move-out. Honest agreement,
            no end-of-tenancy surprises.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        Matched against 142 active listings this week in your areas.
      </div>
    </section>
  );
}

function ShareBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/90 px-4 py-3 backdrop-blur sm:static sm:mt-10 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
        <button
          type="button"
          onClick={() =>
            toast.success("Passport shared successfully", {
              description:
                "Landlord James Murphy has received your verified compliance data.",
            })
          }
          className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-4 font-display text-base font-semibold text-[var(--color-primary-foreground)] shadow-[0_12px_28px_-12px_rgba(15,23,42,0.45)] transition hover:translate-y-[-1px] hover:bg-foreground/92 active:translate-y-0"
        >
          <Share2 className="h-4 w-4" />
          Share Passport to Landlord
        </button>
      </div>
      <p className="mx-auto mt-2 flex max-w-3xl items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="h-3 w-3" />
        Encrypted link · expires after 7 days · revoke any time
      </p>
    </div>
  );
}
