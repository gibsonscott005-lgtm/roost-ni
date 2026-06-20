import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Home,
  Inbox,
  LayoutGrid,
  LogOut,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/hooks/use-auth";
import type { User } from "@supabase/supabase-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const displayName = profile?.full_name || user?.email || "Account";
  const initials = (profile?.full_name || user?.email || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-foreground text-[var(--color-primary-foreground)]">
              <Home className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <span className="font-display text-base font-semibold tracking-tight">
              Roost<span className="text-verified">.</span>ni
            </span>
            {profile ? (
              <span className="ml-2 hidden rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
                {profile.account_type}
              </span>
            ) : null}
          </Link>
          <div className="flex items-center gap-1.5">
            <Link
              to="/listings"
              className="hidden rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary sm:inline"
            >
              Browse properties
            </Link>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Notifications"
                  className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-foreground/80 transition hover:bg-secondary"
                >
                  <Bell className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-[20rem] rounded-3xl border border-border bg-surface p-0 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-24px_rgba(15,23,42,0.22)]"
              >
                <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                  <p className="font-display text-sm font-semibold tracking-tight">
                    Notifications
                  </p>
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    0 new
                  </span>
                </div>
                <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-muted text-muted-foreground">
                    <Bell className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-medium text-foreground">
                    You're all caught up
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Verified updates for your Tenant Passport shares will appear here.
                  </p>
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  className="grid h-9 w-9 place-items-center rounded-full border border-border bg-foreground text-[11px] font-semibold tracking-wide text-[var(--color-primary-foreground)] transition hover:opacity-90"
                >
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-64 rounded-2xl border border-border bg-surface p-2 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-24px_rgba(15,23,42,0.22)]"
              >
                <DropdownMenuLabel className="px-3 py-2">
                  <p className="font-display text-sm font-semibold tracking-tight text-foreground">
                    {displayName}
                  </p>
                  {user?.email ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  ) : null}
                  {profile?.account_type ? (
                    <span className="mt-2 inline-flex rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {profile.account_type}
                    </span>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    void handleSignOut();
                  }}
                  className="cursor-pointer rounded-xl px-3 py-2 text-sm font-medium text-foreground focus:bg-secondary"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[220px_minmax(0,1fr)]">
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
            <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground">
              You're signed in as a Tenant. Your verified passport lives on the{" "}
              <Link to="/" className="font-medium text-foreground underline-offset-2 hover:underline">
                home view
              </Link>
              .
            </div>
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