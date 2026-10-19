# The tiny family: who does what

Decided by the owner on 2026-10-12. tinypeek gets a public site that shows the protocol and the three projects built on it. This page says which project does what, so each stays small and none quietly takes on another's job.

## The four

| Project | What it is | Reads | Writes |
|---|---|---|---|
| **tinypeek** | The `tm://` protocol: the spec, and now its public site | | the spec and the site |
| **tinylens** | A browser for `tm://`, served by tinypeek's site | the namespace, and anything helpers have made | nothing |
| **tinyhelper** | Every service that crawls or generates: indexes, answers to questions, frames and playbacks from the console | the namespace | findings, as files a mount serves |
| **tinyagent** | An inbox for the owner's agents, already read by Snail Mail | agents' session logs and watched issues | envelopes, and the owner's replies, word for word |

## The line that keeps it clean

**Only helpers write.** Crawling and generating both live in tinyhelper:

- **An index** is a helper that walks the namespace (the link crawler in `public` is most of one already) and keeps what it found as files.
- **An answer** is a helper that sends a question to the Claude API and keeps the reply as it came.
- **A frame or a playback** is a helper that runs the console from a saved state and keeps what it measured.

Each finding is served read-only by a mount at its own address, linked both ways to what it is about. The protocol never gains a write verb, so the namespace stays read-only.

**tinylens only reads.** It is the test of layer 2: built over the live server without changing anything below it, and saying so every time it has to work around the addressing (`docs/lens.md`). When it shows search results or an answer, it reads them through the namespace like anything else. Its ask button calls a tinyhelper service; it hosts no service of its own. If the lens ever hosted endpoints that wrote, it could quietly fix in its own backend the very gaps it exists to report.

**tinyagent is the same pattern, kept apart.** An observer reads something, writes an envelope, and the envelope has an address. It stays its own project because Snail Mail already depends on it.

## The public site

The site lives in this repository and serves:

- **The protocol**: the spec and the plain-language explainer, as they are here.
- **tinylens**: the browser itself, reading the live namespace from the visitor's browser. The namespace allows any origin, so no proxy is needed.
- **tinyhelper's answers**, at `/helper/`. The ask box in tinylens asks there with the helper's token, and anyone can read what was answered.
- **Showcases** of tinylens, tinyhelper and tinyagent: what each does, shown on real reads where they are public.

Two things it never shows:

- **TinyAgent's live roster or anything an agent said.** Agents' words can hold clients and keys. Its showcase uses examples made for the purpose.
- **A finding derived from a commercial cartridge**: a frame, a state or a sound from a game we do not own. Our own lesson cartridges are fine.

This is a change to what this repository holds. Until now it held the protocol only; it now holds the protocol and its site. The MIT licence still covers it, which stays true only while no die data and no ROM content lands here.

## What each repository needs next

| | |
|---|---|
| tinypeek | The site: its build, the pages above, and serving tinylens's HTML. Who runs it on the box is the owner's call |
| tinylens | Nothing changes: it stays HTML and JavaScript that reads. Its README says it is served by this site |
| tinyhelper | An `index` driver beside `ask`, `frame` and `playback` (its `docs/pattern.md`) |
| tinyagent | Nothing. Snail Mail keeps reading it as it does |

## Not covered

- The site's design: the family look is the owner's, as everywhere else.
- How the site is deployed and on which name.
- Whether any finding besides an answer is ever made public. An answer is made from the public namespace, so a read without the token sees it; every other driver's finding needs the token. Private stays the default.
