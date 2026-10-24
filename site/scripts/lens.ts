// Put the lens beside the app: copy what tinylens serves (its page, its source, LensKit, its panels and the recorded walk) from
// the submodule at extern/tinylens into public/lens, which Vite ships as it is at /lens/. The build runs
// this first. It refuses when the submodule is empty: a site with no lens must not pass as one with it.
//   bun run scripts/lens.ts
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "fs";
import { join } from "path";

const site = join(import.meta.dir, "..");
const src = join(site, "..", "extern", "tinylens");
const dst = join(site, "public", "lens");
if (!existsSync(join(src, "index.html"))) {
  console.error(`refusing: ${src} has no index.html. The tinylens submodule is empty: git submodule update --init`);
  process.exit(1);
}
rmSync(dst, { recursive: true, force: true });
mkdirSync(dst, { recursive: true });
cpSync(join(src, "index.html"), join(dst, "index.html"));
cpSync(join(src, "src"), join(dst, "src"), { recursive: true });
// LensKit, at /lens/kit/: its modules import ../src/, so it sits beside the lens's source
if (!existsSync(join(src, "kit", "index.html"))) {
  console.error(`refusing: ${src} has no kit/index.html. The tinylens pin is older than LensKit`);
  process.exit(1);
}
cpSync(join(src, "kit"), join(dst, "kit"), { recursive: true });
// LensKit draws panels (tinylens#3): the contract and host at /lens/panel/, the modules and the registry it falls back
// to at /lens/panels/ (the bundles, not their sources), and the one module of the blocks page they import. The blocks
// page itself is not served here.
if (existsSync(join(src, "panel"))) {
  cpSync(join(src, "panel"), join(dst, "panel"), { recursive: true });
  mkdirSync(join(dst, "panels"));
  for (const f of readdirSync(join(src, "panels"))) {
    if (f.endsWith(".js") || f === "registry.json") cpSync(join(src, "panels", f), join(dst, "panels", f));
  }
  mkdirSync(join(dst, "blocks"));
  cpSync(join(src, "blocks", "vocab.js"), join(dst, "blocks", "vocab.js"));
}
mkdirSync(join(dst, "fixtures"));
cpSync(join(src, "fixtures", "walk.json"), join(dst, "fixtures", "walk.json"));
// LensKit's recorded mode draws its panels from the blocks recording (tinylens#3), so it ships beside the walk.
if (existsSync(join(src, "fixtures", "blocks.json"))) cpSync(join(src, "fixtures", "blocks.json"), join(dst, "fixtures", "blocks.json"));
console.log(`lens: ${dst} from ${src}`);
