import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** New RoostNI tenancies: record the date the tenancy information notice was given so its reminders stop. */
export function TinGivenPanel({ shareId }: { shareId: string }) {
  const [date, setDate] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase
      .from("passport_shares")
      .select("tin_given_at")
      .eq("id", shareId)
      .maybeSingle()
      .then(({ data }) => {
        const v = (data as { tin_given_at: string | null } | null)?.tin_given_at ?? null;
        setSaved(v);
        setDate(v ?? "");
      });
  }, [shareId]);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("passport_shares")
      .update({ tin_given_at: date || null } as never)
      .eq("id", shareId);
    setBusy(false);
    if (error) return toast.error("Couldn't save", { description: error.message });
    setSaved(date || null);
    toast.success(date ? "Notice date saved. Reminders stop." : "Date cleared");
  };

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-sm border-2 border-foreground p-4">
      <label className="grid gap-1 text-sm">
        <span className="font-semibold">Date tenancy information notice given</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-sm border border-border bg-surface px-3 py-2"
        />
      </label>
      <button
        type="button"
        onClick={() => void save()}
        disabled={busy || date === (saved ?? "")}
        className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save date"}
      </button>
      <p className="w-full text-xs text-muted-foreground">
        {saved ? `Recorded as given on ${new Date(saved).toLocaleDateString("en-GB")}.` : "RoostNI reminds you until a date is saved."}
      </p>
    </div>
  );
}
