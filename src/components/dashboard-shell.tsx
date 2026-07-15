import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Inbox,
  LayoutGrid,
  LogOut,
  Plus,
  IdCard,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/hooks/use-auth";
import type { User } from "@supabase/supabase-js";
import { NotificationsBell } from "@/components/notifications-bell";

export type DashboardKey = "properties" | "add" | "applications" | "passport";

interface Props {
  user: User | null;
  profile: Profile | null;
  activeKey: DashboardKey;
  listingsCount?: number;
  applicationsCount?: number;
  onSelectTab?: (key: "properties" | "add") => void;
  children: React.ReactNode;
}

export function DashboardShell({
  user,
  profile,
  activeKey,
  listingsCount,
  applicationsCount,
  onSelectTab,
  children,
}: Props) {
  const navigate = useNavigate();
  const isLandlord = profile?.account_type === "landlord";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  // Defensive native-navigation fallback: if router click handling is
  // ever swallowed by a parent (preventDefault, overlay, etc.) we still
  // navigate via the browser.
  const goDashboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    // allow cmd/ctrl/middle-click default behaviour
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || (e as React.MouseEvent).button === 1) return;
    e.preventDefault();
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <a
            href="/dashboard"
            onClick={goDashboard}
            style={{ cursor: "pointer", pointerEvents: "auto" }}
            className="flex items-center gap-2"
          >
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-foreground text-[var(--color-primary-foreground)]">
              <Home className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <span className="font-display text-base font-semibold tracking-tight">
              Roost<span className="text-verified">.</span>ni
            </span>
            {profile ? (
              <span
                role="link"
                tabIndex={0}
                onClick={goDashboard}
                title={user?.email ?? undefined}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") goDashboard(e as unknown as React.MouseEvent);
                }}
                style={{ cursor: "pointer", pointerEvents: "auto" }}
                className="ml-2 hidden rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition hover:bg-secondary sm:inline"
              >
                {profile.account_type}
              </span>
            ) : null}
          </a>
          <div className="flex items-center gap-1.5">
            <a
              href="/dashboard"
              onClick={goDashboard}
              style={{ cursor: "pointer", pointerEvents: "auto" }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-foreground px-3 py-1.5 text-xs font-medium text-[var(--color-primary-foreground)] transition hover:bg-foreground/90"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Dashboard
            </a>
            <Link
              to="/listings"
              className="hidden rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary sm:inline"
            >
              Browse properties
            </Link>
            <NotificationsBell userId={user?.id} />
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Welcome back
            </p>
            <p className="mt-1 truncate font-display text-lg font-semibold tracking-tight">
              {profile?.full_name || user?.email}
            </p>
          </div>
          {isLandlord ? (
            <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-surface p-2 lg:flex-col lg:overflow-visible">
              <NavButton
                active={activeKey === "properties"}
                onClick={() =>
                  activeKey === "applications"
                    ? navigate({ to: "/dashboard" })
                    : onSelectTab?.("properties")
                }
                icon={LayoutGrid}
                label="My properties"
                badge={listingsCount}
              />
              <NavButton
                active={activeKey === "add"}
                onClick={() =>
                  activeKey === "applications"
                    ? navigate({ to: "/dashboard" })
                    : onSelectTab?.("add")
                }
                icon={Plus}
                label="Add new property"
              />
              <NavLink
                to="/dashboard/applications"
                active={activeKey === "applications"}
                icon={Inbox}
                label="Received passports"
                badge={applicationsCount}
              />
            </nav>
          ) : (
            <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-surface p-2 lg:flex-col lg:overflow-visible">
              <TenantNavLink
                to="/dashboard"
                active={pathname === "/dashboard"}
                icon={LayoutGrid}
                label="Overview"
              />
              <TenantNavLink
                to="/dashboard/passport"
                active={pathname.startsWith("/dashboard/passport")}
                icon={IdCard}
                label="My Passport"
              />
            </nav>
          )}
        </aside>

        <section>{children}</section>
      </main>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon: Icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={itemCx(active)}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      {typeof badge === "number" ? <Badge value={badge} /> : null}
    </button>
  );
}

function NavLink({
  to,
  active,
  icon: Icon,
  label,
  badge,
}: {
  to: "/dashboard/applications";
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
}) {
  return (
    <Link to={to} className={itemCx(active)}>
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      {typeof badge === "number" ? <Badge value={badge} /> : null}
    </Link>
  );
}

function TenantNavLink({
  to,
  active,
  icon: Icon,
  label,
}: {
  to: "/dashboard" | "/dashboard/passport";
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link to={to} className={itemCx(active)}>
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
    </Link>
  );
}

function Badge({ value }: { value: number }) {
  return (
    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
      {value}
    </span>
  );
}

function itemCx(active: boolean) {
  return `flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm transition ${
    active
      ? "bg-secondary font-medium text-foreground"
      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
  }`;
}