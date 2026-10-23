# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

**tinypeek is the home of the `tm://` protocol**: a read-only URI namespace
over MCP, in which every real thing on a machine (its sites, repositories
and files) has an address, and every address carries typed links to what it
is connected to. This repository holds the protocol only:

| | |
|---|---|
| `spec/tm-protocol-spec.md` | the spec, v0.28, built 2026-10-23 and live on the next `public` deploy (v0.27 live since 2026-10-23). Its version history is at the end. Every section is marked `[shipped]`, `[partial]` or `[planned]`, with the ticket that moves it |
| `docs/stack-explainer.md` | the plain-language companion; its section 7 is a status snapshot |
| `README.md` | the front page |
| `docs/family.md` | who does what: tinypeek, tinylens, tinyhelper and tinyagent, and the public site this repository now carries (decided 2026-10-12) |
| `site/` | the public site, `tinypeek.tinymachines.ai`, an app on the tinymachines kit. Its own `README.md` says how to run, check and deploy it |
| `extern/tinylens` | tinylens as a submodule; the site copies what it serves to `/lens/` at build time. Move it like the pin in `public`: fetch, checkout, commit the submodule |
| `LICENSE` | MIT. No visual6502 die data and no ROM content may ever land here; that is why it can be MIT |

It is public on GitHub (`tinymachines/tinypeek`, public since 2026-10-09).

**Since 2026-10-12 it also carries a public site** that shows the protocol and serves tinylens, with showcases of the projects built on it (`docs/family.md`). The rule that keeps the family clean: only tinyhelper writes; tinylens only reads. The site's gate is `bun run check` in `site/` (the kit's `kit check`), which must end in `ALL OK` before a commit that changes `site/`. Deploying the site is the owner's word, typed in your session, as with `public`; `bun run deploy` in `site/` (the kit's `kit deploy`) refuses a dirty tree or a commit the check has not passed on.

## The server is in another repository

**The reference deployment is `../public`** (`tinymachines/public`), the
tinymachines.ai site, which serves the namespace at
`https://tinymachines.ai/api/mcp` and carries this repository as a
submodule at `extern/tinypeek`. That checkout's own `CLAUDE.md` is the house
rules there and wins over this file for anything you do in it. Read it
before you touch it.

The namespace's code there, which this project now owns:

| | |
|---|---|
| `api/tm.py` | the namespace: mounts, facets, errors, links, the link resolver |
| `api/test_tm.py` | its tests (`cd api && python3 -m pytest -q`) |
| `api/lineage.json` | what a script reads that it did not make, and the `offbox` nodes |
| `api/mcp_server.py` | the MCP transport, including the `instructions` sent at connect |
| `scripts/check-tm-links.py` | the link crawler: every href resolves, every pair has its inverse. The deploy runs it last |
| `api/README.md` | the tm section of the API's readme |
| `docs/mcp-setup-guide.md`, `docs/ja/mcp-setup-guide.md` | the setup guide, a public notebook page in two languages |

**Another session works in `../public` on the website.** Its name starts
with `public-` and changes when it restarts (`public-9b`, then `public-a1`),
so look it up with ListAgents before you message it. It
stays out of the files above and you stay out of everything else there. If
a change needs both sides, message it first.

## How a change flows

1. **Behaviour** changes in `../public/api/`, with a test that fails without
   the change. Watch it fail, then make it pass. Run the whole suite and the
   crawler (`python3 scripts/check-tm-links.py` from `../public`, about a
   minute) before calling it done.
2. **The spec** changes here, in the same piece of work, wherever it states
   that behaviour. Move the section's marker, name the ticket, and keep the
   rule: every rel and facet the server emits appears in the spec, and
   nothing unbuilt is unmarked.
3. **Commit here, then push here before anything else.** Then move the pin in
   `../public` (`git -C extern/tinypeek fetch && git -C extern/tinypeek
   checkout <commit>`, then commit `extern/tinypeek`), so `public` never
   points at a commit GitHub does not have.
4. **Deploying `../public` is the owner's word, typed in your session**, never
   relayed by another session. Its `CLAUDE.md` and `notes/handoff-2026-10-09.md`
   have the procedure. Two other sessions deploy that box as well: message
   the website session and `port-bradley-tinymachines-style` before a deploy and
   again after it. The first to start goes; the other waits.

**Pull before you edit here.** More than one session has pushed to this
repository; a push that is rejected means someone else got there first.
Rebase onto theirs, keep both sides' substance, and say what you kept.

## Writing the spec

- Describe what runs, measured against the live server, not what was meant.
  When a marker says `[shipped]`, the server does it today; check before you
  write it.
- A heading states a fact. Markers read `[shipped: TM-n]`, `[partial: what
  is missing]`, `[planned: TM-n]`.
- The spec is about the protocol; anything particular to `tinymachines` (its
  mounts, its sites, its records) is an example of it and says so.
- No em dashes in new text, and no host detail anywhere: no addresses, no
  machine names, no local paths beyond the two repositories. The older text
  has em dashes the owner wrote; leave them unless the owner asks.
- Plain, warm sentences. Say what is not covered.

## State of the work

