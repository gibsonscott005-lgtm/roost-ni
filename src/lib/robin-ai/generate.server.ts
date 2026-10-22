import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server.ts";

const legalSchema = z.object({ statement: z.string(), source: z.string(), flag: z.enum(["check before posting"]) });
export const draftSchema = z.object({ group_id: z.string(), persona: z.string(), angle: z.string(), topic: z.string(), body: z.string(), link_url: z.string().nullable(), legal_statements: z.array(legalSchema), review_flags: z.array(z.string()) });
export const replySchema = z.object({ body: z.string(), legal_statements: z.array(legalSchema), review_flags: z.array(z.string()) });
export async function generateRobinOutput<T extends z.ZodType>(key: string, instructions: string, prompt: string, schema: T, legal = false) {
  const provider = createOpenAI({ baseURL: "https://ai.gateway.lovable.dev/v1", apiKey: key, headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }, fetch: createLovableAiGatewayRunIdFetch().fetch });
  // Astra is the catalogue's most capable OpenAI reasoning model; no optional output cap.
  const result = streamText({ model: provider.responses("openai/gpt-6-astra"), instructions, prompt,
    output: Output.object({ schema }), maxRetries: 0,
    providerOptions: { openai: { forceReasoning: true, reasoningEffort: legal ? "high" : "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
  });
  return await result.output;
}
export async function generateOrdinaryWeek(key: string, instructions: string, prompt: string) {
  return generateRobinOutput(key, instructions, prompt, z.object({ posts: z.array(draftSchema) }));
}
