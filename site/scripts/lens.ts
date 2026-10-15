// Put the lens beside the app: copy what tinylens serves (its page, its source, LensKit and the recorded walk) from
// the submodule at extern/tinylens into public/lens, which Vite ships as it is at /lens/. The build runs
// this first. It refuses when the submodule is empty: a site with no lens must not pass as one with it.
//   bun run scripts/lens.ts
import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
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
mkdirSync(join(dst, "fixtures"));
cpSync(join(src, "fixtures", "walk.json"), join(dst, "fixtures", "walk.json"));
console.log(`lens: ${dst} from ${src}`);
