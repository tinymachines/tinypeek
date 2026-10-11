# tm:// Protocol Spec — Read-Only URI Namespace over MCP

**Version 0.10 · 2026-10-10 · Spicy / Meatball Labs · [tinypeek](../README.md)**

Supersedes v0.2 (2026-10-08) and v0.1 (2026-10-06). v0.2 brought the spec in line with the server that shipped on `tinymachines`, added the layer model and its "done" criteria, and marked every section with its conformance status. v0.3 (TM-13) re-checks every marker against the running server after TM-4, 5, 7, 8, 9, 14 and 18 shipped, adds the `offbox` mount and the `tm:input` pair, and marks as planned the controls v0.2 had called shipped but the server does not have (tokens, rate limits, an audit log). v0.4 adds what TM-11, TM-19 and TM-20 change: a collection refuses a file's facet instead of dropping it, a submodule reads as what it pins (`tm:pins`), a page links to itself in the other language and on the other site (`alternate`), and no refusal offers the address it refused. All three went live on 2026-10-10 after the deploy's crawl caught nine faults in the first attempt (a submodule record without its type, a crawler that read a tree at a ref as a file, a front page whose other language went unanswered); the spec records the fixed behaviour. v0.5 adds the last two tickets of the work package: the root and the connect instructions name the box's orientation documents (TM-12), and the first application is built on the platform, the `entity` mount (TM-16), with ten relations of its own. §11 says what building it asked of the layers under it. Both went live on 2026-10-10 and were re-checked from outside on the live server, where the deploy's crawl read 3,189 URIs clean. v0.6 takes up three of the findings §11 left open: a link may carry a `count` (tinypeek#3), and no read carries more than a hundred links, the rest being behind `?as=links` a page at a time, in one stated order (tinypeek#2). A lesson's record now keeps its game's key, so the lesson-to-game link is exact for all 25 (public#7). All three went live on 2026-10-10 and were re-checked from outside on the live server. v0.7 closes the one read that had no byte cap: a page's text, which is also a page's default read, is held to the cap and reads in ranges past it (tinypeek#8). It went live on 2026-10-10 and its ranges were re-checked from outside; no live page's text is over the cap, so the refusal itself is held by the tests and not seen live. v0.8 finishes the git `tree` facet: a tree reads to a stated depth in one read (tinypeek#4), and a listing at a ref names its children at that ref. It went live on 2026-10-10 and was re-checked from outside. v0.9 adds the control that was missing over how many requests a caller makes: a rate limit by caller, in the transport (tinypeek#6). It went live on 2026-10-10 and was re-checked from outside by spending a bucket. v0.10 adds the audit log (tinypeek#7): one record a request, with no address in it, bounded in days and in bytes, and never served. Testing it found a refusal that named where the checkout is on the host; no refusal may, and §7 and §10 now say so. Both are built and tested in the reference server and wait on its next deploy.

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
| 2 Addressing | The URI grammar and templates | Any thing on the box has a URI; adding a mount doesn't change the grammar | [shipped]: `fs`, `git`, `http` and `offbox` all fit one shape (`offbox` was added in TM-7 without a grammar change). `entity` fits it too (TM-16, §11) |
| 3 Resolver | What is behind a URI; errors; facets | Every URI returns content plus typed links, with no grammar change | [shipped]: TM-11, TM-19, TM-20 live since 2026-10-10. TM-16 found one gap here: a mount had no way to answer for a link another mount starts (§11) |
| 4 Link vocabulary | The closed set of relations | A client can traverse knowing only rel names; a new rel is a vocabulary change, not a resolver change | [shipped]: TM-7, TM-8, TM-14, TM-18. TM-16 added ten rels as table rows and widened two rules (§11) |
| 5 Applications | Everything semantic | Built without touching layers 1–4 | [shipped: TM-16]: the `entity` mount is the first, and §11 records how the test went |

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
| Handshake that says what we have | MCP `initialize` + capabilities; `instructions` field as the MOTD | MCP lifecycle | [shipped: TM-12] |
| Generate a URI from rules | MCP Resource Templates, RFC 6570 | MCP spec; RFC 6570 | [shipped] |
| A safe `ls` | `resources/list` with cursor pagination | MCP pagination | [shipped] |
| Resolve into content | `resources/read`: text or blob + `mimeType` | MCP spec | [shipped] via `resolve` |
| Back-and-forth negotiation | `completion/complete` on template arguments | MCP completions | [shipped]: `repo`, `site`, `path`, `as`, `at` and `n` complete from live values (TM-17 was filed against a client that never calls it). An entity's `kind`, `key` and `routine` complete too [shipped: TM-16] |
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

**Orientation.** The server sends `instructions` at `initialize` describing the mounts, the links and how to begin [shipped]. A box also has documents of its own that a newcomer should read first, and a fresh session should not have to find them by walking. So the root resource carries them twice: in its body as `start_here`, a list of `{uri, what}`, and as `help` links (§9). The `instructions` end by naming the same URIs, taken from the same list, so the two cannot disagree. A document is named only when it resolves: one whose repository the server does not mount, or that is not at its HEAD, is left out, because a pointer that does not resolve is worse than none. The list is kept to two or three. On `tinymachines` it is `git/public/START-HERE.md`, `git/public/CLAUDE.md` and `git/6502/CLAUDE.md`. [shipped: TM-12]

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
tm://{host}/git/{repo}{/path*}{?at,as,n,depth}
tm://{host}/http/{site}{/path*}{?as}
tm://{host}/offbox/{name}
```

These are the templates the live server publishes (`depth` on the git one [shipped: tinypeek#4]). It also accepts `as` and `range` on `fs`, `range` on `git`, and `cursor` on any collection, which the templates do not name. [shipped]

The entity mount brings two more [shipped: TM-16]:

```
tm://{host}/entity/{kind}/{key}{?as}
tm://{host}/entity/game/{key}/routine/{routine}{?as}
```

### Mounts on `tinymachines`

| Mount | Contents |
|---|---|
| `fs/` | `docs/`, `data/`, `notes/` |
| `git/` | `2a03`, `2c02`, `6502`, `halfphi`, `nes`, `nes-bench`, `nes-bus`, `ntsc-crt`, `public`, `tinypeek` |
| `http/` | `tinymachines.ai`, `beta.tinymachines.ai`; both serve an `/ja` locale |
| `offbox/` | Where a build chain leaves the box: `autopsy-models`, `cartridges`. Named and described, never served (§8) |
| `entity/` | The autopsy's patterns, games, routines and lessons (§11) [shipped: TM-16] |

The fourth mount arrived without a grammar change, which is the layer-2 test from §2 passing in practice. So did the fifth.

---

## 6. Facets

| `as=` | Applies to | Returns | Status |
|---|---|---|---|
| `text` | http | Readable extraction of the rendered page's main element. **Default for an http page.** Something that is not a page (robots.txt, a picture) reads as itself with no facet | [shipped]: TM-4 |
| `text` over the cap | http | A page whose text is over the byte cap is refused as `too-large` with its size and a `?as=text&range=` template, and each range reads. | [shipped: tinypeek#8] |
| `rendered` | http | The HTML a visitor gets | [shipped] |
| `raw` | fs, git | Bytes with the backend mimeType; base64 `blob` for binary. The default for fs and git files; `resolve` returns the blob only when `as=raw` is asked for | [shipped]: TM-2 |
| `stat` | fs, git, http, offbox, entity | Metadata plus links, no content. For http: status, contentType and size, fetched without following a redirect. It is the one facet an entity offers | [shipped]; on entity since TM-16 |
| `links` | every mount | A thing's links and no content, a page at a time (§9). The body is `{uri, total, returned, nextCursor?}`; the links ride where links always ride. `cursor=` continues, and here it is the links' cursor even on a collection | [shipped: tinypeek#2] |
| `log` | git | Commits touching the path | [shipped] |
| `blame` | git | Line attribution | [shipped] |
| `tree` | git | The listing of a tree, one level, paged; the default for a git collection | [shipped] |
| `tree` with `depth=N` | git | The tree to N levels, 1 to 8, in one read. Each entry is named by its path below the tree and carries its `depth`; entries come in path order, so a directory is just before what is in it, and a directory at the last level is listed to be read on. Paged like any listing, 500 entries a page. A submodule is listed and never entered. A denied name is `redacted` at any depth. `depth=1` is the plain listing, directories first. A depth out of range, or on something that is not a tree listing, is `bad-facet` | [shipped: tinypeek#4] |

Other params: `at=<ref>` (git; defaults to HEAD, and for `6502` to the commit the site serves), `n=<count>` (log, 1 to 100, default 20), `depth=<levels>` (git tree, above), `range=<start>-<end>` (fs and git; bytes `[start, end)` beyond the cap, the end stopping at the thing's end, at most the cap in one read). On http a range is of a page's text, in bytes of UTF-8, with `?as=text` or with no `as`; a cut inside a character reads as the replacement mark at that edge. A range on `rendered`, on `stat`, on a listing or on something that is not a page is refused as `bad-facet`, not dropped [shipped: tinypeek#8], `cursor=` (the `nextCursor` of a paged listing).

**Rule:** an unsupported facet returns `bad-facet` listing the valid ones, on files and collections alike. An unknown `as` is refused on every mount [shipped]. A collection offers only its listing (and, on git, `log`): a file's facet on one (`?as=stat` on an fs directory, `?as=rendered` on an http collection, `?as=stat` or `blame` on a git tree) is refused rather than dropped [shipped: TM-11].

MimeType is decided by content as well as extension: valid UTF-8 with no NUL bytes in the first 8 KiB is text. Assembly sources return `text/x-asm`. [shipped]

---

## 7. Errors [shipped unless marked]

Never a bare 404. Every failure is structured and, where possible, teaches the client the right next URI.

| Code | When | Carries |
|---|---|---|
| `not-found` | No such path | `nearest`: up to five names ranked by edit distance, then a shared start, then alphabetically for ties; a path whose directory is missing answers from the deepest one that exists [shipped: TM-5]. `nearest` never contains the URI that was refused, which a client following it would take round forever; `x/` offered for `x` is a different address and allowed [shipped: TM-19] |
| `no-such-ref` | Bad `at=` | Up to five real refs (HEAD, branches, tags), ranked the same way [shipped: TM-5] |
| `bad-facet` (on `at=`) | An `at=` that is not a ref name (`..`, a leading `-`, a space) | Refused before git sees it |
| `too-large` | Over the byte cap | Byte size and a `?range=` template; for an http page's HTML, its `?as=text` and `?as=stat`; for an http page's text, its size, a `?as=text&range=` template and its `?as=stat` [shipped: tinypeek#8] |
| `binary` | Binary content without `as=raw` | mimeType and a `?as=stat` link |
| `bad-facet` | Unsupported `as=` | The facets that path accepts |
| `out-of-root` | Traversal outside a mount (plain or percent-encoded) | — |
| `denied` | Matches the deny-list | (the path is listed as `redacted`) |
| `redirect` | An http path the site redirects | The status; `?as=stat` reports it without following |
| `unreachable` | An http path that answers 4xx (other than 404) or 5xx | The status |
| `rate-limited` | A caller over its rate (§10) | `retryAfter`: whole seconds to wait, which is enough, since a refused call costs nothing; `burst` and `perSecond`, the limit itself. It is a JSON-RPC error with code -32029 on a resource method, and a tool result with `isError` through `resolve`, so a model can read it. It never carries the caller's address [shipped: tinypeek#6] |
| `bad-uri` | Not a string, or not a `tm://` URI | |
| `bad-cursor` | A `cursor=` the server did not issue | |
| `bad-argument`, `bad-ref` | A completion for a template argument that does not exist, or for something other than a resource template | |
| `timeout`, `git-error` | git took too long or failed | The message |
| `internal` | Anything else that goes wrong on a read | The kind of failure and nothing more. An exception's text is written for the box's owner and can hold a path on it, so it never reaches a client. A path the filesystem will not look up at all (a name too long) is `not-found`. The live server today answers such a path with an internal error that quotes the checkout's location [planned: tinypeek#7, built, awaiting deploy] |

---

## 8. Mount contract

A mount is any backend that implements three operations and one optional one. Adding a backend is adding a mount; the grammar, templates and client do not change.

| Operation | Input | Output | Required |
|---|---|---|---|
| `list(path, cursor)` | Collection | Children as URIs with `name`, `mimeType`, `size`, `isCollection`; `nextCursor`. An entry may also carry `redacted: true` (on the deny-list: listed, never read), `submodule: true` (git; it carries `mimeType: application/json` and reads as a submodule record, below) or `title` (an http page, from the build). A site's root lists its sections and names its `front_page`. A git listing at a ref (`?at=`) names its children at that ref; before tinypeek#4 it named them at HEAD, where a file of an old commit may not exist [shipped: tinypeek#4] | yes [shipped] |
| `read(path, facet)` | Leaf + facets | Content + `mimeType` + `links` | yes |
| `complete(arg, prefix)` | Template argument + prefix | Up to 100 values, `hasMore` | yes [shipped] |
| `links(path)` | Any path | The `links` array without content (`?as=stat`) | optional [shipped] |
| paging of links | Any path | Not a mount's job: the namespace orders, caps and pages every mount's links itself (`?as=links`, §9), so a mount returns its whole set and the rule lives in one place | [shipped: tinypeek#2] |

A git submodule is neither a tree nor a file of the repository that holds it: its commit lives in another repository. It reads as a record, `{mimeType, type: "submodule", path, at, commit, pinned, url, repository}`, where `mimeType` is `application/json` (what its listing claims), `pinned` is the commit it pins, `url` comes from `.gitmodules` at that ref, and `repository` is the namespace URI of the pinned commit when the server also mounts that repository and its copy has that commit (else `null`: a link that would not resolve is worse than none). It links `tm:pins` there, and `?as=log` is the commits that moved the pin. It offers `stat` and `log`; `blame` is refused. [shipped: TM-19]

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

Every response carries `links`: `{rel, href, confidence, title?, count?}`, RFC 8288 semantics. IANA relations are reused where they exist; the rest are namespaced `tm:`.

**`count`.** A link usually stands for one thing. Where it stands for several occurrences (a pattern found 41 times in a game), it may carry `count`: a whole number, zero or more, on any rel. It is a number a client can sort and filter on; `title` goes on saying it for a person. A pair that counts says the same number from both ends. It is one optional field on the link, defined here once, and not a new rel and not an RFC 8288 target attribute: those are strings a client would have to parse, which is the thing the field is for avoiding. On `tinymachines` the links that carry it are `tm:found-in` / `tm:exhibits` and `tm:demonstrated-by` / `tm:demonstrates` (how many times a rule found the pattern there, the record's own count) and `tm:links` (how many links the set holds). [shipped: tinypeek#3]

| rel | From → To | Meaning | Status |
|---|---|---|---|
| `tm:source` / `tm:renders-as` | page ↔ route source or cartridge | What emitted this page; inverse | [shipped] — incl. lesson page ↔ `prg.s`, `chr.s`, `lesson.json`, `three.txt` |
| `tm:source` / `tm:renders-as` | page ↔ the entity it is about | A game's page and the game. The pair is widened here from what emitted a page to what a page is of (§11) | [shipped: TM-16] |
| `tm:generated-by` / `tm:generates` | output ↔ generator; pulled copy ↔ its origin | The computation whose output this is, or the file a build copied in | [shipped]: TM-7 |
| `tm:input` / `tm:input-of` | generator ↔ what it reads | What a script reads that it did not make (an `offbox` node on `tinymachines`) | [shipped]: TM-7 |
| `tm:data` / `tm:read-by` | page or collection ↔ dataset | Data the page's own code reads at render time, the shared frame's excluded; a record names each route that reads it once (its page, or the collection a dynamic route's pages are listed in, which carries the `tm:data` back) | [shipped]: TM-8, TM-14, TM-18 |
| `tm:data` / `tm:read-by` | entity ↔ the record it is read from | An entity's `href` ends in a JSON pointer to its place in the record (`#/games/8`). The record answers once for each kind, with a link to that kind's collection, which carries the `tm:data` back | [shipped: TM-16] |
| `tm:found-in` / `tm:exhibits` | pattern ↔ game | A pattern and each game a rule found it in. The `title` says how many times | [shipped: TM-16] |
| `tm:instance` / `tm:instance-of` | pattern ↔ routine | A pattern and each routine a rule named with it | [shipped: TM-16] |
| `tm:demonstrated-by` / `tm:demonstrates` | pattern ↔ lesson | A pattern and each lesson whose cartridge uses it | [shipped: TM-16] |
| `tm:measures` / `tm:measured-by` | lesson ↔ game | A lesson and the game it was measured beside. `exact`, by the game's key in the lesson's record; `inferred` only for a record that keeps just the name (§11) | [shipped: TM-16, public#7] |
| `tm:cartridge` / `tm:cartridge-of` | lesson ↔ its directory in git | A lesson and its cartridge's source | [shipped: TM-16] |
| `tm:working-copy` / `tm:repository` | git path ↔ fs path | Checked-out file; inverse | [shipped] |
| `tm:pins` | submodule → repository at the pinned commit | The repository and commit a submodule names. Unpaired: a repository does not list everything that embeds it | [shipped: TM-19] |
| `version-history` (IANA) | any → `?as=log` | Commits touching this | [shipped] |
| `latest-version` (IANA) | `?at=<ref>` → HEAD | Newest revision | [shipped] |
| `alternate` (IANA) | any → same path, other facet | Another representation of one identity (`?as=rendered`, `?as=blame`) | [shipped] |
| `alternate` (IANA) | page → the same page in another locale, or on another site | Another version of the page, its `title` naming which. The other locale only where the site's build made both; the other site only where both sites serve the page. Each condition reads the same from either end, so every link is answered. A site's root is its front page as well as its top collection, so it carries the front page's versions too | [shipped: TM-20] |
| `up` (IANA) | any → parent | One level up; a mount root's `up` is `tm://<host>/` | [shipped] |
| `collection` (IANA) | leaf → its listing | Siblings | [shipped] |
| `describedby` (IANA) | any → `?as=stat` | Metadata | [shipped] |
| `tm:links` | a read over the cap → `?as=links` | The thing's whole link set, paged. Its `count` is how many links there are. Always the last link of the read that carries it. Unpaired | [shipped: tinypeek#2] |
| `next` (IANA) | a page of `?as=links` → the page after | The last link of every page but the last | [shipped: tinypeek#2] |
| `help` (IANA) | the root → an orientation document | What to read first on this box (§4). Unpaired: a document does not know it was recommended | [shipped: TM-12] |

Rules:

- Links are typed, never free text. A client ignores rels it doesn't know.
- Inverse pairs are both emitted, and a cross-version `alternate` is answered by one back. `tm:read-by` is the one bounded exception: a page on another site or in another locale is answered by the one link that stands for its route.
- `confidence` is mandatory on `tm:` rels and omitted on IANA rels.
- `href` is always a complete `tm://` URI. It may end in a fragment, which names a place inside the thing and is not part of its identity: an entity's `tm:data` carries a JSON pointer (RFC 6901) into its record. The server reads the URI and ignores the fragment, so the pointer says where to look and does not fetch it [shipped: TM-16].
- A collection is a URI whose path ends in `/`, whatever query follows it: `git/<repo>/?at=<commit>` is a tree, and a client wanting metadata reads it as it is, not with `?as=stat` added (TM-11 refuses that).
- **Fan-out is bounded.** One link per route on the canonical site and locale; dynamic routes collapse to their collection (a dynamic route whose pages share only the root is named page by page, since the root is the front page too); other sites and locales are reached through `alternate`, which is why those links are never capped (TM-20). `autopsy.json` carries 5 `tm:read-by` [shipped: TM-18]. A record most routes read still carries one a route (`projects.json`: 33). What is left after that is bounded by paging, below.
- **Links come in one order.** On every mount: the IANA relations first (they are how a client moves), then `exact`, then `inferred`, then `low`; within each by `rel`, then by `href`. The order is stated so that a page of a large set is the same page on the next read. A body may keep an order of its own where one matters (the root's `start_here` is a reading order). [shipped: tinypeek#2]
- **No read carries more than 100 links.** A set over the cap is cut to its first 99 in that order, and the read's last link is `tm:links` to `<uri>?as=links`, so nothing becomes unreachable. `?as=links` returns the whole set and no content, 99 a page, each page but the last ending in `next`; its body says `total`. Walking it yields every link exactly once. A git `at=` stays on the way there, since a ref is part of what the thing is; no other facet does. The set is the thing's own links: its `?as=stat` also points back at it with an `alternate`, which is the stat's link and is not counted or paged. Because the set is taken from the stat, a file over the byte cap and a page that would have to be fetched whole still give up their links. The rule is the namespace's and not any mount's. On `tinymachines` five things are over the cap today: the route file that renders every notebook page (349 links), three patterns (`sprite-writer` 309, `bank-switch` 200, `position-compare` 116) and the route file of the lessons (105). v0.5 called `sprite-writer` the largest set on the server; the crawler, once it counted, found the notebook's route file larger. [shipped: tinypeek#2]

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
| Unbounded reads | Byte cap per read; `?range=` beyond it; `list` pages at most 500; links at most 100 a read. The cap holds on every mount and every facet, a page's text included [shipped: tinypeek#8]. On `tinymachines` no page's text is near it: the longest is about 62 KB against a cap of 256 KB, while the HTML of 102 of 420 pages is over. |
| Secrets in the tree | Deny-list applied before any read: the `.git/` directory, credential patterns (`.env*`, `*.pem`, `*.key`, `id_*`, `*secret*`) and every other dotfile as a class, so one nobody listed (`.npmrc`, `.netrc`, `.git-credentials`) stays out. Named back in because they hold no secrets and describe the repository: `.gitignore`, `.gitmodules`, `.gitattributes`, `.editorconfig`. Refused as `denied`, listed as `redacted`. [shipped: TM-9] |
| Token exposure | Bearer token in the `Authorization` header, never in the URI. OAuth 2.1 when a second client appears. [planned: the live server is anonymous; everything it serves is already public] |
| Open proxy | The http mount fetches from loopback only. |
| Host detail in an answer | No refusal carries a path, an address or a name of the host. Structured refusals are written from the URI the client sent; an unexpected failure answers `internal` with its kind only (§7) [planned: tinypeek#7, built, awaiting deploy] |
| Request abuse | `complete` capped at 100; `list` pages at most 500; git calls time out after 15 s [shipped]. No recursive `list` on `fs` or `http`. On `git` a tree lists to at most 8 levels, 500 entries a page, from one git call under the same timeout: a walk of an object store that is already bounded, where a walk of the disk is not, which is why `fs` has none. Every tracked file under the `fs` roots is in `git/public/` and reads to depth there [shipped: tinypeek#4]. **A rate limit by caller.** Every other control bounds one request; this one bounds how many. Each caller has a bucket: a burst of 240 units, earned back at 4 a second. A read costs 1 unit, a page on `http` 5 (the server fetches it through the front door) and a read on `git` 2 (a process). `initialize`, `ping`, notifications and the two listings of tools and templates are free, so a limited client can still connect and learn the grammar. A batch is counted message by message. It is held in the transport, before anything is parsed or read, and so covers both doors, `resources/read` and the `resolve` tool. A caller is the address the front door accepted the connection from, which a client's own headers cannot change. The address is a key in a table in memory and nothing more: not logged, not stored, not returned, forgotten on restart, and the table keeps at most 10,000 callers, the longest idle dropped first. The box reading itself in-process (the deploy's crawl) is not a caller. Callers on the box that reach the port directly share one bucket; they are not exempted, since an exemption is a limit anything on the box can step around. The limit is per server process, which on `tinymachines` is one [shipped: tinypeek#6]. A per-token limit [planned: there is no token yet; a token id takes the address's place as the key] |
| Audit | **One record for every request that has an answer**, written in the transport so both doors are covered: the time, the method, the tool and the URI where there is one, how it ended (`ok`, or the refusal's reason, `rate-limited` included), the bytes sent back, the milliseconds taken, and a token id, which is null until there are tokens. **It records what was read and not who read it:** no address and no hash of one. The address is the only identity there is today and it is personal data; a token id will be who asked. **It is never served.** It is written outside the checkout, and a location under the checkout is refused outright instead of being trusted to sit outside the served roots; where it goes is configuration and is in neither repository. **It is bounded twice:** one file a day and thirty days kept, and in bytes, 8 MiB a day and 64 MiB in all with the oldest days going first, because a log bounded only by days can fill the disk it shares with the service's own state. Records past a day's cap are counted and the next day's file opens by saying how many. A record that cannot be written is counted and never fails the read. The box reading itself in-process (the deploy's crawl) leaves none [planned: tinypeek#7, built, awaiting deploy] |

**Data licensing travels with the data.** Code is MIT. visual6502-derived die data is CC BY-NC-SA 3.0, and NonCommercial + ShareAlike carry through to the netlist, measured tables, API responses and cartridges. `halfphi` embeds no die data. The autopsy publishes shape only — addresses, counts, labels — and no ROM bytes. The `licensing` tool states this at runtime.

---

## 11. Layer 5: the entity mount [shipped: TM-16]

The first application on the platform, and the test of whether layers 1–4 are done. If it can be built without changing them, they are. This section says what the mount is and then how the test went.

A read-only `entity` mount backed by two records the site already publishes (on `tinymachines`, `data/autopsy.json` and `data/lessons.json`). No new data, no ROM bytes.

```
tm://tinymachines/entity/                                   the kinds: game/, lesson/, pattern/
tm://tinymachines/entity/pattern/{key}                      pad-poll, frame-wait
tm://tinymachines/entity/game/{key}                         ded208cee37d
tm://tinymachines/entity/game/{key}/routine/{bank}-{addr}   b0-8E5C
tm://tinymachines/entity/lesson/{key}                       jump
```

Identity is the stable key already in the data, not a file path, so it survives a page or a file moving. A routine's key is its bank and its address in hex.

**What reads.** Each entity reads as `application/json`: `entity` (its kind), `key`, the record's own fields, and its links. `?as=stat` gives `{entity, key, name, mimeType, size}` with the same links; no other facet is offered. `entity/{kind}/` lists the keys with a `title` each (a game's name, a lesson's title, how often a pattern was found). A game is an entity and has things under it, so `entity/game/` lists both `{key}` and `{key}/`, and `entity/game/{key}/routine/` lists that game's routines.

- A **pattern** carries `games`, `count` (how many times a rule found it), `routines` (how many routines that is), `found_in` and `demonstrated_by`, each entry with its own count.
- A **game** carries its record without the two routine lists, which are addressed one by one, plus `routines_measured`, `routines_named` and `routines_at`, the URI of its listing.
- A **routine** carries its record (`name`, `bank`, `addr`, `kind`, `entered`, and `is`, the patterns with the evidence for each), its `address` in hex and its `game`. A loop a rule named is a routine here, with `kind: "loop"`.
- A **lesson** carries its record and its `topic`, without the cartridge's bytes and without its pictures' bytes. Those stay in the record.

**Only what a rule named has an address.** On `tinymachines` the record holds 5,139 routines and 50 loops across 19 games. Rules put 799 marks on 729 of them (679 routines and 50 loops), because one routine can earn several marks and the same mark twice. Those 729 are the routine entities. Asking for one of the others is refused as `not-found`, and the refusal says the routine ran and carries no pattern, so a client can tell an unnamed routine from a wrong address. A count on a link is of marks, as the record's own counts are.

| From | rel | To | Confidence |
|---|---|---|---|
| pattern | `tm:found-in` | game (each, the count in the `title`) | exact |
| pattern | `tm:instance` | routine (each) | exact |
| pattern | `tm:demonstrated-by` | lesson | exact |
| game | `tm:exhibits` | pattern | exact |
| routine | `tm:instance-of` | pattern | exact |
| lesson | `tm:demonstrates` | pattern | exact |
| game | `tm:renders-as` | its `/autopsy/games/{key}` page, in each locale and on each site that has it; the page links `tm:source` back | exact |
| lesson | `tm:cartridge` | `git/public/lessons/{key}/`, where that directory is tracked; it links `tm:cartridge-of` back | exact |
| lesson | `tm:measures` | game; the game links `tm:measured-by` back | exact by key; inferred by name |
| any entity | `tm:data` | the JSON record, a JSON pointer in the fragment | exact |

Every pair is answered from the other end, and the crawler holds each to the same confidence both ways.

**A lesson and its game are joined by the key the record keeps.** A lesson's record says which game it was measured beside as `against.game`, a name, and `against.key`, that game's key. The mount follows the key, and the link is `exact`. On `tinymachines` all 25 lessons carry one: 20 name the cartridge that holds Super Mario Bros. and 5 name The Legend of Zelda. The record's writer refuses a key that is not a game in the autopsy's record, and the keys were checked against the dumps the measuring runs load, not assumed from the names. [shipped: public#7]

A record with only the name is still read, by the rule the mount shipped with: the two are linked when exactly one game has that name, once a region or revision in brackets is set aside and a trailing article is moved back to the front, and that link is `inferred`. That rule joined 5 of the 25 before the records carried keys. A key that names no game is not followed, and the name is not tried in its place: a refusal beats a plausible answer.

**Refusals teach, as elsewhere.** A wrong key answers with the nearest keys; a game asked for by its name is offered by its key; a kind or a collection spelled without its slash is offered with it. A collection refuses `?as=stat` (TM-11).

**Not covered.** No entity for a routine no rule named, for a variable, a table or an array (they are fields of the game). No link from a routine to a lesson that implements the same thing: the records do not join them below the pattern. No page for a pattern, since the site renders all of them on one page. The server does not follow a JSON pointer.

### How the test went

The claim under test was that layers 1–4 were finished. The mount needed these changes below it. Each is small, and each is a finding.

| Layer | Needed | Verdict |
|---|---|---|
| 1 Transport | Nothing. The instructions gained a sentence | Done |
| 2 Addressing | Nothing in the grammar. The mount's name joined the list of mounts and two templates were published | Done |
| 3 Resolver | **One gap.** The rule that every pair is answered means a mount that links to a page, a directory or a record needs that thing to link back, and nothing let one mount answer for another. The resolver gained one hook: each mount asks the entity mount what to add for the thing it is serving. Three mounts call it (`http` for a game's page, `git` for a lesson's directory, `fs` for a record) | Was not done. It is one hook now, not three special cases |
| 3 Resolver | `stat` extended to a fifth mount, by the same rule the other four follow | Done |
| 4 Vocabulary | Ten rels, added as table rows (§9). No change to the link's shape | Done, as the layer promises |
| 4 Vocabulary | **Two rules widened.** `tm:read-by`'s bounded exception was written for pages: a record names each route once. It now reads "each reader once", where a reader is a route or a kind of entity, or `autopsy.json` would carry 764 links back, one for each pattern, game and routine. And `tm:source` / `tm:renders-as` meant what emitted a page; a game's page and the game use it for what a page is of | Was not done: both rules were written around the one application that existed |
| 4 Vocabulary | A count had nowhere to go on a link, and went into `title` and the body | Was not done. The link gained one optional field, `count` (§9), on purpose: the vocabulary changed its shape once, and not by a new rel [shipped: tinypeek#3] |
| 3 Resolver | A pattern's read carried 309 links, and the planned paging did not exist | Was not done. The namespace now orders, caps and pages links for every mount (§9); no mount changed to get it [shipped: tinypeek#2] |
| 4 Vocabulary | An `href` may now carry a fragment, which a client comparing identities must drop | A rule added (§9) |

So the platform was close and not finished. The grammar and the transport held without a change. The resolver lacked a way for mounts to answer each other, and two vocabulary rules had the first application's shape baked in. A second application is the next test of whether those are now general.

---

## 12. Open questions and v2

- **Manifest schema.** `tinymachines` settled for a small hand-kept `lineage.json` checked by a test, plus what records and the build already say (§8). Whether a framework-emitted `tm-links.json` is worth having is open.
- **Multi-host.** One server per box, or one fronting several? The grammar allows both.
- **Subscriptions.** `resources/subscribe` for change notification. Defer until a use appears.
- **CI conformance.** [shipped: TM-15] A link-integrity crawler runs at the end of every `tinymachines` deploy, after the beta follows: every `href` resolves, no `up` names itself, every `tm:` pair has its inverse (§9's bounded exception included), every listed child resolves with the claimed mimeType. About 3,200 URIs a run with the entity mount (2,300 before it). It holds the five entity pairs to the same confidence and the same `count` at both ends. It fails a read over the link cap, and walks `?as=links` wherever a read points there (every link once, as many as it said), so an inverse on a later page still counts [shipped: tinypeek#2]. And a run whose budget ends with URIs still queued fails instead of passing on what it reached [shipped: TM-16].

v2, deliberately excluded:

- **Proposals.** A tool that takes a URI the client wishes existed plus a description, stages a scaffold as a branch or diff, and returns a review URI. Nothing lands without owner approval.
- **Elicitation** when a proposal is ambiguous.
- **Write verbs.** None planned; mutation stays behind proposals.

---

Sources: [MCP specification](https://modelcontextprotocol.io/specification) · [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986) · [RFC 6570](https://www.rfc-editor.org/rfc/rfc6570) · [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288) · [RFC 6750](https://www.rfc-editor.org/rfc/rfc6750) · [IANA link relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml)
