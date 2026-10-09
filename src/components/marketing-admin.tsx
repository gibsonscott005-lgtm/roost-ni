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
  const [focus, setFocus] = useState<"mixed" | "landlord" | "tenant" | "ni_legal">("mixed");
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [distilling, setDistilling] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await fetchEngine({ data: undefined } as never));
    } catch (error) {
      toast.error("Couldn't load the marketing engine", {
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
      const { created } = await generateFn({ data: { focus, count: 4 } });
      toast.success(`${created.length} posts drafted`, {
        description: "They sit in the queue below, one per evening from tomorrow.",
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
  const copyGroupPost = (post: MarketingPost) =>
    copyText(buildGroupPostText(post), "Group post copied", "No links inside — post it directly in the group, then add the first comment.");
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
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={focus}
          onChange={(e) => setFocus(e.target.value as typeof focus)}
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground"
        >
          <option value="mixed">Mixed audience</option>
          <option value="landlord">Landlords only</option>
          <option value="tenant">Tenants only</option>
          <option value="ni_legal">NI Legal Series (Mon / Wed / Fri)</option>
        </select>
        <button
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
          {generating ? "Drafting…" : "Draft 4 posts"}
        </button>
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

      <p className="text-xs text-muted-foreground">
        The engine drafts posts around Northern Ireland rental law and RoostNI's
        free tools. For groups: copy the group post (no links, so admin filters
        don't hold it), post it directly in the group — not via "Share" — then
        paste the first comment with the tracked link. Visits, audits, alerts
        and sign-ups are scored back here automatically.
      </p>

      {insights.length > 0 ? (
        <div className="rounded-2xl border border-border bg-surface-muted/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            What the engine has learned
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
                    {post.body}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyGroupPost(post)}
                    className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary-foreground)] transition hover:bg-foreground/90"
                  >
                    <Copy className="h-3 w-3" /> 1. Copy group post
                  </button>
                  {post.link_url ? (
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
