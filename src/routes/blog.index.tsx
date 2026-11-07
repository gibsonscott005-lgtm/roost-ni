import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listPublishedArticles } from "@/lib/blog.functions";
import { BLOG_BASE, formatUkDate, readingMinutes } from "@/lib/blog";
import { BlogFooter, BlogHeader } from "@/components/blog-chrome";

const articlesQuery = queryOptions({ queryKey: ["blog", "list"], queryFn: () => listPublishedArticles() });

const TITLE = "Blog — NI renting and landlord law, explained | RoostNI";
const DESC = "Plain-English posts on Northern Ireland renting: landlord duties, tenancy notices, deposits and safety checks, with the date each legal point was last checked.";

export const Route = createFileRoute("/blog/")({
  staticData: { sitemap: true },
  loader: ({ context }) => context.queryClient.ensureQueryData(articlesQuery),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${BLOG_BASE}/blog` },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${BLOG_BASE}/blog` }],
  }),
  component: BlogIndex,
  errorComponent: BlogError,
  notFoundComponent: () => <p className="p-8">No posts found.</p>,
});

function BlogError() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-xl p-8 text-center">
      <p className="font-bold">The blog didn't load.</p>
      <button className="mt-4 border-2 border-foreground px-4 py-2 font-mono text-sm font-bold uppercase" onClick={() => router.invalidate()}>
        Try again
      </button>
    </div>
  );
}

function BlogIndex() {
  const { data: articles } = useSuspenseQuery(articlesQuery);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <BlogHeader />
      <main className="mx-auto max-w-4xl px-4 sm:px-6">
        <section className="border-b-2 border-foreground py-12">
          <p className="font-mono text-sm font-bold uppercase tracking-wider text-verified">// RoostNI blog</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-6xl">Renting in NI, explained straight.</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Weekly posts on Northern Ireland landlord duties and tenant rights. Every legal point shows when it was last checked.
          </p>
        </section>
        {articles.length === 0 ? (
          <section className="py-12">
            <h2 className="text-2xl font-extrabold">No posts yet — start with the guides.</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
              The first post is on its way. Until then, these plain-English guides cover the questions Northern Ireland landlords and tenants ask most:
            </p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              <li className="border-2 border-foreground p-4">
                <Link to="/landlord-registration-ni" className="font-bold hover:text-verified">Landlord registration in NI</Link>
                <p className="mt-1 text-sm text-muted-foreground">How to register as a landlord in Northern Ireland, step by step.</p>
              </li>
              <li className="border-2 border-foreground p-4">
                <Link to="/tenancy-information-notice-ni" className="font-bold hover:text-verified">Tenancy Information Notice</Link>
                <p className="mt-1 text-sm text-muted-foreground">The notice a landlord must give a tenant within 28 days of the tenancy starting.</p>
              </li>
              <li className="border-2 border-foreground p-4">
                <Link to="/notice-to-quit-ni" className="font-bold hover:text-verified">Notice to Quit in NI</Link>
                <p className="mt-1 text-sm text-muted-foreground">The minimum notice periods for ending a tenancy in Northern Ireland.</p>
              </li>
              <li className="border-2 border-foreground p-4">
                <Link to="/rent-receipts-ni" className="font-bold hover:text-verified">Rent receipts in NI</Link>
                <p className="mt-1 text-sm text-muted-foreground">What a receipt for a cash rent payment must show.</p>
              </li>
            </ul>
            <p className="mt-6 text-muted-foreground">
              Not sure where your tenancy stands? Try the <Link to="/audit" className="font-bold underline hover:text-verified">compliance health check</Link> — five questions, no account needed.
            </p>
          </section>
        ) : (
          <ul className="divide-y divide-border">
            {articles.map((a) => (
              <li key={a.slug} className="py-8">
                <p className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <span className="text-verified">{a.category}</span> · {formatUkDate(a.published_at)} · {readingMinutes(a.content_markdown)} min read
                </p>
                <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                  <Link to="/blog/$slug" params={{ slug: a.slug }} className="hover:text-verified">{a.title}</Link>
                </h2>
                <p className="mt-2 leading-relaxed text-muted-foreground">{a.excerpt}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
      <BlogFooter />
    </div>
  );
}
