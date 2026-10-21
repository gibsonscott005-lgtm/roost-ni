import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** "// Label" mono section marker used across pages. */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("brutal-label", className)}>// {children}</p>;
}

/** Big emerald figure with an outlined caption (e.g. £0, 1 mo, 28 days). */
export function StatBox({ value, label }: { value: ReactNode; label: ReactNode }) {
  return (
    <div className="border border-border bg-surface p-4 shadow-raised">
      <p className="font-display text-4xl font-extrabold text-verified">{value}</p>
      <p className="mt-2 inline-block border border-border px-2 py-0.5 font-mono text-[0.7rem] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

/** Boxed callout: green for key messages, paper for explanations. */
export function Callout({
  tone = "verified",
  children,
  className,
}: {
  tone?: "verified" | "paper";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-2 border-background p-4 font-semibold",
        tone === "verified"
          ? "bg-verified text-verified-foreground shadow-raised"
          : "bg-paper text-paper-foreground shadow-verified",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Sharp bordered card with hard offset shadow. */
export function BrutalCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("border border-border bg-surface p-5 shadow-raised", className)}>{children}</div>;
}
