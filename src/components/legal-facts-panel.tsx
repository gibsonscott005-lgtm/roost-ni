import {useState} from "react";
import {useServerFn} from "@tanstack/react-start";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {Check,Pencil,X,RefreshCw,Mail,CalendarClock,Save} from "lucide-react";
import {Button} from "@/components/ui/button";
import {getLegalReview,reviewLegalFact,checkLegalSourceNow,setLegalMonitor} from "@/lib/legal-facts.functions";
import {eligibleLegalFacts} from "@/lib/legal-fact-rules";
const date=(value:string|null)=>value?new Date(value).toLocaleString("en-GB"):"Not verified";
export function LegalFactsPanel() {
  const get=useServerFn(getLegalReview),review=useServerFn(reviewLegalFact),check=useServerFn(checkLegalSourceNow),settings=useServerFn(setLegalMonitor),cache=useQueryClient();
  const {data,isPending,error}=useQuery({queryKey:["legal-review"],queryFn:()=>get()});
  const [filter,setFilter]=useState("needs_review"),[busy,setBusy]=useState(false),[editing,setEditing]=useState<string|null>(null),[text,setText]=useState(""),[sourceUrl,setSourceUrl]=useState("");
  const run=async(task:()=>Promise<unknown>)=>{setBusy(true);try{await task();await cache.invalidateQueries({queryKey:["legal-review"]});}catch(e){toast.error(e instanceof Error?e.message:"Review failed");}finally{setBusy(false);}};
  if(isPending) return <p>Loading legal facts…</p>;
  if(error || !data) return <p role="alert">{error?.message ?? "Could not load facts."}</p>;
  const eligible=eligibleLegalFacts(data.facts);
  const facts=data.facts.filter(f=>filter==="all" || filter==="rejected"?filter==="all" || Boolean(f.rejected_at):filter==="approved"?eligible.some(e=>e.id===f.id):!f.rejected_at&&!eligible.some(e=>e.id===f.id));
  return <section className="space-y-6">
    <div className="flex flex-wrap gap-3 items-center"><Button variant="outline" disabled={busy} onClick={()=>void run(()=>settings({data:{enableSchedule:true}}))}><CalendarClock/>{data.scheduleActive?"Weekly checks enabled":"Enable weekly checks"}</Button><label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={data.emailEnabled} disabled={busy} onChange={e=>void run(()=>settings({data:{emailEnabled:e.target.checked}}))}/><Mail className="size-4"/>Email me: scott@roostni.co.uk</label></div>
    <p className="text-sm text-muted-foreground">Weekly checks: Monday, 08:17 UTC. Alerts are sent when a change is detected. Notice-to-quit changes are marked urgent.</p>
    <div className="flex gap-2 flex-wrap">{[["needs_review","Needs review"],["approved","Approved"],["rejected","Rejected"],["all","All facts"]].map(([value,label])=><Button key={value} variant={filter===value?"default":"outline"} onClick={()=>setFilter(value)}>{label}</Button>)}</div>
    <p className="text-sm">{facts.length} facts · {eligible.length} available to Robin</p>
    <ul className="space-y-4">{facts.map(f=>{const source=data.sources.find(s=>s.source_url===f.source_url);return <li key={f.id} className="border border-border p-4 space-y-3">
      <h2 className="font-semibold text-lg">{f.topic}</h2><p className="text-xs font-semibold text-verified">{f.rejected_at?"Rejected":eligible.some(e=>e.id===f.id)?"Approved":"Needs review"}{source?.notice_to_quit?" · Notice to quit — explicit approval required":""}</p>
      {editing===f.id?<><label className="block text-sm">Fact<textarea className="w-full border border-border bg-surface p-3" value={text} rows={4} onChange={e=>setText(e.target.value)}/></label><label className="block text-sm">Source<select className="w-full border border-border bg-surface p-2" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)}>{data.sources.map(s=><option key={s.id} value={s.source_url}>{s.title}</option>)}</select></label></>:<p className="text-sm whitespace-pre-wrap">{f.fact_text}</p>}
      <a href={f.source_url} target="_blank" rel="noreferrer" className="block break-all text-sm underline">{f.source_url}</a><p className="text-xs">Verified: {date(f.last_verified_at)} · Source checked: {date(source?.last_checked_at ?? null)}</p>
      <p className="text-xs text-muted-foreground">{source?.confirmed_at?"Source opened successfully":"URL unconfirmed"}</p>
      {f.change_summary?<p className="text-sm border-l-2 border-verified pl-3">{f.change_summary}</p>:null}{source?.check_error?<p role="alert" className="text-sm">{source.check_error}</p>:null}
      <div className="flex flex-wrap gap-2">{editing===f.id?<><Button disabled={busy} onClick={()=>void run(async()=>{await review({data:{id:f.id,revision:f.revision,action:"edit",factText:text,sourceUrl}});setEditing(null);toast.success("Saved for review — not approved");})}><Save/>Save for review</Button><Button variant="outline" onClick={()=>setEditing(null)}>Cancel</Button></>:<><Button disabled={busy} onClick={()=>{if(window.confirm("I have checked this exact fact against the source and approve it for Robin. Approve?"))void run(async()=>{await review({data:{id:f.id,revision:f.revision,action:"approve"}});toast.success("Fact approved");});}}><Check/>Approve</Button><Button variant="outline" disabled={busy} onClick={()=>{setEditing(f.id);setText(f.fact_text);setSourceUrl(f.source_url);}}><Pencil/>Edit</Button><Button variant="outline" disabled={busy} onClick={()=>void run(()=>review({data:{id:f.id,revision:f.revision,action:"reject"}}))}><X/>Reject</Button></>}{source?<Button variant="outline" disabled={busy} onClick={()=>void run(async()=>{const result=await check({data:{id:source.id}});if(result.error)toast.error(result.error);else toast.success(result.changed?"Source changed — facts need review":"Source checked; facts still need your approval");})}><RefreshCw/>Check source</Button>:null}</div>
    </li>;})}</ul>
    <div className="border-t border-border pt-5 space-y-3"><h2 className="text-xl font-semibold">Monitored sources</h2>{data.sources.map(s=><div key={s.id} className="space-y-1 border-b border-border pb-3"><p className="font-semibold">{s.title}</p><a className="block break-all text-xs underline" href={s.source_url} target="_blank" rel="noreferrer">{s.source_url}</a><p className="text-xs">{s.confirmed_at?`Opened: ${date(s.confirmed_at)}`:"Unconfirmed URL — check manually"}</p>{s.check_error?<p className="text-xs">{s.check_error}</p>:null}<Button size="sm" variant="outline" disabled={busy} onClick={()=>void run(()=>check({data:{id:s.id}}))}><RefreshCw/>Check source</Button></div>)}</div>
  </section>;
}