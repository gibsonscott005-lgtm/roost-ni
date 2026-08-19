import { Link, useRouterState } from "@tanstack/react-router";
import { IdCard, Search, LayoutDashboard } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Passport", icon: IdCard },
  { to: "/listings", label: "Browse", icon: Search },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
] as const;

export function ViewSwitcher() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mb-6 flex justify-center">
      <div
        role="tablist"
        aria-label="Switch prototype view"
        className="inline-flex w-full max-w-md items-center gap-1 rounded-full border border-border bg-surface-muted p-1 sm:w-auto"
      >
        {ITEMS.map(({ to, label, icon: Icon }) => {
          const active =
            to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
          return (
            <Link
              key={to}
              to={to}
              role="tab"
              aria-selected={active}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition sm:flex-none sm:text-sm ${
                active
                  ? "bg-surface text-foreground shadow-raised"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}