import {createServerFn} from "@tanstack/react-start";
import {requireSupabaseAuth} from "@/integrations/supabase/auth-middleware";
import {z} from "zod";
import {validateLegalSourceUrl} from "./legal-source-url";

export const getLegalReview=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {requireLegalAdmin}=await import("./legal-facts.server"); await requireLegalAdmin(context.supabase,context.userId);
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const [facts,sources,settings,schedule]=await Promise.all([supabaseAdmin.from("legal_facts").select("*").order("topic"),supabaseAdmin.from("legal_sources").select("id,title,source_url,notice_to_quit,confirmed_at,last_checked_at,change_summary,check_error,page_hash").order("title"),supabaseAdmin.from("legal_monitor_settings").select("email_enabled").eq("id",true).maybeSingle(),supabaseAdmin.rpc("legal_monitor_active")]);
  for(const result of [facts,sources,settings,schedule]) if(result.error) throw new Error(result.error.message);
  return {facts:facts.data ?? [],sources:sources.data ?? [],emailEnabled:settings.data?.email_enabled ?? true,scheduleActive:schedule.data ?? false};
});
export const reviewLegalFact=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((data:unknown)=>z.object({id:z.string().uuid(),revision:z.number().int(),action:z.enum(["approve","edit","reject"]),factText:z.string().min(1).max(4000).optional(),sourceUrl:z.string().url().optional()}).parse(data)).handler(async({context,data})=>{
  const {requireLegalAdmin}=await import("./legal-facts.server"); await requireLegalAdmin(context.supabase,context.userId);
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const {data:fact,error}=await supabaseAdmin.from("legal_facts").select("*").eq("id",data.id).single(); if(error || !fact) throw new Error("Fact not found.");
  if(fact.revision!==data.revision) throw new Error("This fact changed since you opened it. Refresh before reviewing.");
  let sourceUrl=fact.source_url;
  if(data.sourceUrl) { const {validateLegalSourceUrl}=await import("./legal-source-reader.server"); sourceUrl=validateLegalSourceUrl(data.sourceUrl); }
  if(data.action==="approve") {
    const {error:approvalError}=await supabaseAdmin.rpc("approve_legal_fact",{p_id:data.id,p_revision:data.revision});
    if(approvalError) throw new Error(approvalError.message);
    return {ok:true};
  }
  if(data.action==="edit" && (!data.factText || !data.sourceUrl)) throw new Error("Provide the fact and source when editing.");
  const {data:updated,error:writeError}=await supabaseAdmin.from("legal_facts").update({fact_text:data.action==="edit"?data.factText:fact.fact_text,source_url:sourceUrl,status:"needs_review",last_verified_at:null,rejected_at:data.action==="reject"?new Date().toISOString():null,change_summary:data.action==="reject"?"Rejected by owner.":null,revision:fact.revision+1,updated_at:new Date().toISOString()}).eq("id",data.id).eq("revision",data.revision).select("id");
  if(writeError) throw new Error(writeError.message); if(!updated?.length) throw new Error("Fact changed during review. Refresh and try again."); return {ok:true};
});
export const checkLegalSourceNow=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((data:unknown)=>z.object({id:z.string().uuid()}).parse(data)).handler(async({context,data})=>{
  const {requireLegalAdmin}=await import("./legal-facts.server"); await requireLegalAdmin(context.supabase,context.userId);
  const {checkLegalSource}=await import("./legal-monitor.server"); return checkLegalSource(data.id);
});
export const setLegalMonitor=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((data:unknown)=>z.object({emailEnabled:z.boolean().optional(),enableSchedule:z.boolean().optional()}).parse(data)).handler(async({context,data})=>{
  const {requireLegalAdmin}=await import("./legal-facts.server"); await requireLegalAdmin(context.supabase,context.userId);
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  if(data.emailEnabled!==undefined) { const {error}=await supabaseAdmin.from("legal_monitor_settings").upsert({id:true,email_enabled:data.emailEnabled}); if(error) throw new Error(error.message); }
  if(data.enableSchedule) {
    const secret=process.env["LEGAL_CHECK_SECRET"]; if(!secret) throw new Error("Source checker secret is missing.");
    const {error}=await supabaseAdmin.rpc("configure_legal_monitor",{p_url:"https://project--3c824cd3-0aa5-4893-b5b1-e9fa152e7e39.lovable.app/api/public/robin/legal-check",p_secret:secret}); if(error) throw new Error(error.message);
  }
  return {ok:true};
});