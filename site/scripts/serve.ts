// Serve a built site the way nginx does in production: static files, a directory's index.html (the lens at
// /lens/), a redirect from a directory without its slash, and the app's index.html for any other path (the
// app routes). For the checks; not a deploy path.
//   bun run scripts/serve.ts [dist] [port]      default dist/, port 4411, binds 127.0.0.1
import { existsSync, statSync } from "fs";
import { join, normalize } from "path";

const dist = process.argv[2] ?? join(import.meta.dir, "..", "dist");
const port = Number(process.argv[3] ?? 4411);
const shell = Bun.file(join(dist, "index.html"));
const noCache = { "cache-control": "no-cache" };

Bun.serve({
  hostname: "127.0.0.1", port,
  async fetch(req) {
    const p = decodeURIComponent(new URL(req.url).pathname);
    const full = normalize(join(dist, p));
    if (!full.startsWith(dist)) return new Response("no", { status: 403 });
    if (existsSync(full)) {
      if (statSync(full).isDirectory()) {
        if (!p.endsWith("/")) return Response.redirect(`${p}/`, 301);
        const index = join(full, "index.html");
        if (existsSync(index)) return new Response(Bun.file(index), { headers: noCache });
      } else {
        return new Response(Bun.file(full), { headers: p.endsWith("sw.js") ? noCache : {} });
      }
    }
    // the lens is served as files only: a missing one is a miss, never the app's shell
    if (p.startsWith("/lens/")) return new Response("not here", { status: 404 });
    return new Response(shell, { headers: { "content-type": "text/html; charset=utf-8", ...noCache } });
  },
});
console.log(`serving ${dist} at http://127.0.0.1:${port}`);
