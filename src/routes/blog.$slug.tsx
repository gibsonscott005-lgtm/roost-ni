import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getPublishedArticle } from "@/lib/blog.functions";
import { BLOG_BASE, formatUkDate, readingMinutes } from "@/lib/blog";
import { renderMarkdown } from "@/lib/markdown";
import { BlogFooter, BlogHeader } from "@/components/blog-chrome";

const articleQuery = (slug: string) =>
  queryOptions({ queryKey: ["blog", "article", slug], queryFn: () => getPublishedArticle({ data: { slug } }) });

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params, context }) => {
    const article = await context.queryClient.ensureQueryData(articleQuery(params.slug));
    if (!article) throw notFound();
    return article;
  },
  head: ({ params, loaderData: a }) => {
    if (!a) return { meta: [{ title: "Post unavailable | RoostNI" }, { name: "robots", content: "noindex" }] };
    const url = `${BLOG_BASE}/blog/${params.slug}`;
    const title = a.meta_title || `${a.title} | RoostNI`;
    const desc = a.meta_description || a.excerpt;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "article:published_time", content: a.published_at },
        { property: "article:modified_time", content: a.updated_at },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: a.title,
            description: desc,
            datePublished: a.published_at,
            dateModified: a.updated_at,
            author: { "@type": "Person", name: a.author_name },
            publisher: { "@type": "Organization", name: "RoostNI", url: BLOG_BASE },
            mainEntityOfPage: url,
            articleSection: a.category,
            keywords: a.tags.join(", ") || undefined,
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${BLOG_BASE}/` },
              { "@type": "ListItem", position: 2, name: "Blog", item: `${BLOG_BASE}/blog` },
              { "@type": "ListItem", position: 3, name: a.title, item: url },
            ],
          }),
        },
      ],
    };
  },
  component: ArticlePage,
  errorComponent: ArticleError,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <BlogHeader />
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="text-xl font-bold">That post isn't available.</p>
        <Link to="/blog" className="mt-4 inline-block font-semibold text-verified underline">Back to the blog</Link>
      </div>
    </div>
  ),
});

function ArticleError() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-xl p-8 text-center">
      <p className="font-bold">This post didn't load.</p>
      <button className="mt-4 border-2 border-foreground px-4 py-2 font-mono text-sm font-bold uppercase" onClick={() => router.invalidate()}>
        Try again
      </button>
    </div>
  );
}

function ArticlePage() {
  const { slug } = Route.useParams();
  const { data: a } = useSuspenseQuery(articleQuery(slug));
  if (!a) return null;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <BlogHeader />
      <main className="mx-auto max-w-3xl px-4 sm:px-6">
        <nav aria-label="Breadcrumb" className="pt-8 font-mono text-xs uppercase text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link to="/" className="hover:text-foreground">Home</Link></li>
            <li aria-hidden>/</li>
            <li><Link to="/blog" className="hover:text-foreground">Blog</Link></li>
            <li aria-hidden>/</li>
            <li className="truncate text-foreground" aria-current="page">{a.title}</li>
          </ol>
        </nav>
        <article className="pb-8">
          <header className="border-b-2 border-foreground pb-6 pt-6">
            <p className="font-mono text-xs font-bold uppercase tracking-wide text-verified">{a.category}</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">{a.title}</h1>
            <p className="mt-4 text-sm text-muted-foreground">
              By <span className="font-semibold text-foreground">{a.author_name}</span> · {formatUkDate(a.published_at)} · {readingMinutes(a.content_markdown)} min read
            </p>
            {a.legal_checked_at ? (
              <p className="mt-4 inline-block border-2 border-verified px-3 py-1.5 font-mono text-xs font-bold uppercase text-verified">
                Legal information last checked: {formatUkDate(a.legal_checked_at)}
              </p>
            ) : null}
          </header>
          <div className="text-base sm:text-lg" dangerouslySetInnerHTML={{ __html: renderMarkdown(a.content_markdown) }} />
          <p className="mt-10 border-t border-border pt-4 text-sm text-muted-foreground">
            General information, not legal advice. Check current guidance at nidirect.gov.uk.
          </p>
        </article>
      </main>
      <BlogFooter />
    </div>
  );
}
