import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, Save, Sparkles, Copy, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRobinGroups, saveRobinGroups, generateRobinDrafts, draftRobinReply } from "@/lib/robin.functions";
import { combinationResults, type RobinGroup } from "@/lib/robin-groups";
import type { MarketingPost } from "@/lib/marketing.functions";
import type { MarketingReview } from "@/lib/marketing-knowledge";

const field = "w-full border border-border bg-surface px-3 py-2 text-sm text-foreground";
export function RobinGroupsPanel({ brief, focus, posts, onDrafted }: { brief: string; focus: "mixed"|"landlord"|"tenant"|"ni_legal"|"reddit"; posts: MarketingPost[]; onDrafted: () => Promise<void> }) {
  const fetchGroups = useServerFn(getRobinGroups), saveGroups = useServerFn(saveRobinGroups), draft = useServerFn(generateRobinDrafts), replyFn = useServerFn(draftRobinReply);
  const [groups,setGroups] = useState<RobinGroup[]>([]), [selected,setSelected] = useState<string[]>([]), [ready,setReady] = useState(false);
  const [busy,setBusy] = useState(false), [comment,setComment] = useState(""), [reply,setReply] = useState<{ body:string; review:MarketingReview }|null>(null), [replyBusy,setReplyBusy] = useState(false);
  useEffect(() => { void fetchGroups({ data:undefined }).then(rows => { setGroups(rows); setSelected(rows.map(g=>g.id)); setReady(true); }).catch(e=>toast.error(e.message)); },[fetchGroups]);
  const update = (id:string, patch:Partial<RobinGroup>) => setGroups(rows=>rows.map(g=>g.id===id?{...g,...patch}:g));
  const save = async () => { await saveGroups({ data:groups }); };
  const queued = posts.filter(p => p.platform === "facebook" && (p.status === "draft" || p.status === "scheduled")).length;
  const generate = async (week:boolean, replace = false) => {
    if (focus === "reddit") return;
    if (replace && !window.confirm(`Remove all ${queued} unposted Facebook post${queued===1?"":"s"} from the queue and replace them with fresh drafts from the current brief?`)) return;
    setBusy(true);
    try { await save(); const result = await draft({ data:{ brief:brief.trim()||undefined, focus, groupIds:selected, week, replace } }); toast.success(replace ? `${result.removed} old post${result.removed===1?"":"s"} removed, ${result.created.length} new drafts saved — nothing posted` : `${result.created.length} drafts saved — nothing posted`); await onDrafted(); }
    catch(e) { toast.error(e instanceof Error?e.message:"Could not draft posts", { description: replace ? "Your existing queue was left as it was." : undefined }); } finally { setBusy(false); }
  };
  const results = combinationResults(posts);
  const leaders = (key:"audits"|"alerts"|"signups") => {
    const best=Math.max(0,...results.map(r=>r[key]));
    return best ? results.filter(r=>r[key]===best).map(r=>`${r.name} · ${r.placement} · ${r.postAs} (${best})`).join("; ") : "No attributed conversions yet";
  };
  return <section className="space-y-5 border-t border-border pt-5">
    <h3 className="text-lg font-semibold">Facebook groups</h3>
    {groups.map(g=><div key={g.id} className="border border-border p-3 space-y-3">
      <div className="flex items-center gap-3"><input aria-label={`Select ${g.name}`} type="checkbox" checked={selected.includes(g.id)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,g.id]:ids.filter(id=>id!==g.id))}/><input aria-label="Group name" className={field} value={g.name} onChange={e=>update(g.id,{name:e.target.value})}/><Button variant="ghost" size="icon" title="Remove group" aria-label={`Remove ${g.name}`} onClick={()=>{setGroups(rows=>rows.filter(row=>row.id!==g.id));setSelected(ids=>ids.filter(id=>id!==g.id));}}><Trash2/></Button></div>
      <label className="block text-xs">Local places<input className={field} value={g.places} onChange={e=>update(g.id,{places:e.target.value})}/></label>
      <label className="block text-xs">Audience<input className={field} value={g.audience} onChange={e=>update(g.id,{audience:e.target.value})}/></label>
      <label className="block text-xs">What has worked<textarea className={field} value={g.worked} onChange={e=>update(g.id,{worked:e.target.value})}/></label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs">Link placement<select className={field} value={g.linkPlacement} onChange={e=>update(g.id,{linkPlacement:e.target.value as RobinGroup["linkPlacement"]})}><option>in body</option><option>first comment</option></select></label>
        <label className="text-xs">Post as<select className={field} value={g.postAs} onChange={e=>update(g.id,{postAs:e.target.value as RobinGroup["postAs"]})}><option>Page</option><option>personal profile</option></select></label>
        <label className="text-xs">Posts per week<input className={field} type="number" min={1} max={7} value={g.weeklyCount} onChange={e=>update(g.id,{weeklyCount:Number(e.target.value)})}/></label>
      </div>
    </div>)}
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={()=>{const id=crypto.randomUUID();setGroups(rows=>[...rows,{id,name:"New group",places:"",audience:"Local renters and landlords",worked:"No confirmed results yet",linkPlacement:"first comment",postAs:"personal profile",weeklyCount:3}]);setSelected(ids=>[...ids,id]);}}><Plus/>Add group</Button>
      <Button variant="outline" disabled={!ready||busy} onClick={()=>void save().then(()=>toast.success("Group settings saved")).catch(e=>toast.error(e.message))}><Save/>Save groups</Button>
      <Button disabled={!ready||busy||!selected.length||focus==="reddit"} onClick={()=>void generate(false)}>{busy?<Loader2 className="animate-spin"/>:<Sparkles/>}Draft selected groups</Button>
      <Button disabled={!ready||busy||!selected.length||focus==="reddit"} onClick={()=>void generate(true)}><Sparkles/>Draft full week</Button>
    </div>
    <div className="flex flex-wrap gap-2 border-t border-border pt-3">
      <p className="w-full text-xs text-muted-foreground">Changed the brief? Re-draft removes every unposted Facebook post ({queued}) and replaces it. Reddit drafts are left alone. Old posts stay until the new ones are saved.</p>
      <Button variant="outline" disabled={!ready||busy||!selected.length||focus==="reddit"||!queued} onClick={()=>void generate(false,true)}><RefreshCw/>Re-draft today</Button>
      <Button variant="outline" disabled={!ready||busy||!selected.length||focus==="reddit"||!queued} onClick={()=>void generate(true,true)}><RefreshCw/>Re-draft week</Button>
    </div>
    <div className="border-t border-border pt-4 space-y-2"><h3 className="text-lg font-semibold">Group results</h3>
      <p className="text-xs">Most audits: {leaders("audits")}</p><p className="text-xs">Most alerts: {leaders("alerts")}</p><p className="text-xs">Most sign-ups: {leaders("signups")}</p>
      {results.length>0?<div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr>{["Group / placement / post as","Posted","Audits","Alerts","Sign-ups"].map(label=><th key={label} className="p-2 text-left">{label}</th>)}</tr></thead><tbody>{results.map(r=><tr key={`${r.name}-${r.placement}-${r.postAs}`}><td className="p-2">{r.name} / {r.placement} / {r.postAs}</td><td>{r.posts}</td><td>{r.audits}</td><td>{r.alerts}</td><td>{r.signups}</td></tr>)}</tbody></table></div>:null}
    </div>
    <div className="border-t border-border pt-4 space-y-3"><h3 className="text-lg font-semibold">Reply helper</h3>
      <label className="block text-xs">Comment<textarea className={field} rows={3} maxLength={4000} value={comment} onChange={e=>setComment(e.target.value)}/></label>
      <Button disabled={replyBusy||!comment.trim()} onClick={async()=>{setReplyBusy(true);setReply(null);try{setReply(await replyFn({data:{comment,groupId:selected[0]}}));}catch(e){toast.error(e instanceof Error?e.message:"Could not draft reply");}finally{setReplyBusy(false);}}}>{replyBusy?<Loader2 className="animate-spin"/>:<Sparkles/>}Draft reply</Button>
      {reply?<div className="space-y-2 border-l-2 border-verified pl-3"><p className="whitespace-pre-wrap text-sm">{reply.body}</p><p className="text-xs font-semibold">Check before posting</p>{reply.review.legal_statements.map((item,i)=><div key={i} className="text-xs"><p>{item.statement}</p><a className="break-all underline" href={item.source} target="_blank" rel="noreferrer">{item.source}</a><p>Verified: {item.verified_at ? new Date(item.verified_at).toLocaleDateString("en-GB") : "Not verified"} · {item.flag}</p></div>)}{reply.review.review_flags.includes("verify before posting")?<p className="text-xs">Verify before posting</p>:null}<Button variant="outline" onClick={()=>void navigator.clipboard.writeText(reply.body).then(()=>toast.success("Reply copied"))}><Copy/>Copy reply</Button></div>:null}
    </div>
  </section>;
}