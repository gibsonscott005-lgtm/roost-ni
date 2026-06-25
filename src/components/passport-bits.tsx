import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ExternalLink, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function formatEmployment(status: string | null | undefined): string {
  if (!status) return "—";
  const map: Record<string, string> = {
    permanent_full_time: "Permanent · Full-time",
    permanent_part_time: "Permanent · Part-time",
    self_employed: "Self-employed",
    contract: "Contract",
    student: "Student",
    retired: "Retired",
  };
  return map[status] ?? status;
}

export function DocumentRow({
  label,
  path,
  stepHash,
  optional = false,
  sectionFilled = false,
}: {
  label: string;
  path: string | null;
  stepHash: string;
  optional?: boolean;
  sectionFilled?: boolean;
}) {
  const [opening, setOpening] = useState(false);
  const filename = path ? path.split("/").pop() ?? path : null;
  const isImage = !!filename && /\.(jpe?g|png|webp|gif)$/i.test(filename);
  const Icon = isImage ? ImageIcon : FileText;

  const onView = async () => {
    if (!path || opening) return;
    setOpening(true);
    try {
      const { data, error } = await supabase.storage
        .from("tenant-documents")
        .createSignedUrl(path, 60);
      if (error || !data?.signedUrl) throw error ?? new Error("No URL");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error("Couldn't open document", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setOpening(false);
    }
  };

  if (!path) {
    if (optional && sectionFilled) {
      return (
        <li className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-surface px-3 py-2.5">
          <span className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm text-muted-foreground">
              {label} — not uploaded (optional)
            </span>
          </span>
        </li>
      );
    }
    return (
      <li className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-surface px-3 py-2.5">
        <span className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm text-muted-foreground">
            {label} — not uploaded {optional ? "(optional)" : "yet"}
          </span>
        </span>
        <Link
          to="/dashboard/passport/edit"
          hash={stepHash}
          className="shrink-0 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground transition hover:bg-secondary"
        >
          Add
        </Link>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
      <span className="flex items-center gap-2 min-w-0">
        <Icon className="h-4 w-4 shrink-0 text-verified" />
        <span className="min-w-0">
          <span className="block truncate font-display text-sm font-semibold tracking-tight text-foreground">
            {label}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">{filename}</span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="hidden rounded-full bg-verified-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-verified sm:inline-block">
          Self-Certified
        </span>
        <button
          type="button"
          onClick={onView}
          disabled={opening}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground transition hover:bg-secondary disabled:opacity-60"
        >
          {opening ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ExternalLink className="h-3 w-3" />
          )}
          View
        </button>
      </span>
    </li>
  );
}