**The lens's ideas are settled.** `docs/lens.md` (2026-10-12) is a browser
for tm:// and five layer-2 candidates it would ask for. Between 2026-10-15
and 2026-10-16 the owner took them up in order: the refused parameter
(v0.15, #13), one time axis (v0.16, #15), a readable piece (v0.17, #16), an
address for a set (v0.18, #17), a trail (v0.19, #18), and hosts that are not
machines, decided and not built (v0.20, #19). Each has its reasons in the
spec and a settled line in `docs/lens.md`. An entity at a time
(#21) was built as v0.21 on 2026-10-18. tinyhelper's first ask through
the site (#20) was made and checked live on 2026-10-19: the site fronts it
at `/helper/`, and tinylens's `check-kit --live --helper` asks through it
with the token in `TINYHELPER_TOKEN`, never on a command line.

**The v0.22 handoff is the open work** (`docs/tm-v0_22-handoff.md`, written
2026-10-21). Four additions, in build order: the `mcp` mount (§13, built as
v0.22 on 2026-10-22, tinypeek#22, live the same day), kinds and media types
(§14, built as v0.23 on 2026-10-22, tinypeek#23), panels (§15, tinylens#2 and #3) and writes (§16, tinyhelper#6 to #8). Outside the handoff, the owner asked on 2026-10-22 for a second site on the http mount (tinypeek#24): built as v0.25 on 2026-10-23, it reads the site's sitemap and robots and nothing else, and it reopened the manifest (tinypeek#9) with two sites to design against; a git mount for that site waits on the manifest and the owner's word. The server half of tinylens#2 (§15: the manifest and `?as=blocks`) was built as v0.26 on 2026-10-23; the lens's half (the static page that renders blocks, the walk) and tinylens#3 are the lens session's, briefed on tinylens#2. Both sides of tinyhelper#6 (§13.1, the map) were built as v0.24 and went live on 2026-10-22; the derived maps are tinyhelper's and sit under public's `notes/maps/` (terrapulse with an override, resume; campaignbrain's was retired with the server on 2026-10-23, tinypeek#25). Its
section 4 has the issue texts and the order; its section 6 records the
decisions taken on 2026-10-22 (one host, maps under public's `notes/maps/`,
searches stay tools) and the ones still open (a name for the whole). The
tinyhelper and tinylens issues are those sessions' to build, after
tinypeek's; message them, never build in their repositories unasked.

The owner's work package (a black-box audit of the
namespace, TM-1 to TM-20) is finished and live; it lives in the owner's docs
folder beside these repositories, under `feedback/`, and is in neither
repository. Every issue filed here from the spec's open items is closed. The
spec's version history says what each version changed and when it went live.

What a session picking this up should know that the spec does not say:

| | |
|---|---|
| Where things are in the code | The entity mount is the `Entities` class in `api/tm.py`, with one resolver hook (`inbound`). The mcp mount is the `Mcp` class there, its servers in `api/mcp_servers.json`; a server's token is named in that file and held in the service's environment, never in a repository. A server's map is the `Map` class there, merged from `notes/maps/<server>.json` (the index driver's) and `notes/maps/<server>.override.json` (a person's), read by `Mcp.map` on every access so a new file needs no restart, and served by `Mcp._map_read` and `Mcp._mapped`; the crawler samples each mapped collection at `MCP_SAMPLE` children. A site built elsewhere is the `Sitemap` class there, one per entry of `api/sites.json` whose `pages` is `sitemap`, held in `Namespace.sitemaps`; it is the http mount's only knowledge of such a site, and the crawler probes each of its robots rules. The manifest is `notes/manifest.json` in `public`, served by `Namespace._read_manifest`; `?as=blocks` is the `Blocks` class there, composing from `Namespace._read_typed`, one method per composition and `generic` for the rest. The kind registry is the `Kinds` class there, its counts in `tm-kinds.json` in the service's state directory (`kinds_file_from_env`), never under the checkout; the vocabulary is `KINDS`, and the one place a link is given its target's type is `Namespace.target_type`. The rate limit and the request log are `RateLimit` and `AuditLog` in `api/mcp_server.py`; `api/app.py` passes the caller. `tm://` is `TOP` in `api/tm.py` |
| Checks that cannot be made from outside | The request log is in the service's state directory and is not served, so checking it is a look on the box. No live page's text is over the byte cap, so that refusal is held by the tests |
| One bucket for the box | Sessions on the box share one address, so a crawl over HTTP from any of them draws on one rate bucket. The crawler runs in-process and is not limited |
| Known and stated | A caller inside the rate limit can still fill a day's 8 MiB of the request log by volume |
| TM-17 | Completions. Not a bug: they exist; the auditing client never called them |

Decided and not built, each with its reasons in the spec and what would
reopen it:

| | |
|---|---|
| No link manifest (#9) | Section 8. A second site would reopen it |
| No subscriptions (#11) | Section 4. A client reads `?as=stat` again. A need to know within seconds, or tokens, would reopen it |
| Tokens stay planned (#5) | Section 10, the owner's decision on 2026-10-11. A mount that is not public, or a second client, would schedule it; anonymous reads of public things stay |
| Federation (#10) | Section 5. A server answers for a set of hosts and one is conformant; how two servers find each other waits for a second box |
| Hosts that are not machines (#19) | Section 5. The grammar takes a device or a place as a mount or as a host; the first one with readable state decides which, and schedules federation and tokens if it is a host of its own |

## Traps already paid for

- A check that can pass on nothing is not a check. When the crawler passes,
  break what it guards on purpose and watch it fail. To crawl a change
  against the box's build before it is deployed, run the crawler from a
  worktree with `--repo ../public`.
- The namespace reads the beta's build too, so it can be briefly ahead of a
  beta that has not followed yet; the deploy runs the crawler after the
  follow for that reason.
- Never put a private repository in the git mount: the namespace is public,
  so anything mounted is published.
- `notes/` in `public` is served through the namespace, so it counts as
  published.
