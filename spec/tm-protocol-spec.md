# tm:// Protocol Spec — Read-Only URI Namespace over MCP

**Version 0.3 · 2026-10-09 · Spicy / Meatball Labs · [tinypeek](../README.md)**

Supersedes v0.2 (2026-10-08) and v0.1 (2026-10-06). v0.2 brought the spec in line with the server that shipped on `tinymachines`, added the layer model and its "done" criteria, and marked every section with its conformance status. v0.3 (TM-13) re-checks every marker against the running server after TM-4, 5, 7, 8, 9, 14 and 18 shipped, adds the `offbox` mount and the `tm:input` pair, and marks as planned the controls v0.2 had called shipped but the server does not have (tokens, rate limits, an audit log).

Conformance markers used throughout:

- **[shipped]** — running on the live server and verified by audit
- **[partial]** — running, with known gaps (ticket named)
- **[planned]** — specified, not yet built

---

## 1. Purpose and scope

`tm://` exposes one machine's websites, source repositories and filesystem as a single read-only URI namespace that an AI client navigates over MCP. The point is to see both faces of a thing at once: the rendered page a visitor sees, and the code, data and history that produced it.

Design decisions fixed for v1:

- **Read-only.** No verb mutates anything. Safety lives in the verb set, not in a curated view.
- **The OS is the namespace.** The real filesystem, repos and served sites, not a hand-built virtual tree.
- **Rules, not lists.** Templates publish the grammar; the client constructs addresses it was never told about.
- **Negotiation is iterative.** Every answer hands back resolvable URIs for the next round. Coarse to fine.
- **Standards first.** Where MCP, RFC 3986/6570/8288 or Plan 9 already name a pattern, use it.

Out of scope for v1: writes, command execution, proposals (v2), and ROM-level access control.

---

## 2. The layer model

The stack is five layers. Each depends only on the one below it, and each has a test for when it is finished. **A layer is done when the layer above it can be built without changing it.** The first application that forces a change to a lower layer proves that layer was not done.

```
 5  Applications       entity index, search, proposals (v2), dashboards
    ─────────────────  ← platform boundary
 4  Link vocabulary    typed rels between resources (tm:source, tm:data, …)
 3  Resolver           list / read / complete → content + links
 2  Addressing         tm://<host>/<mount>/<path>?<facets>
 1  Transport          MCP: initialize, tools/resources, auth
```

| Layer | Owns | Done when | Status |
|---|---|---|---|
| 1 Transport | Session, capabilities, auth, the `resolve` tool | A new mount or rel needs no transport change | [shipped] |
| 2 Addressing | The URI grammar and templates | Any thing on the box has a URI; adding a mount doesn't change the grammar | [shipped]: `fs`, `git`, `http` and `offbox` all fit one shape (`offbox` was added in TM-7 without a grammar change) |
| 3 Resolver | What is behind a URI; errors; facets | Every URI returns content plus typed links, with no grammar change | [partial]: TM-11 (a collection ignores an unsupported facet) |
| 4 Link vocabulary | The closed set of relations | A client can traverse knowing only rel names; a new rel is a vocabulary change, not a resolver change | [shipped]: TM-7, TM-8, TM-14, TM-18 |
| 5 Applications | Everything semantic | Built without touching layers 1–4 | [planned] — TM-16 is the first test |

**The platform is layers 1–4.** Its finish line is: *every real thing on the box is addressable and resolvable with typed links.* Everything above is an application, and each application is a test of whether the platform was really finished.

Discipline that keeps the cuts clean:

- The grammar says what a name looks like. The resolver says what is behind it. Resolver logic never leaks into the grammar.
- Representation (facets) never mints a new identity.
- A new relation is added to the vocabulary table, not hand-coded into one mount.
- Semantic concepts (patterns, games, lessons) live in layer 5 as their own mount; they consume layers 1–4 and never modify them.

---

## 3. Concept to canonical pattern

Nothing in layers 1–3 is novel protocol. The original contribution is layer 4: MCP defines addresses and a read verb, but no standard way to say how one resource relates to another. `tm://` adds that graph layer using Web Linking semantics.

