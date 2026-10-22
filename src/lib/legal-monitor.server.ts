import { readLegalSource } from "./legal-source-reader.server";
import { summariseSourceChange } from "./legal-fact-rules";
import { sendTemplateEmail } from "./email-templates/send-email";

export async function checkLegalSource(sourceId:string) {
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const {data:source,error}=await supabaseAdmin.from("legal_sources").select("*").eq("id",sourceId).single();
  if(error || !source) throw new Error("Source not found.");
  let page;
  try { page=await readLegalSource(source.source_url); }
  catch(error) {
    const message=error instanceof Error?error.message:"Source check failed.";
    const {error:sourceError}=await supabaseAdmin.from("legal_sources").update({check_error:message,last_checked_at:new Date().toISOString()}).eq("id",sourceId);
    if(sourceError) throw new Error(sourceError.message);
    // Unreadable sources fail closed; never refresh a human verification date.
    const {error:factError}=await supabaseAdmin.from("legal_facts").update({status:"needs_review",change_summary:message}).eq("source_url",source.source_url);
    if(factError) throw new Error(factError.message);
    if(message!==source.check_error) await alert(source.title,source.source_url,message,source.notice_to_quit,`source-error-${source.id}-${source.page_hash ?? "initial"}-${message}`);
    return {changed:false,error:message};
  }
  const summary=summariseSourceChange(source.page_text ?? "",page.text);
  const {data:changed,error:writeError}=await supabaseAdmin.rpc("record_legal_source_check",{p_id:source.id,p_expected_hash:source.page_hash ?? "",p_text:page.text,p_hash:page.hash,p_summary:summary});
  if(writeError) throw new Error(writeError.message);
  if(changed) await alert(source.title,source.source_url,summary,source.notice_to_quit,`source-change-${source.id}-${source.page_hash}-${page.hash}`);
  return {changed:Boolean(changed),resolvedUrl:page.resolvedUrl};
}
async function alert(title:string,sourceUrl:string,summary:string,urgent:boolean,eventId:string) {
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const {data,error}=await supabaseAdmin.from("legal_monitor_settings").select("email_enabled").eq("id",true).maybeSingle();
  if(error) throw new Error(error.message);
  if(data?.email_enabled===false) return;
  // One source-change event, one fixed owner recipient. No campaign/list sending.
  await sendTemplateEmail("legal-source-changed","scott@roostni.co.uk",{templateData:{title,sourceUrl,summary,urgent},idempotencyKey:eventId});
}