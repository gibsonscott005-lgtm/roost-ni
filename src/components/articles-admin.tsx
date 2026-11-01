import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Eye, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_AUTHOR,
  articleStatus,
  formatUkDate,
  londonLocalToUtcIso,
  slugify,
  utcIsoToLondonLocal,
} from "@/lib/blog";
import { renderMarkdown } from "@/lib/markdown";

interface Row {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_markdown: string;
  category: string;
  tags: string[];
  author_name: string;
  legal_checked_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
  updated_at: string;
}

type Mode = "draft" | "now" | "schedule";

const empty = {
  id: "",
  title: "",
  slug: "",
  slugTouched: false,
  excerpt: "",
  content_markdown: "",
  category: "Landlord guides",
  tags: "",
  author_name: DEFAULT_AUTHOR,
  legal_checked_at: "",
  meta_title: "",
  meta_description: "",
  mode: "draft" as Mode,
  scheduleLocal: "",
  published_at: null as string | null,
};
type Form = typeof empty;

const input = "w-full rounded-sm border-2 border-border bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none";
const label = "block font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground";

export function ArticlesAdminPanel() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewTab, setPreviewTab] = useState<"write" | "preview">("write");

  const load = async () => {
    const { data, error } = await supabase.from("articles").select("*").order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
  };
  useEffect(() => { void load(); }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const edit = (r: Row) => {
    const status = articleStatus(r.published_at);
    setPreviewTab("write");
    setForm({
      id: r.id, title: r.title, slug: r.slug, slugTouched: true, excerpt: r.excerpt, content_markdown: r.content_markdown,
      category: r.category, tags: r.tags.join(", "), author_name: r.author_name, legal_checked_at: r.legal_checked_at ?? "",
      meta_title: r.meta_title ?? "", meta_description: r.meta_description ?? "",
      mode: status === "draft" ? "draft" : status === "scheduled" ? "schedule" : "now",
      scheduleLocal: r.published_at ? utcIsoToLondonLocal(r.published_at) : "",
      published_at: r.published_at,
    });
  };

  const remove = async (r: Row) => {
    if (!window.confirm(`Delete "${r.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("articles").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Article deleted");
    void load();
  };

  const save = async () => {
    if (!form) return;
    const slug = slugify(form.slug || form.title);
    if (!form.title.trim() || !slug) return toast.error("Add a title");
    if (!form.excerpt.trim()) return toast.error("Add a short excerpt");
    let published_at: string | null = null;
    try {
      if (form.mode === "now") published_at = form.published_at && articleStatus(form.published_at) === "published" ? form.published_at : new Date().toISOString();
      if (form.mode === "schedule") {
        published_at = londonLocalToUtcIso(form.scheduleLocal);
        if (new Date(published_at) <= new Date()) return toast.error("Pick a time in the future, or choose Publish now");
      }
    } catch (e) {
      return toast.error(e instanceof Error ? e.message : "Check the schedule time");
    }
    const payload = {
      slug,
      title: form.title.trim(),
      excerpt: form.excerpt.trim(),
      content_markdown: form.content_markdown,
      category: form.category.trim() || "Landlord guides",
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      author_name: form.author_name.trim() || DEFAULT_AUTHOR,
      legal_checked_at: form.legal_checked_at || null,
      meta_title: form.meta_title.trim() || null,
      meta_description: form.meta_description.trim() || null,
      published_at,
    };
    setSaving(true);
    const { error } = form.id
      ? await supabase.from("articles").update(payload).eq("id", form.id)
      : await supabase.from("articles").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.code === "23505" ? "That web address (slug) is already used" : error.message);
    toast.success(form.mode === "draft" ? "Draft saved" : form.mode === "now" ? "Published" : `Scheduled for ${form.scheduleLocal.replace("T", " ")} (London)`);
    setForm(null);
    void load();
  };

  const preview = useMemo(() => (form && previewTab === "preview" ? renderMarkdown(form.content_markdown) : ""), [form, previewTab]);

  if (form) {
    return (
      <div className="mt-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{form.id ? "Edit article" : "New article"}</h2>
          <button className="text-sm underline" onClick={() => setForm(null)}>Back to list</button>
        </div>
        <div>
          <label className={label}>Title</label>
          <input className={input} value={form.title} onChange={(e) => {
            const title = e.target.value;
            setForm((f) => f && ({ ...f, title, slug: f.slugTouched ? f.slug : slugify(title) }));
          }} />
        </div>
        <div>
          <label className={label}>Slug (web address: /blog/…)</label>
          <input className={input} value={form.slug} onChange={(e) => setForm((f) => f && ({ ...f, slug: e.target.value, slugTouched: true }))} onBlur={() => set("slug", slugify(form.slug))} />
        </div>
        <div>
          <label className={label}>Excerpt (shown on the blog list and in search results)</label>
          <textarea className={input} rows={2} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={label}>Category</label><input className={input} value={form.category} onChange={(e) => set("category", e.target.value)} /></div>
          <div><label className={label}>Tags (comma separated)</label><input className={input} value={form.tags} onChange={(e) => set("tags", e.target.value)} /></div>
          <div><label className={label}>Author</label><input className={input} value={form.author_name} onChange={(e) => set("author_name", e.target.value)} /></div>
          <div><label className={label}>Legal information last checked</label><input type="date" className={input} value={form.legal_checked_at} onChange={(e) => set("legal_checked_at", e.target.value)} /></div>
          <div><label className={label}>Meta title (optional)</label><input className={input} value={form.meta_title} placeholder={form.title} onChange={(e) => set("meta_title", e.target.value)} /></div>
          <div><label className={label}>Meta description (optional)</label><input className={input} value={form.meta_description} placeholder={form.excerpt} onChange={(e) => set("meta_description", e.target.value)} /></div>
        </div>
        <div>
          <div className="flex gap-2">
            {(["write", "preview"] as const).map((t) => (
              <button key={t} onClick={() => setPreviewTab(t)} className={`border-2 px-3 py-1 font-mono text-xs font-bold uppercase ${previewTab === t ? "border-foreground bg-foreground text-background" : "border-border"}`}>{t}</button>
            ))}
          </div>
          {previewTab === "write" ? (
            <textarea className={`${input} mt-2 font-mono`} rows={18} value={form.content_markdown} onChange={(e) => set("content_markdown", e.target.value)}
              placeholder={"## Heading\n\n**Bold**, [links](/notice-to-quit-ni), - lists, > quotes\n\n| Column | Column |\n| --- | --- |\n| Cell | Cell |"} />
          ) : (
            <div className="mt-2 min-h-[200px] rounded-sm border-2 border-border p-4" dangerouslySetInnerHTML={{ __html: preview }} />
          )}
        </div>
        <fieldset className="space-y-2 rounded-sm border-2 border-border p-4">
          <legend className={label}>When should it go live?</legend>
          {([["draft", "Save as draft"], ["now", "Publish now"], ["schedule", "Schedule (London time)"]] as const).map(([v, l]) => (
            <label key={v} className="flex items-center gap-2 text-sm">
              <input type="radio" name="mode" checked={form.mode === v} onChange={() => set("mode", v)} /> {l}
            </label>
          ))}
          {form.mode === "schedule" ? (
            <input type="datetime-local" className={`${input} max-w-xs`} value={form.scheduleLocal} onChange={(e) => set("scheduleLocal", e.target.value)} />
          ) : null}
        </fieldset>
        <button disabled={saving} onClick={save} className="inline-flex items-center gap-2 border-2 border-foreground bg-foreground px-5 py-2 font-mono text-sm font-bold uppercase text-background disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {form.mode === "draft" ? "Save draft" : form.mode === "now" ? "Publish now" : "Schedule"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <button onClick={() => { setPreviewTab("write"); setForm({ ...empty }); }} className="inline-flex items-center gap-2 border-2 border-foreground px-4 py-2 font-mono text-sm font-bold uppercase hover:bg-foreground hover:text-background">
        <Plus className="h-4 w-4" /> New article
      </button>
      {rows === null ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No articles yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((r) => {
            const s = articleStatus(r.published_at);
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-surface-muted/50 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className={s === "published" ? "font-bold text-verified" : s === "scheduled" ? "font-bold" : ""}>
                      {s === "draft" ? "Draft" : s === "scheduled" ? `Scheduled ${utcIsoToLondonLocal(r.published_at!).replace("T", " ")}` : `Published ${formatUkDate(r.published_at!)}`}
                    </span>{" "}· /blog/{r.slug}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button aria-label="Edit" onClick={() => edit(r)} className="border border-border p-2 hover:border-foreground"><Pencil className="h-4 w-4" /></button>
                  <button aria-label="Preview" onClick={() => { edit(r); setPreviewTab("preview"); }} className="border border-border p-2 hover:border-foreground"><Eye className="h-4 w-4" /></button>
                  <button aria-label="Delete" onClick={() => remove(r)} className="border border-border p-2 hover:border-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