| Idea | Canonical pattern | Specified in | Status |
|---|---|---|---|
| Everything has a URI | MCP Resources: URI-addressed, read-only, with `mimeType` | MCP spec, resources | [shipped] via `resolve` |
| Handshake that says what we have | MCP `initialize` + capabilities; `instructions` field as the MOTD | MCP lifecycle | [partial] — TM-12 |
| Generate a URI from rules | MCP Resource Templates, RFC 6570 | MCP spec; RFC 6570 | [shipped] |
| A safe `ls` | `resources/list` with cursor pagination | MCP pagination | [shipped] |
| Resolve into content | `resources/read`: text or blob + `mimeType` | MCP spec | [shipped] via `resolve` |
| Back-and-forth negotiation | `completion/complete` on template arguments | MCP completions | [shipped]: `repo`, `site`, `path`, `as`, `at` and `n` complete from live values (TM-17 was filed against a client that never calls it) |
| The OS is the namespace | Plan 9 / 9P mounts; MCP Roots | Plan 9; MCP roots | [shipped] |
| Page ↔ source ↔ history joins | HATEOAS; typed `rel` links | RFC 8288 | [shipped] |
| Facets | Representation in query params, never path suffixes | RFC 3986 | [shipped] |
| Token handling | Bearer in header; OAuth 2.1 for remote clients | MCP authorization; RFC 6750 | [planned]: the live server is anonymous and read-only, with no token at all |
| Make the thing I asked for | MCP Tools + Elicitation | MCP spec | v2 |

