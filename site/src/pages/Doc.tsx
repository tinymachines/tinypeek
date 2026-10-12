import { useEffect, useMemo, useRef } from "react";
import { marked } from "marked";
import { navigate } from "@tinymachines/kit/lib/router";
import { DOCS, blob, type DocInfo } from "../docs";

// A document of the repository, rendered as it is. The Markdown is the repository's own (read at build
// time, src/docs.ts), which is why it may be set as HTML here; nothing a visitor types reaches it.
// After it is drawn: every heading gets an id so the document's own anchors work, a link to a sibling
// document becomes its page here, and a link to any other file of the repository goes to GitHub.

const slug = (s: string) => s.toLowerCase().replace(/[`*_]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");

function resolve(doc: DocInfo, href: string): { page?: string; url?: string } {
  if (/^(https?:|mailto:|#)/.test(href)) return { url: href };
  const [path, hash = ""] = href.split("#");
  // the file this link names, relative to the document's own place in the repository
  const file = new URL(path, `https://repo.invalid/${doc.file}`).pathname.slice(1);
  const sibling = DOCS.find((d) => d.file === file);
  if (sibling) return { page: sibling.path + (hash ? `#${hash}` : "") };
  return { url: blob(file) + (hash ? `#${hash}` : "") };
}

export default function Doc({ doc }: { doc: DocInfo }) {
  const html = useMemo(() => marked.parse(doc.md, { async: false, gfm: true }), [doc.md]);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const seen = new Map<string, number>();
    for (const h of el.querySelectorAll<HTMLElement>("h1, h2, h3, h4")) {
      let id = slug(h.textContent ?? "");
      const n = seen.get(id) ?? 0;
      seen.set(id, n + 1);
      if (n) id += `-${n}`;
      h.id = id;
    }
    for (const a of el.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      const to = resolve(doc, a.getAttribute("href") ?? "");
      if (to.page) {
        a.setAttribute("href", to.page);
        a.addEventListener("click", (e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          navigate(to.page!);
        });
      } else if (to.url) a.setAttribute("href", to.url);
    }
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }, [doc, html]);
  return (
    <article className="doc">
      <p className="kicker">tinypeek · <b>{doc.kicker}</b></p>
      <div className="body" ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
      <p className="source">As it is in the repository: <a href={blob(doc.file)}>{doc.file}</a>.</p>
    </article>
  );
}
