import { CookieSettingsLink } from "@/components/cookie-consent";
import { Link } from "@tanstack/react-router";
import { LogoMark } from "@/components/logo";

export function BlogHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <LogoMark />
          <span className="font-display text-xl font-extrabold tracking-tight">
            Roost<span className="text-verified">NI</span>
          </span>
        </Link>
        <nav className="flex items-center gap-4 font-mono text-sm font-bold uppercase">
          <Link to="/listings" className="text-muted-foreground hover:text-foreground">Browse</Link>
          <Link to="/blog" className="text-foreground">Blog</Link>
          <Link to="/auth" search={{ mode: "login" }} className="whitespace-nowrap border-2 border-foreground px-3 py-1.5 hover:bg-foreground hover:text-background">
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function BlogFooter() {
  return (
    <footer className="mt-16 border-t-2 border-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-8 font-mono text-xs uppercase text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} RoostNI — Northern Ireland only</p>
        <div className="flex flex-wrap gap-4">
          <Link to="/blog" className="hover:text-foreground">Blog</Link>
          <Link to="/help" className="hover:text-foreground">Help</Link>
          <Link to="/how-roostni-is-funded" className="hover:text-foreground">How we're funded</Link>
          <CookieSettingsLink className="uppercase hover:text-foreground" />
        </div>
      </div>
      <p className="mx-auto max-w-4xl px-4 pb-8 text-xs text-muted-foreground sm:px-6">
        RoostNI provides general information, not legal advice. Check current guidance at nidirect.gov.uk.
      </p>
    </footer>
  );
}
