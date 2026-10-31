import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readGroupSnapshot } from "@/lib/robin-groups";
import { saveMarketingResults, type MarketingEngineData, type MarketingPost, type PostResult } from "@/lib/marketing.functions";

const field = "w-full border border-border bg-surface px-2 py-1 text-xs text-foreground";
const NUMBERS = [["reach", "Reach"], ["reactions", "Reactions"], ["comments", "Comments"], ["shares", "Shares"], ["linkClicks", "Link clicks"]] as const;

export function latestResult(results: PostResult[], postId: string): PostResult | undefined {
  return results.filter(r => r.post_id === postId).at(-1);
}

export function ResultsForm({ post, onSaved }: { post: MarketingPost; onSaved: () => Promise<void> }) {
  const save = useServerFn(saveMarketingResults);
  const draftKey = `roost_results_draft_${post.id}`;
  const [busy, setBusy] = useState(false);
  const [groupName, setGroupName] = useState(readGroupSnapshot(post.notes)?.name ?? "");
  const [values, setValues] = useState<Record<string, string>>({});
  const [restored, setRestored] = useState(false);
  // Restore typed figures after a tab switch or reload.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw) as { groupName?: string; values?: Record<string, string> };
        if (d.values) setValues(d.values);
        if (d.groupName) setGroupName(d.groupName);
      }
    } catch { /* ignore */ }
    setRestored(true);
  }, [draftKey]);
  useEffect(() => {
    if (!restored) return;
    try { localStorage.setItem(draftKey, JSON.stringify({ groupName, values })); } catch { /* ignore */ }
  }, [restored, draftKey, groupName, values]);
  const submit = async () => {
    setBusy(true);
    try {
      const n = (k: string) => Math.max(0, Math.floor(Number(values[k] ?? 0) || 0));
      await save({ data: { postId: post.id, groupName: groupName.trim() || "Unknown group", reach: n("reach"), reactions: n("reactions"), comments: n("comments"), shares: n("shares"), linkClicks: n("linkClicks") } });
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      toast.success("Results saved");
      await onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save results"); }
    setBusy(false);
  };
  return <div className="mt-2 w-full space-y-2 border-2 border-foreground p-2">
    <p className="text-[11px] font-semibold uppercase tracking-wide">Enter results</p>
    <label className="block text-[11px]">Group<input className={field} value={groupName} onChange={e => setGroupName(e.target.value)} /></label>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {NUMBERS.map(([k, label]) => <label key={k} className="text-[11px]">{label}<input className={field} inputMode="numeric" type="number" min={0} value={values[k] ?? ""} onChange={e => setValues(v => ({ ...v, [k]: e.target.value }))} /></label>)}
    </div>
    <Button size="sm" disabled={busy} onClick={() => void submit()}>{busy ? <Loader2 className="animate-spin" /> : <Check />}Save results</Button>
  </div>;
}

export function RobinOverview({ data }: { data: MarketingEngineData }) {
  const posted = data.posts.filter(p => p.status === "posted" && p.platform === "facebook");
  const missing = posted.filter(p => !latestResult(data.results, p.id));
  const r = data.review;
  return <div className="space-y-4">
    <div className="border-2 border-foreground p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Founding places left</p>
      <p className="font-display text-3xl font-bold">{data.foundingPlacesLeft} <span className="text-base font-semibold">of 20</span></p>
      <p className="text-xs text-muted-foreground">Live count of landlords who have added a home, tenanted or vacant. Your own test accounts are left out. Robin uses this number in founding posts.</p>
    </div>
    {missing.length > 0 ? <div role="alert" className="border-2 border-destructive bg-destructive/10 p-3 text-xs">
      <p className="font-semibold text-destructive">Results missing on {missing.length} posted post{missing.length === 1 ? "" : "s"}</p>
      <p className="mt-1">This reminder shows every day until you fill them in below: {missing.slice(0, 5).map(p => p.topic).join(" · ")}{missing.length > 5 ? " …" : ""}</p>
    </div> : null}
    {r ? <div className="border-2 border-foreground p-3 text-xs">
      <p className="text-[11px] font-semibold uppercase tracking-wide">Weekly summary (week to Sunday {new Date(`${r.week_start}T12:00:00Z`).toLocaleDateString("en-GB")})</p>
      <p className="mt-2 font-semibold">What worked</p>{r.worked.length ? <ul className="list-disc pl-4">{r.worked.map(w => <li key={w}>{w}</li>)}</ul> : <p className="text-muted-foreground">Too little data to call a win yet.</p>}
      <p className="mt-2 font-semibold">What to stop</p>{r.stop.length ? <ul className="list-disc pl-4">{r.stop.map(w => <li key={w}>{w}</li>)}</ul> : <p className="text-muted-foreground">Nothing proven to stop yet.</p>}
      <p className="mt-2 font-semibold">Next week's plan</p><ul className="list-disc pl-4">{r.next_plan.map(w => <li key={w}>{w}</li>)}</ul>
      {r.missing_results.length ? <p className="mt-2 font-semibold text-destructive">{r.missing_results.length} post{r.missing_results.length === 1 ? "" : "s"} from that week had no results entered.</p> : null}
    </div> : null}
    <div className="border-2 border-foreground p-3 text-xs">
      <p className="text-[11px] font-semibold uppercase tracking-wide">Visits by campaign</p>
      {data.campaignVisits.length ? <table className="mt-2 w-full"><tbody>{data.campaignVisits.slice(0, 20).map(v => <tr key={v.utm_campaign} className="border-t border-border"><td className="break-all py-1 pr-2">{v.utm_campaign}</td><td className="text-right font-semibold">{v.visits}</td></tr>)}</tbody></table> : <p className="mt-1 text-muted-foreground">No tracked visits yet.</p>}
    </div>
  </div>;
}
