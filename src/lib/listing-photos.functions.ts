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