Verify method names against the current revision at [modelcontextprotocol.io](https://modelcontextprotocol.io) before coding; field names drift between revisions.

---

## 4. Transport and session [shipped]

The server speaks both: MCP **resources** (`resources/list`, `resources/templates/list`, `resources/read`, `completion/complete`) and a `resolve` **tool** over the same URIs, because tool-first clients navigate tools more fluidly. Over resources the links ride in the read result's `_meta` under `tinymachines.ai/links`; through `resolve` they are in the body.

| Tool | Purpose |
|---|---|
| `resolve(uri)` | The single read verb. Returns content (or a listing) plus `links`, or a structured error. Wraps list and read. |
| `overview` | Live status: mounts, probed services, each with a timestamp. |
| `piece` | Describes one published piece of work. |
| `licensing` | The licensing position of code and data on the box. |

The namespace is unchanged by the shim: `resolve` is a transport convenience over layers 2–3, not a different protocol.

**Orientation.** The server sends `instructions` at `initialize` describing the mounts, the links and how to begin [shipped]. They and the root resource should also name the box's own orientation documents (`git/public/START-HERE.md`, `git/public/CLAUDE.md`, `git/6502/CLAUDE.md`) so a fresh session does not start cold. [planned: TM-12]

---

## 5. URI grammar [shipped]

```
tm://<host>/<mount>/<backend-path>[?<facet-params>]
```

| Part | Rule | Example |
|---|---|---|
| `host` | The server instance. `tm://` lists hosts. | `tinymachines` |
| `mount` | Backend type plus instance | `fs`, `git/6502`, `http/tinymachines.ai` |
| `backend-path` | The backend's native path. Trailing `/` = collection. | `docs/nes/pile.md`, `/autopsy/games/` |
| `facet-params` | Representation, not identity | `?as=stat`, `?at=main`, `?range=0-65535` |

Representation stays in the query string so one thing keeps one identity. `tm://tinymachines/git/6502/README.md` is the file; `?at=v0.3` is the same file at a tag; `?as=log` is another representation of it.

Published templates (RFC 6570):

```
tm://{host}/
tm://{host}/fs{/path*}
tm://{host}/git/{repo}{/path*}{?at,as,n}
tm://{host}/http/{site}{/path*}{?as}
tm://{host}/offbox/{name}
```

These are the templates the live server publishes. It also accepts `as` and `range` on `fs`, `range` on `git`, and `cursor` on any collection, which the templates do not name. [shipped]

### Mounts on `tinymachines`

| Mount | Contents |
|---|---|
| `fs/` | `docs/`, `data/`, `notes/` |
| `git/` | `2a03`, `2c02`, `6502`, `halfphi`, `nes`, `nes-bench`, `nes-bus`, `ntsc-crt`, `public`, `tinypeek` |
| `http/` | `tinymachines.ai`, `beta.tinymachines.ai`; both serve an `/ja` locale |
| `offbox/` | Where a build chain leaves the box: `autopsy-models`, `cartridges`. Named and described, never served (§8) |

The fourth mount arrived without a grammar change, which is the layer-2 test from §2 passing in practice.

---

## 6. Facets

| `as=` | Applies to | Returns | Status |
|---|---|---|---|
| `text` | http | Readable extraction of the rendered page's main element. **Default for an http page.** Something that is not a page (robots.txt, a picture) reads as itself with no facet | [shipped]: TM-4 |
| `rendered` | http | The HTML a visitor gets | [shipped] |
| `raw` | fs, git | Bytes with the backend mimeType; base64 `blob` for binary. The default for fs and git files; `resolve` returns the blob only when `as=raw` is asked for | [shipped]: TM-2 |
| `stat` | fs, git, http, offbox | Metadata plus links, no content. For http: status, contentType and size, fetched without following a redirect | [shipped] |
| `log` | git | Commits touching the path | [shipped] |
| `blame` | git | Line attribution | [shipped] |
| `tree` | git | The listing of a tree, one level, paged; the default for a git collection | [partial]: recursive and depth-capped is not built |

Other params: `at=<ref>` (git; defaults to HEAD, and for `6502` to the commit the site serves), `n=<count>` (log, 1 to 100, default 20), `range=<start>-<end>` (fs and git; bytes `[start, end)` beyond the cap), `cursor=` (the `nextCursor` of a paged listing).

**Rule:** an unsupported facet returns `bad-facet` listing the valid ones, on files and collections alike. [partial: TM-11, an `as` that the mount offers but a collection has no use for is still ignored silently]

MimeType is decided by content as well as extension: valid UTF-8 with no NUL bytes in the first 8 KiB is text. Assembly sources return `text/x-asm`. [shipped]

---

## 7. Errors [shipped unless marked]

Never a bare 404. Every failure is structured and, where possible, teaches the client the right next URI.

| Code | When | Carries |
|---|---|---|
| `not-found` | No such path | `nearest`: up to five names ranked by edit distance, then a shared start, then alphabetically for ties; a path whose directory is missing answers from the deepest one that exists [shipped: TM-5] |
| `no-such-ref` | Bad `at=` | Up to five real refs (HEAD, branches, tags), ranked the same way [shipped: TM-5] |
| `bad-facet` (on `at=`) | An `at=` that is not a ref name (`..`, a leading `-`, a space) | Refused before git sees it |
| `too-large` | Over the byte cap | Byte size and a `?range=` template; for an http page, its `?as=text` and `?as=stat` |
| `binary` | Binary content without `as=raw` | mimeType and a `?as=stat` link |
| `bad-facet` | Unsupported `as=` | The facets that path accepts |
| `out-of-root` | Traversal outside a mount (plain or percent-encoded) | — |
| `denied` | Matches the deny-list | (the path is listed as `redacted`) |
| `redirect` | An http path the site redirects | The status; `?as=stat` reports it without following |
| `unreachable` | An http path that answers 4xx (other than 404) or 5xx | The status |
| `bad-uri` | Not a string, or not a `tm://` URI | |
| `bad-cursor` | A `cursor=` the server did not issue | |
| `bad-argument`, `bad-ref` | A completion for a template argument that does not exist, or for something other than a resource template | |
| `timeout`, `git-error` | git took too long or failed | The message |

---

## 8. Mount contract

A mount is any backend that implements three operations and one optional one. Adding a backend is adding a mount; the grammar, templates and client do not change.

| Operation | Input | Output | Required |
|---|---|---|---|
| `list(path, cursor)` | Collection | Children as URIs with `name`, `mimeType`, `size`, `isCollection`; `nextCursor`. An entry may also carry `redacted: true` (on the deny-list: listed, never read), `submodule` (git) or `title` (an http page, from the build). A site's root lists its sections and names its `front_page` | yes [shipped] |
| `read(path, facet)` | Leaf + facets | Content + `mimeType` + `links` | yes |
| `complete(arg, prefix)` | Template argument + prefix | Up to 100 values, `hasMore` | yes [shipped] |
| `links(path)` | Any path | The `links` array without content (`?as=stat`) | optional [shipped] |

Collections listed by a mount must be complete. For `http`, dynamic routes (`[game]`, `[lesson]`) are enumerated from the framework's build output, not a hand-kept route list. [shipped — TM-3]

### The link resolver

The one part with no off-the-shelf answer: knowing that a page was produced by a given source file and reads a given dataset. Three sources, tried in order:

1. **What a record says of itself.** A data record's own note naming its writer (`Written only by scripts/…`) makes that `tm:generated-by` exact. [shipped: TM-7]
2. **The build's own output.** The framework's prerender manifest lists every page a route renders, dynamic routes included (`tm:source` / `tm:renders-as`, exact); each page's server bundle and its source maps confirm which reader modules ship with it. [shipped: TM-3, TM-8]
3. **Route and import introspection.** A module reads a record when it builds the record's path or imports it, never when a comment names it. A page's data is what its own code reads, through the library but never through the shared frame's modules: exact for a reader the page imports itself, inferred further down. [shipped: TM-8, TM-14]
4. **A small manifest** for what nothing above can see: what a script reads that it did not make, and where the chain leaves the box. On `tinymachines` this is `api/lineage.json`, and a test holds every path it names to be tracked. Exact. [shipped: TM-7]
5. **Heuristic.** A script under `scripts/` that names a record it is not stated to write: `inferred`.

Every `tm:` link carries `confidence: exact | inferred | low`. The live server emits `exact` and `inferred`; `low` is reserved for path-shape guesses, which it does not make.

**Off-box terminals.** When a lineage chain leaves the box by design, it ends at an explicit node in the `offbox` mount rather than in silence. The node says what it is and why it is not exposed, and links to what makes it and what reads it:

```
tm://tinymachines/offbox/autopsy-models
→ { "exposed": false, "reason": "not-exposed",
    "what": "Each game's model.json and summary.json, ...",
    "why": "They are made from cartridge dumps and kept with them; ..." }
  tm:generated-by  tm://tinymachines/git/public/wasm/listing/tools/autopsy.py  exact
  tm:input-of      tm://tinymachines/git/public/scripts/board-autopsy.py        exact
```

`data/autopsy.json` walks to `scripts/board-autopsy.py`, to the models off the box, to `wasm/listing/tools/autopsy.py`, to the cartridges off the box, every link exact. [shipped: TM-7]

---

## 9. Link vocabulary

Every response carries `links`: `{rel, href, confidence, title?}`, RFC 8288 semantics. IANA relations are reused where they exist; the rest are namespaced `tm:`.

| rel | From → To | Meaning | Status |
|---|---|---|---|
| `tm:source` / `tm:renders-as` | page ↔ route source or cartridge | What emitted this page; inverse | [shipped] — incl. lesson page ↔ `prg.s`, `chr.s`, `lesson.json`, `three.txt` |
| `tm:generated-by` / `tm:generates` | output ↔ generator; pulled copy ↔ its origin | The computation whose output this is, or the file a build copied in | [shipped]: TM-7 |
| `tm:input` / `tm:input-of` | generator ↔ what it reads | What a script reads that it did not make (an `offbox` node on `tinymachines`) | [shipped]: TM-7 |
| `tm:data` / `tm:read-by` | page or collection ↔ dataset | Data the page's own code reads at render time, the shared frame's excluded; a record names each route that reads it once (its page, or the collection a dynamic route's pages are listed in, which carries the `tm:data` back) | [shipped]: TM-8, TM-14, TM-18 |
| `tm:working-copy` / `tm:repository` | git path ↔ fs path | Checked-out file; inverse | [shipped] |
| `version-history` (IANA) | any → `?as=log` | Commits touching this | [shipped] |
| `latest-version` (IANA) | `?at=<ref>` → HEAD | Newest revision | [shipped] |
| `alternate` (IANA) | any → same path, other facet, site or locale | Another representation of one identity | [shipped] |
| `up` (IANA) | any → parent | One level up; a mount root's `up` is `tm://<host>/` | [shipped] |
| `collection` (IANA) | leaf → its listing | Siblings | [shipped] |
| `describedby` (IANA) | any → `?as=stat` | Metadata | [shipped] |

Rules:

- Links are typed, never free text. A client ignores rels it doesn't know.
- Inverse pairs are both emitted. `tm:read-by` is the one bounded exception: a page on another site or in another locale is answered by the one link that stands for its route.
- `confidence` is mandatory on `tm:` rels and omitted on IANA rels.
- `href` is always a complete `tm://` URI.
- **Fan-out is bounded.** One link per route on the canonical site and locale; dynamic routes collapse to their collection (a dynamic route whose pages share only the root is named page by page, since the root is the front page too); other sites and locales are reached through `alternate`. `autopsy.json` carries 5 `tm:read-by` [shipped: TM-18]. A record most routes read still carries one a route (`projects.json`: 33), and paging larger sets behind `?as=links&cursor=` is [planned].

Illustrative example (paths abbreviated; check exact hrefs against the live server) — `tm://tinymachines/http/tinymachines.ai/autopsy/lessons/jump?as=stat`:

```
tm:source        tm://tinymachines/git/public/web/app/[lang]/autopsy/lessons/[lesson]/page.tsx  exact
tm:source        tm://tinymachines/git/public/lessons/jump/prg.s                               exact
tm:data          tm://tinymachines/fs/data/lessons.json                                         exact
alternate        tm://tinymachines/http/tinymachines.ai/ja/autopsy/lessons/jump
up               tm://tinymachines/http/tinymachines.ai/autopsy/lessons/
```

---

## 10. Safety and auth [shipped unless marked]

Read-only removes write risk, not disclosure or availability risk.

| Concern | Control |
|---|---|
| Escape from a mount root | Canonicalize before every fs call; plain and `%2e%2e` traversal → `out-of-root`. Symlinks outside the root are refused. The http mount fetches only sites the box serves; git refs are checked as names before git sees them. |
| Unbounded reads | Byte cap per read; `?range=` beyond it; `list` pages at most 500. |
| Secrets in the tree | Deny-list applied before any read: the `.git/` directory, credential patterns (`.env*`, `*.pem`, `*.key`, `id_*`, `*secret*`) and every other dotfile as a class, so one nobody listed (`.npmrc`, `.netrc`, `.git-credentials`) stays out. Named back in because they hold no secrets and describe the repository: `.gitignore`, `.gitmodules`, `.gitattributes`, `.editorconfig`. Refused as `denied`, listed as `redacted`. [shipped: TM-9] |
| Token exposure | Bearer token in the `Authorization` header, never in the URI. OAuth 2.1 when a second client appears. [planned: the live server is anonymous; everything it serves is already public] |
| Open proxy | The http mount fetches from loopback only. |
| Request abuse | `complete` capped at 100; `list` pages at most 500; no recursive `list`; git calls time out after 15 s [shipped]. A per-token rate limit [planned: there is no token yet] |
| Audit | Every read logged with URI, facet, bytes, token id. [planned: not built] |

**Data licensing travels with the data.** Code is MIT. visual6502-derived die data is CC BY-NC-SA 3.0, and NonCommercial + ShareAlike carry through to the netlist, measured tables, API responses and cartridges. `halfphi` embeds no die data. The autopsy publishes shape only — addresses, counts, labels — and no ROM bytes. The `licensing` tool states this at runtime.

---

## 11. Layer 5: the entity mount [planned — TM-16]

The first application on the platform, and the test of whether layers 1–4 are done. If it can be built without changing them, they are.

A read-only `entity` mount backed by `autopsy.json` and `lessons.json`. No new data, no ROM bytes.

```
tm://tinymachines/entity/pattern/{key}                      pad-poll, frame-wait
tm://tinymachines/entity/game/{key}                         ded208cee37d
tm://tinymachines/entity/game/{key}/routine/{bank}-{addr}   b0-8E5C
tm://tinymachines/entity/lesson/{key}                       jump
```

| From | rel | To |
|---|---|---|
| pattern | `tm:found-in` | game (each, with count) |
| pattern | `tm:instance` | routine |
| pattern | `tm:demonstrated-by` | lesson |
| routine | `tm:instance-of` | pattern |
| game | `tm:renders-as` | its `/autopsy/games/{key}` page |
| lesson | `tm:cartridge` | `git/public/lessons/{key}/` |
| lesson | `tm:measures` | game |
| any entity | `tm:data` | the JSON record, JSON pointer in the fragment |

Identity is the stable key already in the data, not a file path, so it survives moves. v1 names only the 799 rule-named routines, not all 5,139.

New rels (`tm:found-in`, `tm:instance`, …) are additions to the vocabulary table in §9. If adding them requires changing the resolver, that is a layer-4 leak to fix before continuing.

---

## 12. Open questions and v2

- **Manifest schema.** `tinymachines` settled for a small hand-kept `lineage.json` checked by a test, plus what records and the build already say (§8). Whether a framework-emitted `tm-links.json` is worth having is open.
- **Multi-host.** One server per box, or one fronting several? The grammar allows both.
- **Subscriptions.** `resources/subscribe` for change notification. Defer until a use appears.
- **CI conformance.** [shipped: TM-15] A link-integrity crawler runs at the end of every `tinymachines` deploy, after the beta follows: every `href` resolves, no `up` names itself, every `tm:` pair has its inverse (§9's bounded exception included), every listed child resolves with the claimed mimeType. About 2,300 URIs a run.

v2, deliberately excluded:

- **Proposals.** A tool that takes a URI the client wishes existed plus a description, stages a scaffold as a branch or diff, and returns a review URI. Nothing lands without owner approval.
- **Elicitation** when a proposal is ambiguous.
- **Write verbs.** None planned; mutation stays behind proposals.

---

Sources: [MCP specification](https://modelcontextprotocol.io/specification) · [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986) · [RFC 6570](https://www.rfc-editor.org/rfc/rfc6570) · [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288) · [RFC 6750](https://www.rfc-editor.org/rfc/rfc6750) · [IANA link relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml)
