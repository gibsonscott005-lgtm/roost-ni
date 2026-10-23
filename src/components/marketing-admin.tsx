import { Link } from "@tanstack/react-router";
import { RobinGroupsPanel } from "./robin-groups-panel";
import { readGroupSnapshot } from "@/lib/robin-groups";
import { Button } from "@/components/ui/button";
import { readMarketingReview, readImageBrief, formatImageBrief, auditImageBrief } from "@/lib/marketing-knowledge";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Brain,
  Check,
  Copy,
  Loader2,
  Megaphone,
  Pencil,
  RefreshCw,
  SkipForward,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";
import {
  distillMarketingInsights,
  generateMarketingPlan,
  getMarketingEngine,
  refreshMarketingResults,
  setMarketingInsightActive,
  updateMarketingPost,
  buildShareText,
  buildGroupPostText,
  buildFirstCommentText,
  buildRedditBody,
  type MarketingEngineData,
  type MarketingPost,
} from "@/lib/marketing.functions";

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });

const personaStyles: Record<string, string> = {
  landlord: "bg-verified text-[var(--color-verified-foreground)]",
  tenant: "bg-secondary text-foreground",
  community: "bg-surface-muted text-muted-foreground",
};

export function MarketingAdminPanel() {
  const fetchEngine = useServerFn(getMarketingEngine);
  const generateFn = useServerFn(generateMarketingPlan);
  const updateFn = useServerFn(updateMarketingPost);
  const refreshFn = useServerFn(refreshMarketingResults);
  const distillFn = useServerFn(distillMarketingInsights);
  const insightActiveFn = useServerFn(setMarketingInsightActive);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MarketingEngineData | null>(null);
  const [focus, setFocus] = useState<"mixed" | "landlord" | "tenant" | "ni_legal" | "reddit">("mixed");
  const [generating, setGenerating] = useState(false);
  const [brief, setBrief] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [distilling, setDistilling] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [lastCopiedId, setLastCopiedId] = useState<string | null>(null);
  useEffect(() => {
    try { setLastCopiedId(localStorage.getItem("roost_last_copied_post")); } catch { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    try {
      setData(await fetchEngine({ data: undefined } as never));
    } catch (error) {
      toast.error("Couldn't load Robin", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
    setLoading(false);
  }, [fetchEngine]);

  useEffect(() => {
    // Recount conversions quietly on open so scores are never stale.
    void (async () => {
      try {
        await refreshFn({ data: undefined } as never);
      } catch {
        /* fall back to stored scores */
      }
      await load();
    })();
  }, [load, refreshFn]);

  const generate = async () => {
    setGenerating(true);
    try {
      const { created } = await generateFn({ data: { focus, count: 1, brief: brief.trim() || undefined } });
      toast.success(created.length ? "Robin drafted today's post" : "No post drafted", {
        description: "It sits in the queue below for the next 7pm slot.",
      });
      await load();
    } catch (error) {
      toast.error("Couldn't draft posts", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
    setGenerating(false);
  };

  const refreshResults = async () => {
    setRefreshing(true);
    try {
      const { updated } = await refreshFn({ data: undefined } as never);
      toast.success(
        updated > 0 ? `Scores updated for ${updated} posted campaign${updated === 1 ? "" : "s"}` : "No posted campaigns to score yet",
      );
      await load();
    } catch (error) {
      toast.error("Couldn't refresh results", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
    setRefreshing(false);
  };

  const distill = async () => {
    setDistilling(true);
    try {
      const { created } = await distillFn({ data: undefined } as never);
      toast.success(`${created} new lesson${created === 1 ? "" : "s"} learned`, {
        description: "Future drafts will take these into account.",
      });
      await load();
    } catch (error) {
      toast.error("Couldn't distill lessons yet", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
    setDistilling(false);
  };

  const updatePost = async (
    id: string,
    patch: { status?: "scheduled" | "posted" | "skipped"; body?: string },
    successMessage: string,
  ) => {
    setBusyId(id);
    try {
      await updateFn({ data: { id, ...patch } });
      toast.success(successMessage);
      await load();
    } catch (error) {
      toast.error("Couldn't update the post", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
    setBusyId(null);
  };

  const copyText = (text: string, title: string, description: string) => {
    void navigator.clipboard
      .writeText(text)
      .then(() => toast.success(title, { description }))
      .catch(() => toast.error("Couldn't copy — select the text manually."));
  };
  const copyPost = (post: MarketingPost) =>
    copyText(buildShareText(post), "Page post copied", "Includes the tracked link — for your RoostNI Page.");
  const copyGroupPost = (post: MarketingPost) => {
    setLastCopiedId(post.id);
    try { localStorage.setItem("roost_last_copied_post", post.id); } catch { /* ignore */ }
    copyText(buildGroupPostText(post), "Group post copied", "Uses this draft’s saved link placement and posting identity.");
  };
  const copyFirstComment = (post: MarketingPost) =>
    copyText(buildFirstCommentText(post), "First comment copied", "Paste this as the first comment straight after posting.");

  const toggleInsight = async (id: string, active: boolean) => {
    setBusyId(id);
    try {
      await insightActiveFn({ data: { id, active } });
      await load();
    } catch {
      toast.error("Couldn't update the lesson");
    }
    setBusyId(null);
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const posts = data?.posts ?? [];
  const insights = data?.insights ?? [];
  const upcoming = posts
    .filter((p) => p.status === "scheduled" || p.status === "draft")
    .sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
  const history = posts
    .filter((p) => p.status === "posted" || p.status === "skipped")
    .sort((a, b) => b.scheduled_for.localeCompare(a.scheduled_for));
  // Learning needs at least two scored campaigns; gate the button so it never
  // errors out with "couldn't distill lessons yet".
  const scoredCount = posts.filter(
    (p) => p.status === "posted" && typeof p.results?.score === "number",
  ).length;
  const canDistill = scoredCount >= 2;

  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-verified text-[var(--color-verified-foreground)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display text-base font-semibold text-foreground">Robin</p>
          <p className="text-xs text-muted-foreground">RoostNI's marketing assistant</p>
        </div>
      </div>
      <label htmlFor="robin-todays-brief" className="block text-sm font-semibold text-foreground">Today's brief</label>
      <textarea
        id="robin-todays-brief"
        maxLength={6000}
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={4}
        placeholder="Topic, audience, recent results and any claims you have explicitly checked (optional)."
        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
      />
      <Link to="/dashboard/legal-facts" className="inline-flex text-sm font-semibold text-verified underline">Review Robin’s legal facts</Link>
      <RobinGroupsPanel brief={brief} focus={focus} posts={posts} onDrafted={load}/>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={focus}
          onChange={(e) => setFocus(e.target.value as typeof focus)}
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground"
        >
          <option value="mixed">Mixed audience</option>
          <option value="landlord">Landlords only</option>
          <option value="tenant">Tenants only</option>
          <option value="ni_legal">NI Legal Series</option>
          <option value="reddit">Reddit</option>
        </select>
        {focus === "reddit" ? <Button
          type="button"
          onClick={generate}
          disabled={generating}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-[var(--color-primary-foreground)] transition hover:bg-foreground/90 disabled:opacity-60"
        >
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {generating ? "Robin is drafting…" : focus === "reddit" ? "Draft today's Reddit post" : "Draft today's post"}
        </Button> : null}
        <button
          type="button"
          onClick={refreshResults}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh scores
        </button>
        <button
          type="button"
          onClick={distill}
          disabled={distilling || !canDistill}
          title={
            canDistill
              ? "Distil lessons from your scored campaigns"
              : "Needs 2 posted campaigns with refreshed scores"
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {distilling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Brain className="h-3.5 w-3.5" />
          )}
          {canDistill ? "Learn from results" : `Learn from results (${scoredCount}/2 scored)`}
        </button>
      </div>



      {insights.length > 0 ? (
        <div className="rounded-2xl border border-border bg-surface-muted/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            What Robin has learned
          </p>
          <ul className="mt-2 space-y-1.5">
            {insights.map((i) => (
              <li
                key={i.id}
                className={`flex items-start gap-2 text-xs ${i.active ? "text-foreground" : "text-muted-foreground line-through"}`}
              >
                {i.kind === "loss" ? (
                  <ThumbsDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                ) : (
                  <ThumbsUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-verified" />
                )}
                <span className="flex-1">{i.insight}</span>
                <button
                  type="button"
                  onClick={() => toggleInsight(i.id, !i.active)}
                  disabled={busyId === i.id}
                  className="shrink-0 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:bg-secondary"
                >
                  {i.active ? "Retire" : "Reinstate"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {(() => {
        const last = posts.find((p) => p.id === lastCopiedId && p.status !== "posted" && p.status !== "skipped");
        if (!last) return null;
        return (
          <div className="rounded-2xl border-2 border-verified bg-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-verified">
              Back from Facebook? Finish this post
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{last.topic}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {last.link_url ? (
                <button
                  type="button"
                  onClick={() => copyFirstComment(last)}
                  className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-[var(--color-primary-foreground)]"
                >
                  <Copy className="h-3.5 w-3.5" /> 2. Copy first comment
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => updatePost(last.id, { status: "posted" }, "Marked as posted — scoring starts now")}
                disabled={busyId === last.id}
                className="inline-flex items-center gap-1 rounded-full bg-verified px-3 py-1.5 text-xs font-semibold text-[var(--color-verified-foreground)] disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" /> Mark posted
              </button>
              <button
                type="button"
                onClick={() => {
                  setLastCopiedId(null);
                  try { localStorage.removeItem("roost_last_copied_post"); } catch { /* ignore */ }
                }}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                Dismiss
              </button>
            </div>
          </div>
        );
      })()}

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Upcoming queue ({upcoming.length})
        </p>
        {upcoming.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border bg-surface-muted/40 p-6 text-center">
            <Megaphone className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Nothing queued — draft a batch above.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {upcoming.map((post) => (
              <li
                key={post.id}
                className="rounded-2xl border border-border bg-surface-muted/50 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${personaStyles[post.persona] ?? personaStyles.community}`}
                  >
                    {post.persona}
                  </span>
                  <span className="text-[11px] font-medium text-foreground">
                    {dateFmt(post.scheduled_for)}
                  </span>
                  <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {post.angle}
                  </span>
                </div>
                {readGroupSnapshot(post.notes) ? <p className="mt-2 text-xs font-semibold text-verified">{readGroupSnapshot(post.notes)?.name} · {readGroupSnapshot(post.notes)?.linkPlacement} · {readGroupSnapshot(post.notes)?.postAs}</p> : null}
                <p className="mt-2 text-sm font-medium text-foreground">{post.topic}</p>

                {editingId === post.id ? (
                  <div className="mt-2">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={10}
                      className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          void updatePost(post.id, { body: editBody }, "Post updated");
                          setEditingId(null);
                        }}
                        disabled={busyId === post.id}
                        className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-[11px] font-semibold text-[var(--color-primary-foreground)] disabled:opacity-60"
                      >
                        <Check className="h-3 w-3" /> Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-xs text-muted-foreground">
                    {post.platform === "reddit" ? <span className="mr-1 rounded-full bg-reddit px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-reddit-foreground">Reddit</span> : null}
                    {post.body}
                  </p>
                )}

                {(() => {
                  const review = readMarketingReview(post.notes);
                  return <div className="mt-3 border-l-2 border-verified pl-3 text-xs text-foreground">
                    <p className="font-semibold">{review?.content_mode === "help" ? "Pure help" : review?.content_mode === "soft" ? "Soft mention" : review?.content_mode === "direct" ? "Direct promotion" : "Legacy draft"} · Check before posting</p>
                    {review?.legal_statements.map((item, index) => <div key={index} className="mt-2">
                      <p>{item.statement}</p>
                      <a href={item.source} target="_blank" rel="noreferrer" className="break-all underline">{item.source}</a>
                      <p className="font-semibold">Verified: {item.verified_at ? new Date(item.verified_at).toLocaleDateString("en-GB") : "Not verified — legacy draft"} · {item.flag}</p>
                    </div>)}
                    {review?.review_flags.includes("verify before posting") ? <p className="mt-2 font-semibold">Verify before posting — portal, agent or fee claim</p> : null}
                    {!review ? <p className="mt-1 text-muted-foreground">Not checked against Robin’s current wording and source rules.</p> : null}
                    {(() => { const brief = post.platform === "facebook" ? readImageBrief(post.notes) : null; if (!brief) return null; const problems = auditImageBrief(brief); const blocked = problems.length > 0; return <div className="mt-3 border-2 border-foreground p-2">
                      <p className="font-semibold uppercase tracking-wide">Image brief</p>
                      {blocked ? <div role="alert" className="mt-1 border-2 border-destructive bg-destructive/10 p-2 font-semibold text-destructive">Copy blocked: {problems.join(" · ")}</div> : null}
                      <p className="mt-1"><span className="font-semibold">Headline:</span> {brief.headline}</p>
                      <p><span className="font-semibold">Supporting line:</span> {brief.fact_line}</p>
                      {brief.source_line ? <p><span className="font-semibold">Source line:</span> {brief.source_line}</p> : null}
                      <p><span className="font-semibold">Style:</span> {brief.style}</p>
                      <p className="mt-1 whitespace-pre-wrap break-words bg-secondary p-2 font-mono text-[11px]">{brief.prompt}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" disabled={blocked} onClick={() => copyText(formatImageBrief(brief), "Image brief copied", "Check the wording before you post.")} className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary-foreground)] disabled:opacity-40"><Copy className="h-3 w-3" /> Copy image brief</button>
                        <button type="button" disabled={blocked} onClick={() => copyText(brief.prompt, "Image prompt copied", "Paste it into your image tool.")} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-foreground disabled:opacity-40"><Copy className="h-3 w-3" /> Copy prompt</button>
                      </div>
                    </div>; })()}
                  </div>;
                })()}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {post.platform === "reddit" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => copyText(post.topic, "Reddit title copied", "Paste it into the Title box on r/nirenting.")}
                        className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary-foreground)] transition hover:bg-foreground/90"
                      >
                        <Copy className="h-3 w-3" /> 1. Copy title
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(buildRedditBody(post), "Reddit post copied", "Paste into the body (Markdown editor). The tracked link is already inside.")}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-foreground transition hover:bg-secondary"
                      >
                        <Copy className="h-3 w-3" /> 2. Copy post body
                      </button>
                    </>
                  ) : (
                    <>
                  <button
                    type="button"
                    onClick={() => copyGroupPost(post)}
                    className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary-foreground)] transition hover:bg-foreground/90"
                  >
                    <Copy className="h-3 w-3" /> 1. Copy group post
                  </button>
                  {post.link_url && readGroupSnapshot(post.notes)?.linkPlacement !== "in body" ? (
                    <button
                      type="button"
                      onClick={() => copyFirstComment(post)}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-foreground transition hover:bg-secondary"
                    >
                      <Copy className="h-3 w-3" /> 2. Copy first comment
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => copyPost(post)}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-secondary"
                  >
                    <Copy className="h-3 w-3" /> Page version
                  </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => updatePost(post.id, { status: "posted" }, "Marked as posted — scoring starts now")}
                    disabled={busyId === post.id}
                    className="inline-flex items-center gap-1 rounded-full bg-verified px-2.5 py-1 text-[11px] font-semibold text-[var(--color-verified-foreground)] transition hover:brightness-95 disabled:opacity-60"
                  >
                    {busyId === post.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    Mark posted
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(post.id);
                      setEditBody(post.body);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-secondary"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePost(post.id, { status: "skipped" }, "Post skipped")}
                    disabled={busyId === post.id}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-secondary disabled:opacity-60"
                  >
                    <SkipForward className="h-3 w-3" /> Skip
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {history.length > 0 ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            History ({history.length})
          </p>
          <ul className="mt-3 space-y-2">
            {history.map((post) => {
              const score = post.results?.score;
              return (
                <li
                  key={post.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface-muted/50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {post.topic}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {dateFmt(post.scheduled_for)} · {post.persona} · {post.status}
                      {post.status === "posted" ? (
                        <>
                          {" "}· visits {post.results?.visits ?? 0} · audits {post.results?.audits ?? 0} · alerts{" "}
                          {post.results?.alerts ?? 0} · sign-ups {post.results?.signups ?? 0}
                        </>
                      ) : null}
                    </p>
                  </div>
                  {post.status === "posted" && typeof score === "number" ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground">
                      <TrendingUp className="h-3 w-3 text-verified" />
                      Score {score}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
