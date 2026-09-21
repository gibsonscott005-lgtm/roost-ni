/**
 * Daily reminder job.
 *
 * Called once a day by a scheduled database job. Public prefix, so the shared
 * secret in the header is the only thing standing between the internet and a
 * run — the handler answers 401 without it and never reveals why.
 */
import { createFileRoute } from "@tanstack/react-router";

async function handle(request: Request) {
  const expected = process.env["REMINDERS_CRON_SECRET"];
  if (!expected) return new Response("Not configured", { status: 503 });

  const provided =
    request.headers.get("x-reminders-secret") ??
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");

  // Constant-time-ish comparison: equal length check first, then byte compare.
  const ok =
    provided.length === expected.length &&
    provided.split("").reduce((acc, ch, i) => acc + (ch === expected[i] ? 0 : 1), 0) === 0;

  if (!ok) return new Response("Unauthorized", { status: 401 });

  const { runDailyReminders } = await import("@/lib/reminders.server");
  const result = await runDailyReminders();

  return new Response(JSON.stringify(result), {
    status: result.errors.length > 0 ? 207 : 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/daily-reminders")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
      GET: ({ request }) => handle(request),
    },
  },
});
