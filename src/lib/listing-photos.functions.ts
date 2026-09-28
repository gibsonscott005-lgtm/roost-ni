import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LISTING_PHOTOS_BUCKET = "listing-photos";

const inputSchema = z.object({
  paths: z.array(z.string().min(1).max(300)).max(24),
});

/**
 * Sign viewable URLs for listing photos.
 *
 * Public on purpose: visitors must be able to see photos on advertised
 * properties. Every requested path is checked against a published listing
 * first, so photos of private (tenanted / unadvertised) properties are never
 * signed here. Landlords read their own private photos directly via storage RLS.
 */
export const getListingPhotoUrls = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<string[]> => {
    if (data.paths.length === 0) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: listings } = await supabaseAdmin
      .from("property_listings")
      .select("photo_urls")
      .eq("is_published", true)
      .overlaps("photo_urls", data.paths);

    const allowed = new Set<string>();
    for (const row of listings ?? []) {
      for (const p of (row.photo_urls as string[] | null) ?? []) allowed.add(p);
    }

    const requested = data.paths.filter((p) => allowed.has(p));
    if (requested.length === 0) return [];

    const { data: signed } = await supabaseAdmin.storage
      .from(LISTING_PHOTOS_BUCKET)
      .createSignedUrls(requested, 60 * 60);

    const byPath = new Map<string, string>();
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) byPath.set(entry.path, entry.signedUrl);
    }

    return data.paths.map((p) => byPath.get(p)).filter((u): u is string => !!u);
  });

const coversInputSchema = z.object({
  listingIds: z.array(z.string().uuid()).max(100),
});

/**
 * Sign the first (cover) photo of each given listing, keyed by listing id.
 *
 * Used by the browse page so cover images are already in the first paint.
 * Only published listings are signed — private (tenanted / unadvertised)
 * properties are never exposed here.
 */
export const getListingCoverUrls = createServerFn({ method: "POST" })
  .inputValidator((data) => coversInputSchema.parse(data))
  .handler(async ({ data }): Promise<Record<string, string>> => {
    if (data.listingIds.length === 0) return {};

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: listings } = await supabaseAdmin
      .from("property_listings")
      .select("id, photo_urls")
      .in("id", data.listingIds)
      .eq("is_published", true);

    const firstPathById = new Map<string, string>();
    for (const row of listings ?? []) {
      const first = ((row.photo_urls as string[] | null) ?? []).find(
        (p) => typeof p === "string" && p.length > 0 && !/^https?:\/\//i.test(p),
      );
      if (first) firstPathById.set(row.id as string, first);
    }
    if (firstPathById.size === 0) return {};

    const { data: signed } = await supabaseAdmin.storage
      .from(LISTING_PHOTOS_BUCKET)
      .createSignedUrls([...firstPathById.values()], 60 * 60);

    const urlByPath = new Map<string, string>();
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) urlByPath.set(entry.path, entry.signedUrl);
    }

    const out: Record<string, string> = {};
    for (const [id, path] of firstPathById) {
      const url = urlByPath.get(path);
      if (url) out[id] = url;
    }
    return out;
  });
