# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

**tinypeek is the home of the `tm://` protocol**: a read-only URI namespace
over MCP, in which every real thing on a machine (its sites, repositories
and files) has an address, and every address carries typed links to what it
is connected to. This repository holds the protocol only:

| | |
|---|---|
| `spec/tm-protocol-spec.md` | the spec, v0.12. Every section is marked `[shipped]`, `[partial]` or `[planned]`, with the ticket that moves it |
| `docs/stack-explainer.md` | the plain-language companion; its section 7 is a status snapshot |
| `README.md` | the front page |
| `LICENSE` | MIT. No visual6502 die data and no ROM content may ever land here; that is why it can be MIT |

It is public on GitHub (`tinymachines/tinypeek`, public since 2026-10-09).

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

**Another session, `public-9b`, works in `../public` on the website.** It
stays out of the files above and you stay out of everything else there. If
a change needs both sides, message it first (SendMessage to `public-9b`).

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
   `public-9b` and `port-bradley-tinymachines-style` before a deploy and
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

## What is left

The owner's work package (a black-box audit of the namespace, TM-1 to
TM-20) lives in the owner's docs folder beside these repositories, under
`feedback/`. It is not in either repository. Its state on 2026-10-11:

| | |
|---|---|
| TM-12, TM-16 | Live since 2026-10-10 (`public` `b2c4cec`), checked from outside and marked shipped in the spec. The entity mount is the `Entities` class in `api/tm.py`; spec section 11 records what it asked of layers 1 to 4: one resolver hook (`inbound`) and two widened vocabulary rules |
| tinypeek#2, #3, public#7 | Live since 2026-10-10 (`public` `7faca76`), checked from outside and marked shipped: a link may carry `count`; no read carries more than 100 links and the rest is behind `?as=links` in one stated order; `tm:measures` is exact for all 25 lessons by `against.key` |
| tinypeek#8 | Live since 2026-10-10 (`public` `64c7c1f`), marked shipped: a page's text is held to the byte cap and reads in ranges. No live page is over the cap, so the refusal is held by the tests |
| tinypeek#4 | Live since 2026-10-10 (`public` `745937b`), checked from outside and marked shipped: a git tree reads to a stated depth, and a listing at a ref names its children at that ref |
| tinypeek#6 | Live since 2026-10-10 (`public` `b84f8b0`), checked from outside and marked shipped: a rate limit by caller in the transport (`RateLimit` in `api/mcp_server.py`; `api/app.py` passes the caller). Sessions on the box share one address, so a crawl over HTTP from any of them draws on one bucket; the crawler runs in-process and is not limited |
| tinypeek#7 | Live since 2026-10-11 (`public` `e0c2c7b`), checked and marked shipped: an audit log of requests (`AuditLog` in `api/mcp_server.py`), with no address, outside the checkout, bounded in days and bytes; and no refusal quotes a host path. The log is in the service's state directory and cannot be read through the namespace, so a live check of it is a look on the box |
| audit follow-up | Live since 2026-10-11 (`public` `6ec8d89`): a logged URI is cut to 300 characters with its length noted. Known and stated in the spec: a caller inside the rate limit can still fill a day's 8 MiB by volume |
| TM-17 | Completions. Not a bug: they exist; the auditing client never called them |
| everything else | Live, and marked so in the spec. The work package is finished |

Open in the spec, each with an issue in this repository (filed 2026-10-10,
none yet approved to build): tokens (#5) are planned and not built,
since the live server is anonymous and serves only what is already public. One open question: subscriptions (#11).
Settled on 2026-10-11 (#9): no build-emitted link manifest; spec section 8
has the counts and what would reopen it, which is a second site.
Settled on 2026-10-11 (#10): a server answers for a set of hosts and one is
conformant; `tm://` lists them (`TOP` in `api/tm.py`), built and awaiting a
deploy. Federation between servers waits for a second box.

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
