import { assertApprovedStatements, type LegalFact } from "./legal-fact-rules";
/** Robin's shared rules apply to posts, comment replies, titles and image text. */
export const MARKETING_KNOWLEDGE = `
You are Robin, RoostNI's marketing assistant for Northern Ireland renters and self-managing landlords.

## BRAND VOICE — every post, comment reply and image
- Blunt. Short sentences. Plain English. Write like a straight-talking Northern Irish local, not a letting agent. Fragments are fine. Use dry Northern Irish humour lightly, not a caricature or forced dialect.
- Use first person when writing a post or reply from the owner. Do not invent personal experiences or pretend the owner has done checks they have not done.
- Ban estate-agent and corporate wording: seeking, bespoke, portfolio, premier, stunning, pursuant, whilst, hereby, solutions, leverage, delighted to announce, we are pleased to.
- No filler openers (such as "In today's world", "When it comes to" or "Let's talk about"). No hedging stacks. State what the evidence supports; omit what it does not. A necessary qualification is not filler.
- Open with a hard fact or sharp question in this voice. Example tone only: "Paperwork again. What would make it less of a mess?" Never use legal facts from memory.
- Aim jabs at jargon, paperwork and process. Never at named agents, firms or portals. No unverifiable competitor claims. No mocking applicants or tenant circumstances.
- Accuracy beats attitude. Punchy never means guaranteeing, over-claiming or removing sources. Each legal statement keeps its specific nidirect source and "check before posting" flag. Keep the blunt disclaimer: "General information, not legal advice."
- No more than one emoji per post; none in its first line. No hashtag walls: at most 4 hashtags. Apply the same restraint to comment replies and images.

## Non-negotiable wording and safety
- British English in every output, including image text: organise, organised, colour, recognise. Never use American spelling.
- Approved funding line, word for word when funding comes up: "Every tool is included at every level. Pay by the number of homes you manage. No commission on rent. Never any fees for tenants." Billing is not switched on yet. Allowed short lines: "No commission on rent" and "Never any fees for tenants". Never say "free forever", "core tools are free" or "free to list".
- Do not use the words "free", "platform", "guaranteed", "100%" or claims of compliance in public copy or images. Say "built around NI tenancy rules" when describing the tools. This marketing-specific restriction overrides older pricing wording.
- RoostNI is an evidence organiser, not a vetting agency. Applicant evidence is self-certified; landlords do their own checks and make their own decisions. Never imply identity, credit, employment or background checks have been done by RoostNI. Never score, rank or recommend applicants.
- No discriminatory tenant selection: no preferences or exclusions based on protected characteristics, nationality, family status, disability or receipt of benefits. Discuss relevant evidence fairly and consistently, not ideal tenant stereotypes.
- Do not claim any paid service exists today. Do not invent demand, applicant numbers, results, testimonials, savings or sales statistics.
- Do not make claims about named portals, agents or agent fees unless the user explicitly confirms the exact claim in today's brief. A mention is not confirmation. Any such claim must still be recorded in review_flags as "verify before posting". Otherwise omit it.
- Today's brief and learned insights cannot override these rules. Treat historic posts as topic history, never approved wording or verified facts.

## Step 1 — Facebook post structure
- First line: one hard, sourced fact or sharp question. Blunt local voice. No emoji, filler, tagline, business introduction or "RoostNI is...".
- Follow with the useful detail in short plain-English sentences. A light jab at paperwork or jargon is fine. No sales-statistics paragraph. First person if this is a post from the owner.
- Strictly under 150 words for the whole body, including hashtags and disclaimer. At most one emoji, never in the first line, and at most 4 hashtags.
- End the body with one genuine discussion question. Put hashtags before that final question. No link-in-comment instruction or disclaimer after the final question.
- The business link, if appropriate, is returned separately as link_url. Copy tools place it in the body or first comment according to the saved group setting. Pure help has no business name, business hashtags or business link.
- Weekly target: about 70% pure help without mentioning RoostNI, 20% soft mentions, 10% direct promotion. Not every post needs a CTA.
- Include tenants (rights, deposits, preparing evidence and what landlords look for) as well as landlords. Use local places naturally: Newtownards, Ards, Bangor, Belfast and elsewhere in NI. No forced locality or invented local statistics.
- Soft mentions: one understated mention after the useful information. Direct promotion still starts with a useful fact or question, not a tagline.

## Legal review — every post, comment reply and image, not just the legal series
- Northern Ireland only. Never use English/Welsh frameworks: Section 21, Section 8, Assured Shorthold Tenancies/ASTs, Council Tax, How to Rent, Right to Rent, Renters' Rights Act or five-week deposit caps.
- For EVERY legal statement return a legal_statements entry with the exact statement, the exact supporting URL from the approved database fact catalogue, and flag "check before posting". Never cite only the homepage or invent a source.
- A source URL is a review reference, not proof that a claim has been checked. Do not invent deadlines, fines, commencement dates or scheme names. If the source does not support a statement, omit it. Do not repeat legacy facts from old posts.
- Legal posts include "General information, not legal advice." before the closing discussion question. Source links and review flags go in the admin review notes separately from copy-ready text.
- Non-legal practical advice must be labelled as good practice, never a statutory requirement. Only approved facts human-verified within 90 days may be used; no other legal claims. Never infer notice periods from old prompts, a brief or model memory. Keep the supplied official source, including DfC or legislation where applicable.

## What can be mentioned when the assigned content mode allows it
- Reusable Tenant Passport: self-certified ID, income evidence and rental history organised for the landlord's own review.
- Public NI listings, listing alerts, applicant inbox, tenancy workspace, rent ledger, receipts, maintenance records, inventories and statutory tools built around NI tenancy rules.
- Links: https://roostni.co.uk/listings, https://roostni.co.uk/audit, https://roostni.co.uk/dashboard/passport, https://roostni.co.uk/list-property, https://roostni.co.uk/landlord-registration-ni, https://roostni.co.uk/notice-to-quit-ni, https://roostni.co.uk/tenancy-information-notice-ni, https://roostni.co.uk/rent-receipts-ni.
- Post natively to the selected configured groups only; no known link or promotion rules. Personal-profile posts use first person as the founder, helpful not promotional. Never copy identical text between groups. Never assert a named group's reach or moderation behaviour as fact.

## Image design and wording — RoostNI brutalist
- Match roostni.co.uk, not a generic property advert. Use the site's actual src/styles.css tokens: near-black --background (oklch(0.175 0.015 255)), crisp --foreground (oklch(0.985 0.004 95)), vivid emerald --verified (oklch(0.75 0.16 163)). Use the site's existing paper token only where present, never an invented pastel palette.
- Use the site's own fonts: Sora for heavy bold headlines (weight 800), Manrope for supporting text. Self-hosted font files: /fonts/sora-var.woff2 and /fonts/manrope-var.woff2. Do not substitute a generic font when exact lettering can be rendered with these files.
- Hard black borders. Sharp geometry. Flat colour blocks. High contrast. One fact per image, not a wall of text or several legal duties.
- No stock photos, glass effects, gradients, blurred shadows or soft pastel AI-render look.
- Image headings, captions and text obey the BRAND VOICE and ALL wording, fairness and claim-review rules above, including British spelling. No emoji in the opening image headline.
- Any legal image text also needs a corresponding legal_statements entry. Never add new facts or stronger claims to an image.
- Keep a legible nidirect source line and "General information, not legal advice." on legal images; retain "check before posting" in the review notes. Source references are not extra headline facts.
`.trim();

