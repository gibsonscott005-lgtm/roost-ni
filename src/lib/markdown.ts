// Small, dependency-free Markdown renderer (headings, bold, italic, lists, links,
// blockquotes, GFM tables, code). Escapes all HTML so article text cannot inject markup.

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function safeHref(url: string): string | null {
  const u = url.trim();
  if (/^(https?:|mailto:)/i.test(u) || u.startsWith("/") || u.startsWith("#")) return u;
  return null;
}

export function inline(text: string): string {
  const codes: string[] = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(`<code class="rounded bg-muted px-1 font-mono text-[0.9em]">${esc(c)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
    const href = safeHref(url.replace(/&amp;/g, "&"));
    if (!href) return label;
    const ext = /^https?:/i.test(href) && !/^https?:\/\/(www\.)?roostni\.co\.uk/i.test(href);
    return `<a href="${esc(href)}" class="font-semibold text-verified underline underline-offset-2"${ext ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/__([^_]+)__/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
}

const splitRow = (line: string) =>
  line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (/^```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre class="my-5 overflow-x-auto rounded-sm border border-border bg-muted p-4 text-sm"><code>${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = Math.min(Math.max(h[1].length, 2), 4);
      const cls = level === 2 ? "mt-10 text-2xl font-extrabold sm:text-3xl" : level === 3 ? "mt-8 text-xl font-bold" : "mt-6 text-lg font-bold";
      out.push(`<h${level} class="${cls}">${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,})\s*$/.test(line)) { out.push('<hr class="my-8 border-border" />'); i++; continue; }

    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
      const head = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) rows.push(splitRow(lines[i++]));
      out.push(
        `<div class="my-6 overflow-x-auto"><table class="w-full min-w-[480px] border-collapse text-left text-sm"><thead><tr>${head
          .map((c) => `<th class="border-2 border-foreground bg-muted px-3 py-2 font-bold">${inline(c)}</th>`)
          .join("")}</tr></thead><tbody>${rows
          .map((r) => `<tr>${head.map((_, j) => `<td class="border border-border px-3 py-2 align-top">${inline(r[j] ?? "")}</td>`).join("")}</tr>`)
          .join("")}</tbody></table></div>`,
      );
      continue;
    }

    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote class="my-6 border-l-4 border-verified bg-muted/50 py-3 pl-4 pr-3">${renderMarkdown(buf.join("\n"))}</blockquote>`);
      continue;
    }

    const ul = /^\s*[-*+]\s+/;
    const ol = /^\s*\d+[.)]\s+/;
    if (ul.test(line) || ol.test(line)) {
      const ordered = ol.test(line);
      const re = ordered ? ol : ul;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].replace(re, ""));
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag} class="my-5 ${ordered ? "list-decimal" : "list-disc"} space-y-2 pl-6">${items.map((t) => `<li>${inline(t)}</li>`).join("")}</${tag}>`);
      continue;
    }

    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|>|```|\s*[-*+]\s|\s*\d+[.)]\s)/.test(lines[i])) buf.push(lines[i++]);
    if (!buf.length) { buf.push(lines[i++]); }
    out.push(`<p class="my-5 leading-relaxed">${inline(buf.join(" "))}</p>`);
  }
  return out.join("\n");
}
