// The site's done-check, against a served build (the kit's kit check serves it): every page opens with no error and fits
// a phone, the frame carries the name and the mark, each document shows its own first heading with anchors
// on its sections and no link left pointing at a Markdown file, the lens and LensKit are served beside the app as files,
// the Menu lists the doors, a theme pick is kept under the app's own prefix and survives a reload, the
// share panel draws a QR code, Your files keeps a picked file on this device and a file shared from another app lands there,
// the app page reads the offline copy, and the spec opens offline.
//   bun run scripts/check-site.ts [origin]      default http://127.0.0.1:4411
import puppeteer, { type Page } from "puppeteer-core";
import { mkdtempSync as kfMkdtemp, writeFileSync as kfWrite } from "node:fs";
import { tmpdir as kfTmp } from "node:os";
import { join as kfJoin } from "node:path";

const origin = (process.argv[2] ?? "http://127.0.0.1:4411").replace(/\/$/, "");
let fails = 0;
const ok = (good: boolean, what: string) => { if (!good) fails++; console.log(`${good ? "OK  " : "FAIL"} ${what}`); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox", "--disable-gpu"] });
const ctx = await browser.createBrowserContext();
const page: Page = await ctx.newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
let offline = false;
page.on("console", (m) => { if (m.type() === "error" && !offline && !/status of 401/.test(m.text())) errors.push(m.text()); });   // 401: the account service, to a reader not signed in
await page.setViewport({ width: 390, height: 844 });
const text = (sel: string) => page.evaluate((s) => document.querySelector(s)?.textContent?.trim() ?? "", sel);
const clickText = (sel: string, t: string) => page.evaluate((s, t) => { const el = [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.textContent?.includes(t)); el?.click(); return !!el; }, sel, t);

// 1. every page, no errors, the frame, a phone's width
for (const p of ["/", "/spec", "/explainer", "/family", "/showcase", "/theme", "/app", "/share", "/account", "/files", "/nowhere"]) {
  await page.goto(`${origin}${p}`, { waitUntil: "networkidle0" });
  const h1 = await text("main h1");
  const brand = await text("header .brand");
  const logo = await page.evaluate(() => (document.querySelector("header .brand img") as HTMLImageElement | null)?.naturalWidth ?? 0);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  ok(h1.length > 0 && brand === "tinypeek" && logo > 0 && !wide, `${p}: "${h1.slice(0, 50)}", brand "${brand}", logo ${logo}px, ${wide ? "SCROLLS SIDEWAYS" : "fits a phone"}`);
}
ok(await text("main h1") === "Not here", "an unknown address says Not here");
ok(await page.title() === "Not here · tinypeek", `the tab's title follows the page (${await page.title()})`);

// 2. the documents: the repository's own first heading, anchors on the sections, links resolved
const docs: [string, RegExp][] = [["/spec", /^tm:\/\/ Protocol Spec/], ["/explainer", /^The tm:\/\/ Stack/], ["/family", /^The tiny family/]];
for (const [p, h] of docs) {
  await page.goto(`${origin}${p}`, { waitUntil: "networkidle0" });
  const h1 = await text("main .doc .body h1");
  const anchors = await page.evaluate(() => document.querySelectorAll("main .doc .body h2[id]").length);
  // a link to a Markdown file is either a page here or a GitHub address; a relative one left as it is would 404
  const md = await page.evaluate(() => [...document.querySelectorAll<HTMLAnchorElement>("main .doc a[href]")].filter((a) => { const h = a.getAttribute("href") ?? ""; return /\.md(#|$)/.test(h) && !/^https:\/\/github\.com\//.test(h); }).length);
  const tables = await page.evaluate(() => document.querySelectorAll("main .doc .body table").length);
  ok(h.test(h1) && anchors >= 3 && md === 0, `${p}: "${h1.slice(0, 40)}", ${anchors} sections with anchors, ${tables} tables, ${md} links still at a .md file`);
}
ok(await page.title() === "Who does what · tinypeek", `a document's tab title is the page table's (${await page.title()})`);
await page.goto(`${origin}/spec#version-history`, { waitUntil: "networkidle0" });
await sleep(300);
ok((await page.evaluate(() => window.scrollY)) > 1000, "the spec's own anchor scrolls to its section");

// 3. the lens, served beside the app as files
const lens = await fetch(`${origin}/lens/`);
const lensHtml = await lens.text();
ok(lens.ok && lensHtml.includes("tinylens") && lensHtml.includes("src/main.js"), `/lens/ is the lens (${lens.status}, ${lensHtml.length} bytes)`);
const core = await fetch(`${origin}/lens/src/core.js`);
ok(core.ok && /javascript/.test(core.headers.get("content-type") ?? ""), `/lens/src/core.js is served as JavaScript (${core.headers.get("content-type")})`);
const miss = await fetch(`${origin}/lens/nothing.js`);
ok(miss.status === 404, `a missing lens file is a miss, not the app's shell (${miss.status})`);
// LensKit, beside the lens: its page, a module it imports from the lens's source, and nothing from another host
const kit = await fetch(`${origin}/lens/kit/`);
const kitHtml = await kit.text();
ok(kit.ok && kitHtml.includes("LensKit") && kitHtml.includes("main.js") && !/<(?:link|script)\b[^>]*\b(?:href|src)="https?:/.test(kitHtml), `/lens/kit/ is LensKit, fetching from no other host (${kit.status}, ${kitHtml.length} bytes)`);
const kitJs = await fetch(`${origin}/lens/kit/helper.js`);
ok(kitJs.ok && /javascript/.test(kitJs.headers.get("content-type") ?? ""), `/lens/kit/helper.js is served as JavaScript (${kitJs.headers.get("content-type")})`);
await page.goto(`${origin}/lens/kit/?recorded`, { waitUntil: "networkidle0" });
const kitUp = await page.waitForFunction(() => (window as unknown as { kit?: { settled(): boolean } }).kit?.settled(), { timeout: 20000 }).then(() => true, () => false);
ok(kitUp, "LensKit opens on the recorded walk and settles");
const slash = await fetch(`${origin}/lens`, { redirect: "manual" });
ok(slash.status === 301 && (slash.headers.get("location") ?? "").endsWith("/lens/"), `/lens goes to /lens/ (${slash.status})`);
// the helper, fronted at /helper/: with the app's worker in charge, a visit there reaches the service, never the shell
await page.goto(`${origin}/`, { waitUntil: "networkidle0" });
await page.evaluate(() => navigator.serviceWorker.ready);
// in a tab of its own, under the same worker: a JSON page has no icon, and Chrome's ask for /favicon.ico is not the site's error
const helperTab = await ctx.newPage();
await helperTab.goto(`${origin}/helper/health`, { waitUntil: "networkidle0" });
const health = await helperTab.evaluate(() => document.body.innerText);
await helperTab.close();
let helperUp = false;
try { helperUp = JSON.parse(health).ok === true; } catch { /* the shell, or nothing */ }
ok(helperUp, `/helper/health is the helper, past the worker (${health.slice(0, 60).replace(/\s+/g, " ")})`);
const anon = await fetch(`${origin}/helper/v1/findings`);
ok(anon.ok && Array.isArray(await anon.json()), `/helper/v1/findings answers a reader without the token (${anon.status})`);
await page.goto(`${origin}/showcase`, { waitUntil: "networkidle0" });
const walk = await page.evaluate(() => (document.querySelector<HTMLAnchorElement>("main .walks a"))?.getAttribute("href") ?? "");
ok(walk.startsWith("/lens/?uri=tm%3A%2F%2F"), `the showcase's walks open the lens on an address (${walk.slice(0, 40)})`);

// 4. the Menu: the app's doors
await page.goto(`${origin}/`, { waitUntil: "networkidle0" });
await page.click("header .menu-btn");
await sleep(300);
const doors = await page.evaluate(() => { const el = document.getElementById("tc-menu"); return [...(el?.shadowRoot?.querySelectorAll("button, a") ?? [])].map((b) => b.textContent?.trim() ?? "").filter(Boolean); });
ok(doors.some((d) => d.startsWith("The protocol")) && doors.some((d) => d.startsWith("Built on it")), `the Menu lists the doors: ${doors.slice(0, 6).join(" | ")}`);

// 5. a theme pick repaints, is kept under the app's prefix, survives a reload with no light flash
await page.goto(`${origin}/theme`, { waitUntil: "networkidle0" });
ok(await clickText(".theme-pick", "Night"), "the theme page offers Night");
await sleep(200);
const sheet = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--sheet").trim());
const kept = await page.evaluate(() => ({ theme: localStorage.getItem("tinypeek:theme"), css: !!localStorage.getItem("tinypeek:theme-css"), old: localStorage.getItem("tc:theme") }));
ok(sheet === "#18222e" && !!kept.theme && kept.css && kept.old === null, `Night: panels ${sheet}, kept as tinypeek:theme (not tc:theme)`);
await page.goto(`${origin}/spec`, { waitUntil: "domcontentloaded" });
const early = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
ok(early === "rgb(15, 22, 32)", `reload: the page is dark before the app runs (${early})`);

// 6. the share panel: the link, the picture, a QR code
await page.goto(`${origin}/theme`, { waitUntil: "networkidle0" });
ok(await clickText("button", "Share this theme"), "Share this theme opens the panel");
await sleep(500);
await clickText("button", "QR code");
await sleep(300);
const share = await page.evaluate(() => ({ qr: [...document.querySelectorAll("svg path")].some((p) => (p.getAttribute("d")?.length ?? 0) > 2000), places: document.querySelectorAll("a").length }));
ok(share.places >= 10 && share.qr, `the panel lists the places (${share.places} links) and draws a QR code`);

// 6b. your files, signed out: a file picked through <tc-pick> is kept on this device, and opens (the kit's Your files)
const kfSample = kfJoin(kfMkdtemp(kfJoin(kfTmp(), "tinypeek-check-")), "hello.txt");
kfWrite(kfSample, "hello from tinypeek's check\n");
await page.goto(`${origin}/files`, { waitUntil: "networkidle0" });
const kfInput = await page.evaluateHandle(() => document.querySelector("tc-pick")!.shadowRoot!.querySelector("input.files"));
await (kfInput as unknown as { uploadFile(p: string): Promise<void> }).uploadFile(kfSample);
let kfRows: string[] = [];
for (let i = 0; i < 40 && !kfRows.some((r) => r.startsWith("hello.txt")); i++) { await sleep(250); kfRows = await page.evaluate(() => [...document.querySelectorAll(".kfiles li")].map((li) => `${li.querySelector(".open")?.textContent} | ${li.querySelector(".state")?.textContent}`)); }
ok(kfRows.some((r) => /^hello\.txt \| On this device/.test(r)), `your files: a picked file is kept on this device (${kfRows.join("; ")})`);
await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".kfiles .open")].find((e) => e.textContent?.includes("hello.txt"))?.click());
await page.waitForSelector(".kfile-view pre", { timeout: 4000 }).catch(() => null);
ok((await text(".kfile-view pre")).startsWith("hello from tinypeek's check"), "your files: opening it shows what it holds");
// a file shared to tinypeek from another app (the Share menu's multipart POST, taken by the service worker) lands there
await page.goto(`${origin}/app`, { waitUntil: "networkidle0" });
await page.evaluate(() => navigator.serviceWorker.ready);
const kfLanded = await page.evaluate(async () => {
  const form = new FormData();
  form.append("files", new File(["shared from another app\n"], "shared note.txt", { type: "text/plain" }));
  const r = await fetch("/share", { method: "POST", body: form });
  return new URL(r.url).pathname + new URL(r.url).search;
});
await page.goto(`${origin}${kfLanded}`, { waitUntil: "networkidle0" });
await page.waitForFunction(() => /Open it in Your files/.test(document.querySelector("main")?.textContent ?? ""), { timeout: 8000 }).catch(() => null);
ok(/Open it in Your files/.test(await text("main")), `share: the share page says the file went to Your files (${kfLanded})`);
await page.goto(`${origin}/files`, { waitUntil: "networkidle0" });
kfRows = [];
for (let i = 0; i < 40 && !kfRows.some((r) => r.startsWith("shared note.txt")); i++) { await sleep(250); kfRows = await page.evaluate(() => [...document.querySelectorAll(".kfiles li .open")].map((b) => b.textContent ?? "")); }
ok(kfRows.includes("shared note.txt"), `share: it is in Your files (${kfRows.join("; ")})`);

// 7. the app page reads the worker's offline copy, and the spec opens offline
await page.goto(`${origin}/app`, { waitUntil: "networkidle0" });
await sleep(1500);
await page.reload({ waitUntil: "networkidle0" });
await sleep(1000);
const kv = await page.evaluate(() => [...document.querySelectorAll("dl.kv dt")].map((dt) => `${dt.textContent}: ${dt.nextElementSibling?.textContent}`));
ok(kv.some((l) => l.startsWith("offline copy:") && /files/.test(l)), `the worker's copy: ${kv.find((l) => l.startsWith("offline copy:"))}`);
offline = true;
await page.setOfflineMode(true);
await page.goto(`${origin}/spec`, { waitUntil: "domcontentloaded" }).catch(() => null);
await sleep(500);
ok(/^tm:\/\/ Protocol Spec/.test(await text("main .doc .body h1")), `offline: /spec opens from the cache ("${(await text("main .doc .body h1")).slice(0, 30)}")`);
await page.setOfflineMode(false);
offline = false;

// tinypeek's own API (api/, the kit's kitapi), through the same /api/ the pages use: the base routes, as this site at HEAD
const head = Bun.spawnSync(["git", "rev-parse", "--short", "HEAD"]).stdout.toString().trim();
const baseJson = (path: string) => fetch(`${origin}${path}`, { headers: { "cache-control": "no-cache" } }).then((r) => r.ok ? r.json() : { status: r.status }).catch(() => null);
const [bHealth, bAbout, bWhoami] = await Promise.all([baseJson("/api/v1/health"), baseJson("/api/v1/about"), baseJson("/api/v1/whoami")]);
ok(bHealth?.ok === true && bHealth.app === "tinypeek", `the API answers /api/v1/health (${JSON.stringify(bHealth)})`);
ok(bAbout?.id === "tinypeek" && bAbout.commit === head, `/api/v1/about: ${bAbout?.id} at ${bAbout?.commit ?? "no answer"} (HEAD ${head}), kitapi ${bAbout?.kitapi}`);
ok(bWhoami?.signed_in === false, `/api/v1/whoami, signed out: nobody (${JSON.stringify(bWhoami)})`);

ok(errors.length === 0, errors.length ? `page errors: ${errors.join(" | ").slice(0, 400)}` : "no page errors anywhere");
await browser.close();
console.log(fails ? `check-site: ${fails} FAILED` : "check-site: ALL OK");
process.exit(fails ? 1 : 0);
