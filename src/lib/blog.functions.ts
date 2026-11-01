import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Article, ArticleSummary } from "@/lib/blog";

// Public reads use the publishable key; RLS only returns articles whose publish time has passed.
function publicClient() {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Blog is temporarily unavailable");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listPublishedArticles = createServerFn({ method: "GET" }).handler(async (): Promise<ArticleSummary[]> => {
  const { data, error } = await publicClient()
    .from("articles")
    .select("slug, title, excerpt, category, published_at, content_markdown")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map((a) => ({ ...a, published_at: a.published_at as string }));
});

export const getPublishedArticle = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => ({ slug: String(input.slug).slice(0, 120) }))
  .handler(async ({ data }): Promise<Article | null> => {
    const { data: row, error } = await publicClient()
      .from("articles")
      .select("slug, title, excerpt, category, tags, author_name, legal_checked_at, meta_title, meta_description, published_at, updated_at, content_markdown")
      .eq("slug", data.slug)
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ? { ...row, published_at: row.published_at as string } : null;
  });

export const listSitemapArticles = createServerFn({ method: "GET" }).handler(async () => {
  const out: { slug: string; updated_at: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await publicClient()
      .from("articles")
      .select("slug, updated_at")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
});
