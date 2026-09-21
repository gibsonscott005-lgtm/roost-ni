import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const saveSchema = z.object({
  email: z.string().email().max(200),
  contactName: z.string().max(120).optional(),
  propertyCount: z.string().max(40).optional(),
  score: z.number().int().min(0).max(100),
  band: z.string().max(60),
  answers: z.record(z.string(), z.string().max(40)),
  gaps: z.array(z.string().max(300)).max(40),
  utm: z.record(z.string(), z.string().max(120)).optional(),
});

/**
 * Public: stores a completed compliance audit so the result can be emailed /
 * followed up. Runs with the publishable key against an anon INSERT policy —
 * no session required, nothing is read back.
 */
export const saveAuditResult = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => saveSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = createClient<Database>(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_PUBLISHABLE_KEY']!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { error } = await supabase.from("compliance_audits").insert({
      email: data.email.trim().toLowerCase(),
      contact_name: data.contactName?.trim() || null,
      property_count: data.propertyCount ?? null,
      score: data.score,
      band: data.band,
      answers: data.answers,
      gaps: data.gaps,
      utm: data.utm ?? {},
    });

    if (error) throw new Error(error.message);
    return { ok: true };
  });
