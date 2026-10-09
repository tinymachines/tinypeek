# tm:// Protocol Spec — Read-Only URI Namespace over MCP

**Version 0.2 · 2026-10-08 · Spicy / Meatball Labs · [tinypeek](../README.md)**

Supersedes v0.1 (2026-10-06). This revision brings the spec in line with the server that shipped on `tinymachines`, adds the layer model and its "done" criteria, and marks every section with its conformance status.

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
| 2 Addressing | The URI grammar and templates | Any thing on the box has a URI; adding a mount doesn't change the grammar | [shipped] — `fs`, `git`, `http` all fit one shape |
| 3 Resolver | What is behind a URI; errors; facets | Every URI returns content plus typed links, with no grammar change | [partial] — TM-4, TM-5, TM-11 |
| 4 Link vocabulary | The closed set of relations | A client can traverse knowing only rel names; a new rel is a vocabulary change, not a resolver change | [partial] — TM-7, TM-18 |
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
| Back-and-forth negotiation | `completion/complete` on template arguments | MCP completions | [planned] — TM-17 |
| The OS is the namespace | Plan 9 / 9P mounts; MCP Roots | Plan 9; MCP roots | [shipped] |
| Page ↔ source ↔ history joins | HATEOAS; typed `rel` links | RFC 8288 | [partial] |
| Facets | Representation in query params, never path suffixes | RFC 3986 | [shipped] |
| Token handling | Bearer in header; OAuth 2.1 for remote clients | MCP authorization; RFC 6750 | [shipped] |
| Make the thing I asked for | MCP Tools + Elicitation | MCP spec | v2 |

