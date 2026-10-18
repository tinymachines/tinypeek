// Who this app is: plain data, no kit code, so vite.config.ts can import it too (for the manifest and
// /seo.json). src/app.ts hands it to the kit; main.tsx imports that first.
import type { AppConfig } from "@tinymachines/kit/app";

declare const __APP_VERSION__: string;
declare const __GIT_COMMIT__: string;
declare const __BUILD_DATE__: string;
const build = typeof __APP_VERSION__ === "string" ? { version: __APP_VERSION__, commit: __GIT_COMMIT__, date: __BUILD_DATE__ } : { version: "0.0.0", commit: "node", date: new Date().toISOString() };

export const APP: AppConfig = {
  name: "tinypeek",
  tagline: "every real thing on a machine has an address, and every address says what it is connected to",
  site: "https://tinypeek.tinymachines.ai",
  prefix: "tinypeek",
  logo: "/logo.svg",
  build,
  theme: { default: "paper" },
  // the kit's shared account service (nginx sends /api/ to it) and Your files at /files
  yourFiles: "/files",
  // the lens and the helper are served beside the app, not by it: a link to /lens/ or /helper/ is a full load
  outside: /^\/(lens|helper)(\/|$)/,
  pages: [
    { path: "/", title: "tinypeek", card: "home", index: true, kicker: "the tm:// protocol", description: "The tm:// protocol: a read-only URI namespace over MCP, its spec, a browser for it, and the three projects built on it." },
    { path: "/spec", title: "The spec", card: "plain", index: true, kicker: "spec", description: "The tm:// protocol specification, as it is in the repository. Every section is marked shipped, partial or planned." },
    { path: "/explainer", title: "The explainer", card: "plain", index: true, kicker: "explainer", description: "The plain-language companion to the spec: what MCP gives you, what tinypeek adds, and where each layer stops." },
    { path: "/family", title: "Who does what", card: "plain", index: true, kicker: "the tiny family", description: "The four projects around the protocol, and the line that keeps them clean: only helpers write." },
    { path: "/showcase", title: "Built on it", card: "plain", index: true, kicker: "showcase", description: "tinylens, tinyhelper and tinyagent: what each does, shown on real reads where they are public." },
    { path: "/scan", title: "Scan a code", card: "plain", index: true, kicker: "scan",
      description: "Read a QR code with the camera or from a photo, on this phone, and see what it holds before anything opens." },
    { path: "/theme", title: "Themes", card: "theme", index: true, kicker: "theme", description: "Pick, build and share a theme, set the text size and the font. Every theme is checked for contrast before it can be kept." },
    { path: "/app", title: "This app", card: "plain", index: true, kicker: "app", description: "Install it on your phone or computer. It works offline." },
    { path: "/share", title: "Shared with tinypeek", card: "plain", index: false, kicker: "share", description: "What you have shared here from other apps. It lands in Your files." },
    { path: "/account", title: "Your account", card: "plain", index: false, kicker: "account", description: "Sign in to tinypeek with a passkey: one account for every tinymachines app." },
    { path: "/files", title: "Your files", card: "plain", index: false, kicker: "files", description: "Your files: kept on this device and, signed in, in your account, so every device you sign in on has them." },
  ],
  doors: [
    { id: "home", title: "Home", hint: "The front door.", pages: [{ href: "/", title: "Home", hint: "Where it starts." }] },
    { id: "protocol", title: "The protocol", hint: "The spec, its explainer, and who does what.", pages: [
      { href: "/spec", title: "The spec", hint: "Every section marked shipped, partial or planned." },
      { href: "/explainer", title: "The explainer", hint: "What MCP gives you, what tinypeek adds, where to stop." },
      { href: "/family", title: "Who does what", hint: "Four projects, one line: only helpers write." },
    ] },
    { id: "built", title: "Built on it", hint: "A browser for tm://, and the projects beside it.", pages: [
      { href: "/lens/", title: "tinylens", hint: "The browser: read the live namespace from here." },
      { href: "/showcase", title: "The showcase", hint: "tinylens, tinyhelper and tinyagent, as they stand." },
    ] },
    { id: "you", title: "You", hint: "Your account, your files, how the app looks, this device.", pages: [
      { href: "/account", title: "Your account", hint: "A passkey.", me: true },
      { href: "/scan", title: "Scan a code", hint: "A QR code, with the camera or from a photo." },
      { href: "/theme", title: "Themes", hint: "Colours, text size, the reading font." },
      { href: "/files", title: "Your files", hint: "Kept here and, signed in, in your account." },
      { href: "/share", title: "Shared with tinypeek", hint: "What other apps sent here." },
      { href: "/app", title: "This app", hint: "Install it, and it works offline." },
    ] },
  ],
  shortcuts: [
    { id: "spec", label: "The spec", href: "/spec" },
    { id: "lens", label: "tinylens", href: "/lens/" },
    { id: "explainer", label: "The explainer", href: "/explainer" },
    { id: "scan", label: "Scan", href: "/scan" },
    { id: "theme", label: "Themes", href: "/theme" },
    { id: "app", label: "This app", href: "/app" },
    { id: "files", label: "Your files", href: "/files" },
    { id: "account", label: "Account", href: "/account" },
  ],
  defaultShortcuts: ["spec", "lens", "scan"],
};
