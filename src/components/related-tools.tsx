import { Link } from "@tanstack/react-router";

const TOOLS = [
  { to: "/audit", label: "Compliance health check" },
  { to: "/notice-to-quit-ni", label: "Notice to quit calculator" },
  { to: "/tenancy-information-notice-ni", label: "Tenancy information notice" },
  { to: "/rent-receipts-ni", label: "Rent receipts" },
  { to: "/landlord-registration-ni", label: "Landlord registration" },
  { to: "/blog", label: "NI renting guides" },
] as const;

/** Internal links between the NI landlord tools; hides the current page. */
export function RelatedTools({ current }: { current?: string }) {
  return (
    <nav aria-label="Related landlord tools" className="mx-auto max-w-6xl border-t-2 border-foreground px-4 py-10 sm:px-6">
      <p className="font-mono text-sm font-bold uppercase tracking-wider text-verified">// Related tools for NI landlords</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {TOOLS.filter((t) => t.to !== current).map((t) => (
          <li key={t.to}>
            <Link to={t.to} className="inline-block border-2 border-foreground px-3 py-1.5 text-sm font-semibold hover:bg-secondary">
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