Verify method names against the current revision at [modelcontextprotocol.io](https://modelcontextprotocol.io) before coding; field names drift between revisions.

---

## 4. Transport and session [shipped]

The server exposes MCP **tools** rather than relying on the client to browse raw resources, because tool-first clients navigate tools more fluidly. This resolves v0.1's open question in favour of the shim.

| Tool | Purpose |
|---|---|
| `resolve(uri)` | The single read verb. Returns content (or a listing) plus `links`, or a structured error. Wraps list and read. |
| `overview` | Live status: mounts, probed services, each with a timestamp. |
| `piece` | Describes one published piece of work. |
| `licensing` | The licensing position of code and data on the box. |

The namespace is unchanged by the shim: `resolve` is a transport convenience over layers 2–3, not a different protocol.

**Orientation.** The server `instructions` and the root resource should name the box's own orientation documents (`git/public/START-HERE.md`, `git/public/CLAUDE.md`, `git/6502/CLAUDE.md`) so a fresh session does not start cold. [planned — TM-12]

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
tm://{host}/fs{/path*}{?as,range}
tm://{host}/git/{repo}{/path*}{?at,as,n,range}
tm://{host}/http/{site}{/path*}{?as}
```

### Mounts on `tinymachines`

| Mount | Contents |
|---|---|
| `fs/` | `docs/`, `data/`, `notes/` |
| `git/` | `2a03`, `2c02`, `6502`, `halfphi`, `nes`, `nes-bench`, `nes-bus`, `ntsc-crt`, `public` |
| `http/` | `tinymachines.ai`, `beta.tinymachines.ai`; both serve an `/ja` locale |

---

## 6. Facets

| `as=` | Applies to | Returns | Status |
|---|---|---|---|
| `text` | http | Readable extraction of the rendered page. **Default for http.** | [partial] — TM-4: default is still raw HTML |
| `rendered` | http | The HTML a visitor gets | [shipped] |
| `raw` | fs, git | Bytes with the backend mimeType; base64 `blob` for binary | [partial] — TM-2 unverified |
| `stat` | all | Metadata plus links, no content | [shipped] |
| `log` | git | Commits touching the path | [shipped] |
| `blame` | git | Line attribution | [shipped] |
| `tree` | git collections | Recursive tree JSON, depth-capped | [planned] — TM-11 |

Other params: `at=<ref>` (git; defaults to HEAD), `n=<count>` (log), `range=<start>-<end>` (byte range beyond the cap).

**Rule:** an unsupported facet returns `bad-facet` listing the valid ones, on files and collections alike. [partial — collections still ignore it silently, TM-11]

MimeType is decided by content as well as extension: valid UTF-8 with no NUL bytes in the first 8 KiB is text. Assembly sources return `text/x-asm`. [shipped]

---

## 7. Errors [shipped unless marked]

Never a bare 404. Every failure is structured and, where possible, teaches the client the right next URI.

| Code | When | Carries |
|---|---|---|
| `not-found` | No such path | `nearest`: up to five siblings ranked by edit distance [partial — TM-5: still alphabetical] |
| `no-such-ref` | Bad `at=` | Real branches and tags, ranked [partial — TM-5: returns empty] |
| `too-large` | Over the byte cap | Byte size and a `?range=` template |
| `binary` | Binary content without `as=raw` | mimeType and a `?as=stat` link |
| `bad-facet` | Unsupported `as=` | The facets that path accepts |
| `out-of-root` | Traversal outside a mount (plain or percent-encoded) | — |
| `denied` | Matches the deny-list | — (the path is listed as `redacted`) |

---

## 8. Mount contract

A mount is any backend that implements three operations and one optional one. Adding a backend is adding a mount; the grammar, templates and client do not change.

| Operation | Input | Output | Required |
|---|---|---|---|
| `list(path, cursor)` | Collection | Children as URIs with `name`, `mimeType`, `size`, `isCollection`; `nextCursor` | yes |
| `read(path, facet)` | Leaf + facets | Content + `mimeType` + `links` | yes |
| `complete(arg, prefix)` | Template argument + prefix | Up to 100 values, `hasMore` | yes [planned — TM-17] |
| `links(path)` | Any path | The `links` array without content (`?as=stat`) | optional [shipped] |

Collections listed by a mount must be complete. For `http`, dynamic routes (`[game]`, `[lesson]`) are enumerated from the framework's build output, not a hand-kept route list. [shipped — TM-3]

### The link resolver

The one part with no off-the-shelf answer: knowing that a page was produced by a given source file and reads a given dataset. Three sources, tried in order:

1. **Build manifest** (preferred). The build emits `tm-links.json`: per route, its `source`, `generated-by` and `data`. Exact.
2. **Route and import introspection.** The framework's route table and import graph. Exact where available. [shipped — used for TM-8, TM-14]
3. **Heuristic.** Path-shape matching. Always `confidence: low`.

Every `tm:` link carries `confidence: exact | inferred | low`.

**Off-box terminals.** When a lineage chain leaves the box by design, it ends at an explicit node rather than in silence:

```
tm://tinymachines/offbox/listings
→ { "reason": "not-exposed", "what": "per-game listings, kept with the cartridges" }
```

[planned — TM-7]

---

## 9. Link vocabulary

Every response carries `links`: `{rel, href, confidence, title?}`, RFC 8288 semantics. IANA relations are reused where they exist; the rest are namespaced `tm:`.

| rel | From → To | Meaning | Status |
|---|---|---|---|
| `tm:source` / `tm:renders-as` | page ↔ route source or cartridge | What emitted this page; inverse | [shipped] — incl. lesson page ↔ `prg.s`, `chr.s`, `lesson.json`, `three.txt` |
| `tm:generated-by` / `tm:generates` | output ↔ generator | The computation whose output this is | [partial] — TM-7 |
| `tm:data` / `tm:read-by` | page ↔ dataset | Data the page itself reads at render time | [shipped] — layout data excluded |
| `tm:working-copy` / `tm:repository` | git path ↔ fs path | Checked-out file; inverse | [shipped] |
| `version-history` (IANA) | any → `?as=log` | Commits touching this | [shipped] |
| `latest-version` (IANA) | `?at=<ref>` → HEAD | Newest revision | [shipped] |
| `alternate` (IANA) | any → same path, other facet, site or locale | Another representation of one identity | [shipped] |
| `up` (IANA) | any → parent | One level up; a mount root's `up` is `tm://<host>/` | [shipped] |
| `collection` (IANA) | leaf → its listing | Siblings | [shipped] |
| `describedby` (IANA) | any → `?as=stat` | Metadata | [shipped] |

Rules:

- Links are typed, never free text. A client ignores rels it doesn't know.
- Inverse pairs are both emitted.
- `confidence` is mandatory on `tm:` rels and omitted on IANA rels.
- `href` is always a complete `tm://` URI.
- **Fan-out is bounded.** One link per route on the canonical site and locale; dynamic routes collapse to their collection; other sites and locales are reached through `alternate`. Larger sets page behind `?as=links&cursor=`. Target: at most ~10 links of one rel on any resource. [planned — TM-18; `autopsy.json` currently carries ~95 `tm:read-by`]

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
| Escape from a mount root | Canonicalize before every fs call; plain and `%2e%2e` traversal → `out-of-root`. Symlinks outside the root are refused. |
| Unbounded reads | Byte cap per read; `?range=` beyond it; `list` pages at most 500. |
| Secrets in the tree | Deny-list applied before any read: the `.git/` directory, credential patterns (`.env*`, `*.pem`, `*.key`, `id_*`, `*secret*`) and every other dotfile as a class, so one nobody listed (`.npmrc`, `.netrc`, `.git-credentials`) stays out. Named back in because they hold no secrets and describe the repository: `.gitignore`, `.gitmodules`, `.gitattributes`, `.editorconfig`. Refused as `denied`, listed as `redacted`. [shipped: TM-9] |
| Token exposure | Bearer token in the `Authorization` header, never in the URI. OAuth 2.1 when a second client appears. |
| Open proxy | The http mount fetches from loopback only. |
| Request abuse | Per-token rate limit; `complete` capped at 100; no recursive `list`. |
| Audit | Every read logged with URI, facet, bytes, token id. |

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

- **Manifest schema.** Settle `tm-links.json` and which build step emits it; this gates `exact` on every lineage link (TM-7).
- **Multi-host.** One server per box, or one fronting several? The grammar allows both.
- **Subscriptions.** `resources/subscribe` for change notification. Defer until a use appears.
- **CI conformance.** A link-integrity crawler on every deploy: every `href` resolves, no `up` loops, every `tm:` rel has its inverse, every listed child resolves with the claimed mimeType (TM-15).

v2, deliberately excluded:

- **Proposals.** A tool that takes a URI the client wishes existed plus a description, stages a scaffold as a branch or diff, and returns a review URI. Nothing lands without owner approval.
- **Elicitation** when a proposal is ambiguous.
- **Write verbs.** None planned; mutation stays behind proposals.

---

Sources: [MCP specification](https://modelcontextprotocol.io/specification) · [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986) · [RFC 6570](https://www.rfc-editor.org/rfc/rfc6570) · [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288) · [RFC 6750](https://www.rfc-editor.org/rfc/rfc6750) · [IANA link relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml)
