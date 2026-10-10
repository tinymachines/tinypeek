# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

**tinypeek is the home of the `tm://` protocol**: a read-only URI namespace
over MCP, in which every real thing on a machine (its sites, repositories
and files) has an address, and every address carries typed links to what it
is connected to. This repository holds the protocol only:

| | |
|---|---|
| `spec/tm-protocol-spec.md` | the spec, v0.3. Every section is marked `[shipped]`, `[partial]` or `[planned]`, with the ticket that moves it |
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
`feedback/`. It is not in either repository. Its state on 2026-10-10:

| | |
|---|---|
| TM-11, TM-19, TM-20 | A collection refuses a file's facet; a submodule reads as what it pins (`tm:pins`) and no refusal offers its own URI; a page links to itself in the other language and on the other site (`alternate`). Built and tested in `public`, waiting on a deploy. After it, re-check each live and move the spec's markers from planned to shipped |
| **TM-12** | The connect instructions and the root resource should name the orientation documents (`public`'s `START-HERE.md` and `CLAUDE.md`, the 6502 project's `CLAUDE.md`). Open |
| **TM-16** | An `entity` mount over `data/autopsy.json` and `data/lessons.json`: patterns, games, routines and lessons as addressable things with their own links. Spec section 11 has the shape. It is the test of whether layers 1 to 4 are finished: if it needs a change below it, that is the finding, not a workaround. Not started |
| TM-17 | Completions. Not a bug: they exist; the auditing client never called them |
| everything else | Live, and marked so in the spec |

Also open in the spec: paging a large link set behind `?as=links&cursor=`;
the git `tree` facet is one level, not recursive; tokens, a rate limit and
an audit log are planned and not built (the live server is anonymous and
serves only what is already public). A page's text has no size cap while its
HTML does; nothing live is near it.

## Traps already paid for

- A check that can pass on nothing is not a check. When the crawler passes,
  break what it guards on purpose and watch it fail.
- The namespace reads the beta's build too, so it can be briefly ahead of a
  beta that has not followed yet; the deploy runs the crawler after the
  follow for that reason.
- Never put a private repository in the git mount: the namespace is public,
  so anything mounted is published.
- `notes/` in `public` is served through the namespace, so it counts as
  published.
