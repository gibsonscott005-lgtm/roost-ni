import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { eligibleLegalFacts } from "./legal-fact-rules";

export async function getApprovedLegalFacts(client: SupabaseClient<Database>) {
  const { data,error } = await client.from("legal_facts").select("*").eq("status","approved").is("rejected_at",null).gte("last_verified_at",new Date(Date.now()-90*86400000).toISOString());
  if(error) throw new Error(error.message);
  return eligibleLegalFacts(data ?? []);
}
export async function requireLegalAdmin(client: SupabaseClient<Database>, userId:string) {
  // Existing protected, non-self-editable admin membership; never trust browser state.
  const {data,error}=await client.from("profiles").select("account_type").eq("id",userId).maybeSingle();
  if(error || data?.account_type!=="admin") throw new Error("Forbidden");
}