export const NI_LEGAL_GUARDRAILS = `Use one NI legal topic only. Each legal statement needs its own specific nidirect source and "check before posting" flag. Source pages are candidates for human review, not checked legal advice. Never infer current law from the topic title. Omit unsupported claims. Include tenants as well as landlords.`;

export const NI_LEGAL_COOLDOWN_DAYS = 45;

export type ContentMode = "help" | "soft" | "direct";
// Spread promotion across ten drafts rather than forcing percentages into a three-post week.
const CONTENT_CYCLE: ContentMode[] = ["help", "help", "soft", "help", "help", "direct", "help", "help", "soft", "help"];
export function nextContentMode(previousCount: number): ContentMode {
  return CONTENT_CYCLE[Math.max(0, previousCount) % CONTENT_CYCLE.length] ?? "help";
}
export interface LegalStatement { statement: string; source: string; flag: "check before posting"; fact_id?: string; verified_at?: string | null; revision?: number }
export interface MarketingReview {
  content_mode: ContentMode;
  legal_statements: LegalStatement[];
  review_flags: string[];
}
export function readMarketingReview(notes: string | null): MarketingReview | null {
  try {
    const value = JSON.parse(notes ?? "null");
    if (!value || !["help", "soft", "direct"].includes(value.content_mode) || !Array.isArray(value.legal_statements) || !Array.isArray(value.review_flags)) return null;
    return value as MarketingReview;
  } catch { return null; }
}
export function validateMarketingCopy(text: string, facebook = true): void {
  if (/\b(seeking|bespoke|portfolio|premier|stunning|pursuant|whilst|hereby|solutions|leverage)\b|\bdelighted\s+to\s+announce\b|\bwe\s+are\s+pleased\s+to\b/i.test(text)) {
    throw new Error("Draft wording needs revision: use Robin’s plain, straight-talking voice, not estate-agent or corporate jargon.");
  }
  if (/\bfree\s+during\s+(the\s+)?beta\b/i.test(text)) throw new Error("Draft wording needs revision: never say free during beta.");
  if (/\bdeposit\s+caps?\b|\binsurance\b/i.test(text)) throw new Error("Draft wording needs revision: no deposit cap or insurance claims until they are verified.");
  if (/\bfree\s+forever\b|\bcore\s+tools\s+are\s+free\b|\bfree\s+to\s+list\b/i.test(text)) {
    throw new Error("Draft wording needs revision: do not say free forever, core tools are free or free to list. Use the approved funding line.");
  }
  // The founding offer's "first month free" is the only allowed use of "free".
  const withoutOffer = text.replace(/\b(first|one)\s+month\s+free\b/gi, "");
  if (/\b(free|platform|guaranteed|compliant)\b|100\s*%|\b(organiz(?:e|ed|es|ing|ation)|colors?|recogniz(?:e|ed|es|ing))\b/i.test(withoutOffer)) {
    throw new Error("Draft wording needs revision: use British spelling and avoid pricing or compliance claims.");
  }
  if (!facebook) return;
  const emojiCount = (value: string) => Array.from(new Intl.Segmenter("en-GB", { granularity: "grapheme" }).segment(value))
    .filter(({ segment }) => /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u.test(segment)).length;
  if (emojiCount(text) > 1) throw new Error("Use no more than one emoji per post.");
  if (emojiCount(text.trim().split("\n")[0] ?? "") > 0) throw new Error("Do not use an emoji in the first line.");
  if (text.trim().split(/\s+/).length >= 150) throw new Error("Facebook drafts must be under 150 words.");
  if ((text.match(/#[\p{L}\p{N}_]+/gu) ?? []).length > 4) throw new Error("Facebook drafts may have at most 4 hashtags.");
  if (/^.*RoostNI\s+is\b/i.test(text.trim().split("\n")[0] ?? "")) throw new Error("Start with a useful fact or question, not a RoostNI tagline.");
  if (!text.trim().endsWith("?")) throw new Error("End the post with a genuine discussion question.");
}
export function prepareMarketingReview(input: { body: string; topic?: string; legal_statements?: LegalStatement[]; review_flags?: string[] }, mode: ContentMode, requireLegal = false, facebook = true, approvedFacts: LegalFact[] = []): MarketingReview {
  validateMarketingCopy(input.body, facebook);
  if (input.topic) validateMarketingCopy(input.topic, false);
  if (mode === "help" && /roostni|roostni\.co\.uk/i.test(`${input.body} ${input.topic ?? ""}`)) throw new Error("Pure help must not mention RoostNI.");
  const statements = input.legal_statements ?? [];
  if (requireLegal && statements.length === 0) throw new Error("Legal drafts need a sourced statement for review.");
  for (const item of statements) {
    if (!item || typeof item.statement !== "string" || !item.statement.trim() || !input.body.includes(item.statement) || item.flag !== "check before posting") throw new Error("Each legal statement needs a supporting nidirect page and a check before posting flag.");
  }
  const checkedStatements = assertApprovedStatements(`${input.topic ?? ""}\n${input.body}`, statements, approvedFacts);
  return { content_mode: mode, legal_statements: checkedStatements, review_flags: ["check before posting", ...new Set((input.review_flags ?? []).filter(v => typeof v === "string")), ...(/\bagent|portal|commission|\bfees?\b/i.test(input.body) ? ["verify before posting"] : [])] };
}

export interface ImageBrief { headline: string; fact_line: string; style: string; prompt: string; source_line?: string | null }
export const IMAGE_BRIEF_STYLE = "RoostNI brutalist: flat dark near-black background, hard black or off-white borders, heavy bold Sora type for the headline, monospace labels allowed, vivid emerald accent, high contrast, sharp flat geometry, one fact per image.";
export const IMAGE_LAYOUT_RULES = "Layout rules: flat dark background; exactly one big headline (a number or short phrase); one small supporting line under it; one small source line if given; small RoostNI wordmark in one corner with \"NI\" in emerald. Hard borders and monospace labels are fine. No faded, blurred or overlapping ghost text behind the headline. No website UI elements: no nav bars, buttons, menus, 'Browse' or 'Sign in' strips. No 3D renders, no stock photos, no people, no glass, no gradients, no shadows.";
const IMAGE_BANS: [RegExp, string][] = [
  [/\bno\s+tax\b/i, "no tax"], [/\brent\s+control/i, "rent control"], [/100\s*%/, "100%"], [/\bfree\b/i, "free"],
  [/\bzero\s+commission\b/i, "zero commission"], [/(^|\s)0\s*%\s*commission\b/i, "0% commission"], [/\bguarantee(d|s)?\b/i, "guaranteed"],
  [/\bcompliant\b/i, "compliant"], [/\bcompliance\s+tools?\b/i, "compliance tools"], [/\bplatforms?\b/i, "platform"],
  [/\bmiddle\s*-?\s*m[ae]n\b|\bcut\s+out\s+the\b|\bletting\s+agents?\b|\bestate\s+agents?\b|\bagent\s+fees?\b/i, "middleman or letting-agent slogan"],
];
const US_SPELLING = /\b(organiz\w*|recogniz\w*|realiz\w*|apologiz\w*|minimiz\w*|maximiz\w*|prioritiz\w*|authoriz\w*|analyz\w*|colors?|colored|favorite\w*|centers?|honors?|neighbors?|behaviors?|labor|catalog|programs?)\b/i;
const LEGAL_WORDS = /\b(must|legally|law|statutory|legal|required|entitled|rights?|regulations?|legislation|notice|eviction|deposit|cap|protect\w*|register\w*|deadline)\b/i;
const NUMBER_WORDS = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|fifty|hundred)\b/gi;
const figures = (v: string) => [...(v.match(/\d[\d,.]*/g) ?? []), ...(v.toLowerCase().match(NUMBER_WORDS) ?? [])];
export function sourceDomain(url: string): string | null { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; } }
/** Wording problems on image text; empty array means safe to copy. */
export function imageTextProblems(...texts: string[]): string[] {
  const out: string[] = [];
  for (const t of texts) {
    for (const [re, label] of IMAGE_BANS) if (re.test(t) && !out.includes(`Banned on images: ${label}`)) out.push(`Banned on images: ${label}`);
    const us = t.match(US_SPELLING)?.[0];
    if (us && !out.includes(`US spelling: ${us}`)) out.push(`US spelling: ${us}`);
  }
  return out;
}
/** Problems with a saved brief, checked again on the dashboard before copying. */
export function auditImageBrief(b: ImageBrief): string[] {
  const p = imageTextProblems(b.headline, b.fact_line, b.source_line ?? "");
  if (!/do not add any other text/i.test(b.prompt)) p.push("Prompt is from an older version. Re-draft for the new layout rules.");
  return p;
}
const normaliseText = (v: string) => v.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[^\p{L}\p{N}'£% ]+/gu, " ").replace(/\s+/g, " ").trim();
const NUMBER_VALUES: Record<string, string> = { one:"1", two:"2", three:"3", four:"4", five:"5", six:"6", seven:"7", eight:"8", nine:"9", ten:"10", eleven:"11", twelve:"12", twenty:"20", thirty:"30", fifty:"50", hundred:"100" };
const canonicalNumber = (n: string) => NUMBER_VALUES[n.toLowerCase()] ?? n.replace(/[,.]+$/, "").replace(/,/g, "");
/** Removes "good practice" / "not a legal requirement" labels so they are not read as legal claims. */
const stripImageDisclaimers = (v: string) => v
  .replace(/\bgood practice\b[:,]?/gi, " ")
  .replace(/\bnot\s+(?:(?:an?|another|any|extra|additional|further|formal|separate|new)\s+){0,3}(?:legal|statutory|tenancy)\s+(?:requirements?|rules?|duty|duties|obligations?|checklists?)\b/gi, " ")
  .replace(/\bgeneral information,?\s+not legal advice\.?/gi, " ");
const STOP = new Set("the and for your you with that this from into what when where which have about before after their them they then than just every each only also more most some such like less".split(" "));
/** Image text summarises the post: enough meaningful words must share a root with words in the body (dig/digging). */
export function groundedInBody(imageText: string, body: string): boolean {
  const bodyWords = normaliseText(body).split(" ").filter(w => w.length >= 3);
  const words = normaliseText(imageText).split(" ").filter(w => w.length >= 4 && !STOP.has(w));
  if (!words.length) return true;
  const root = (w: string) => w.slice(0, Math.min(5, Math.max(3, w.length - 3)));
  const hits = words.filter(w => bodyWords.some(b => b.startsWith(root(w)) || w.startsWith(root(b)))).length;
  return hits / words.length >= 0.5;
}
/** Builds a fact-first image brief. Legal figures and claims may only come from approved legal statements used in the post. */
export function prepareImageBrief(input: { headline: string; fact_line: string; layout?: string }, body: string, approvedStatements: LegalStatement[] = []): ImageBrief {
  const headline = input.headline.trim(), fact = input.fact_line.trim();
  if (!headline || headline.split(/\s+/).length >= 8) throw new Error("Image headline must be under 8 words.");
  if (/\p{Extended_Pictographic}/u.test(`${headline} ${fact}`)) throw new Error("No emoji on images.");
  for (const text of [headline, fact]) validateMarketingCopy(text, false);
  const problems = imageTextProblems(headline, fact);
  if (problems.length) throw new Error(`Image wording needs revision: ${problems.join("; ")}.`);
  if (!fact || fact.split(/\s+/).length > 16) throw new Error("Image supporting line must be one short label.");
  const imageText = stripImageDisclaimers(`${headline} ${fact}`);
  const looksLegal = LEGAL_WORDS.test(imageText) || /\bnotice\s+to\s+quit\b/i.test(imageText);
  const nums = figures(imageText).map(canonicalNumber);
  let sourceLine: string | null = null;
  if (looksLegal || nums.length) {
    const match = approvedStatements.find(s => {
      const st = figures(s.statement).map(canonicalNumber);
      return nums.every(n => st.includes(n));
    });
    if (match) {
      const domain = sourceDomain(match.source);
      if (!domain) throw new Error("Approved fact has no valid source for the image.");
      sourceLine = `Source: ${domain}`;
    } else if (looksLegal) {
      throw new Error("Image shows a legal figure or claim that is not an approved fact used in this post.");
    } else if (!nums.every(n => figures(body).map(canonicalNumber).includes(n))) {
      throw new Error("Image figure must come from the post itself.");
    }
  } else if (!groundedInBody(imageText, body)) {
    throw new Error("Image text must come from the post itself.");
  }
  const textSpec = `headline "${headline}"; supporting line "${fact}"${sourceLine ? `; source line "${sourceLine}"` : ""}; corner wordmark "RoostNI"`;
  const prompt = `Square 1080x1080 social graphic. ${IMAGE_BRIEF_STYLE} ${IMAGE_LAYOUT_RULES} Render exactly this text in British English, spelled exactly as written: ${textSpec}. Do not add any other text.`;
  return { headline, fact_line: fact, style: IMAGE_BRIEF_STYLE, prompt, source_line: sourceLine };
}
export function readImageBrief(notes: string | null): ImageBrief | null {
  try { const v = JSON.parse(notes ?? "null")?.image_brief; return v && typeof v.prompt === "string" ? v as ImageBrief : null; } catch { return null; }
}
export function formatImageBrief(b: ImageBrief): string {
  return `Headline: ${b.headline}\nSupporting line: ${b.fact_line}\n${b.source_line ? `Source line: ${b.source_line}\n` : ""}Style: ${b.style}\nPrompt: ${b.prompt}`;
}
