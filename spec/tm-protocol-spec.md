# tm:// Protocol Spec — Read-Only URI Namespace over MCP

**Version 0.24 · 2026-10-22 · Spicy / Meatball Labs · [tinypeek](../README.md)**

Every marker below was checked against the running server. What each version changed, and when it went live, is in the [version history](#version-history) at the end.

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
 5  Applications       entity index, mcp servers, search, proposals (v2), dashboards
    ─────────────────  ← platform boundary
 4  Link vocabulary    typed rels between resources (tm:source, tm:data, …)
 3  Resolver           list / read / complete → content + links
 2  Addressing         tm://<host>/<mount>/<path>?<facets>
 1  Transport          MCP: initialize, tools/resources, auth
```

| Layer | Owns | Done when | Status |
|---|---|---|---|
| 1 Transport | Session, capabilities, auth, the `resolve` tool | A new mount or rel needs no transport change | [shipped] |
| 2 Addressing | The URI grammar and templates | Any thing on the box has a URI; adding a mount doesn't change the grammar | [shipped]: `fs`, `git`, `http` and `offbox` all fit one shape (`offbox` was added in TM-7 without a grammar change). `entity` fits it too (TM-16, §11), and so does `mcp`, the sixth, which reaches off the box (tinypeek#22, §13), and `kinds`, the seventh, the server's own registry (tinypeek#23, §14) |
| 3 Resolver | What is behind a URI; errors; facets | Every URI returns content plus typed links, with no grammar change | [shipped]: TM-11, TM-19, TM-20 live since 2026-10-10. TM-16 found one gap here: a mount had no way to answer for a link another mount starts (§11). tinypeek#23 added one rule in one place: every read says its kind in its media type, and a link may say its target's (§14) |
| 4 Link vocabulary | The closed set of relations | A client can traverse knowing only rel names; a new rel is a vocabulary change, not a resolver change | [shipped]: TM-7, TM-8, TM-14, TM-18. TM-16 added ten rels as table rows and widened two rules (§11) |
| 5 Applications | Everything semantic | Built without touching layers 1–4 | [shipped: TM-16]: the `entity` mount is the first, and §11 records how the test went. The `mcp` mount is the second (tinypeek#22), and §13 records its test |

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
| Token handling | Bearer in header; OAuth 2.1 for remote clients | MCP authorization; RFC 6750 | [planned, not scheduled: tinypeek#5]: the live server is anonymous and read-only, with no token at all (§10) |
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

**No subscriptions, and why (tinypeek#11).** The server says `subscribe: false` and `listChanged: false` at `initialize`, answers `resources/subscribe` with method-not-found, and refuses a request for an event stream. That is the intended answer and not a gap waiting for a ticket. Three uses were named, and each is met today by reading again:

| What changed | What a client reads | What it compares |
|---|---|---|
| A branch moved | a git tree or a git `?as=stat`, at the ref | `commit`, the commit the ref names now |
| A record was rewritten | the record's fs `?as=stat` | `modified` and `size` |
| A deploy changed a page | the page's http `?as=stat` | `status`, `contentType` and `size` |

The reasons, in the order they weigh:

- **The server does not know who its callers are, on purpose.** A subscription is a promise to tell someone later, so it needs a someone: a session, a stream held open for it, and a list of who asked for what. This transport is one request and one answer with nothing kept between them, the server is anonymous (§10), and its record of requests holds no address. Subscriptions would undo all three for a convenience.
- **Nothing here changes faster than a person can commit or deploy.** Every change on `tinymachines` arrives by one of those two acts, by hand. A client that reads a stat once a minute is never more than a minute behind, and the rate limit (§10) leaves room for it: a hundred file stats a minute is under half of what one caller's bucket refills in that time.
- **A link set makes a notification expensive to mean anything.** A record changing changes the links of everything read from it, and on `tinymachines` one record stands behind 764 entity addresses (729 routines and loops, 19 games, 16 patterns). A client subscribed to one of them is owed a notice when the record moves, so the server would have to hold the fan-out the resolver now works out per read. Should this ever be built, that is the rule: a notice means "this URI's bytes or its links may differ, read it again", and it goes to whoever subscribed to that URI, whatever the cause.

What reading again does not cover: a page's stat carries no validator stronger than its size, so a page that changes and keeps its length cannot be told from one that did not without reading it. And a client learns of a change when it next asks, not when it happens.

What would reopen it: a client with a real need to know within seconds, or tokens (§10, tinypeek#5), which would give the server a caller to keep a promise to.

---

## 5. URI grammar [shipped]

```
tm://<host>/<mount>/<backend-path>[?<facet-params>]
```

| Part | Rule | Example |
|---|---|---|
| `host` | A name the server answers for. `tm://`, with no host, lists them (below). | `tinymachines` |
| `mount` | Backend type plus instance | `fs`, `git/6502`, `http/tinymachines.ai` |
| `backend-path` | The backend's native path. Trailing `/` = collection. | `docs/nes/pile.md`, `/autopsy/games/` |
| `facet-params` | Representation, not identity | `?as=stat`, `?at=main`, `?range=0-65535`, `?lines=10-20` |

Representation stays in the query string so one thing keeps one identity. `tm://tinymachines/git/6502/README.md` is the file; `?at=v0.3` is the same file at a tag; `?as=log` is another representation of it.

### Hosts [shipped: tinypeek#10]

**A server answers for a set of hosts, and a set of one is conformant.** Whether a fleet is one server a box or one server in front of several is a matter of how large that set is, and a client cannot tell the two apart and need not. `tinymachines` is one box, one server and one host, and that is the whole protocol, not a first step toward it.

- **`tm://` lists the set.** It reads as `{uri, hosts: [{uri, name, what}]}` with a `collection` link to each host's root, and each host's root goes `up` to it. It takes `?as=links` as any collection does and refuses every other facet with `bad-facet`. A server with one host lists one, so a client's first read is the same however many there are.
- **A host is a name, not a place to look.** Nothing in a `tm://` URI says where its server is, so a server cannot follow, check or answer the inverse of a link to a host it does not answer for. It must not emit one: every `href` is under one of its own hosts, which is the crawler's first rule already (§12). A link may cross hosts inside one server's set, and that server answers for both ends.
- **A host it does not answer for is refused** with `not-found`, and `nearest` holds its hosts' roots and `tm://`.
- **A host compares without case** (RFC 3986), and an answer carries the one lowercase spelling. A path keeps its case.
- **A host need not be a machine** [settled: tinypeek#19]. Nothing above says machine: a host is a name a server answers for, and what makes `tinymachines` a box is its mounts, which are a box's (`fs`, `git`, `http`). A device, a bench or a place would come in one of two ways, and the grammar takes both without a change. As a mount of a host that already answers, the way `entity/` came (§11): the thing is read through this server, under `tm://tinymachines/<mount>/`, and a mount is a backend type, which §2 lets a server add. Or as a host of its own, `tm://<name>/`, with its own mounts, when it answers for itself; then the questions deferred above (how a client finds its server, how two servers keep a pair true) stop being hypothetical, and if it is not public, tokens (§10) are scheduled with it. The `offbox` mount is the third thing, and the line between the three is a server: an `offbox` node is a place named and described and not answered for; a mount is answered for by this host's server; a host answers for itself. Nothing is built for this, on purpose: the first device with readable state, or the first bench, decides which way it comes, and one box cannot say in advance.

Not covered, and deferred until a second box should be in the namespace: how a client holding one server's URI finds another server, and how two servers would keep a pair of links true across them. Either needs something this grammar does not have, a way from a host's name to its server, and one box cannot say what that should be.

Published templates (RFC 6570):

```
tm://
tm://{host}/
tm://{host}/fs{/path*}{?at,as,range,lines,pointer,rel,min,cursor}
tm://{host}/git/{repo}{/path*}{?at,as,n,depth,range,lines,pointer,rel,min,cursor}
tm://{host}/http/{site}{/path*}{?as,range,lines,rel,min,cursor}
tm://{host}/offbox/{name}{?as,rel,min}
```

These are the templates the live server publishes. **Each names every parameter its mount takes**, and a read refuses any other (§6), so a client can learn a mount's whole grammar from the server and need not carry a list of its own. Until v0.15 the templates named fewer parameters than the server took (`as` and `range` on `fs`, `range` on `git`, `cursor` on any collection), and tinylens carried the difference itself [shipped: tinypeek#13]. `tm://` and a host's root take `?as=links` only, with its `rel=` and `min=` (§9); `cursor=` rides with `?as=links` on anything (§6), which the two literal templates do not spell out.

The entity mount brings two more [shipped: TM-16]:

```
tm://{host}/entity/{kind}/{key}{?at,as,rel,min,cursor}
tm://{host}/entity/game/{key}/routine/{routine}{?at,as,rel,min,cursor}
```

### Mounts on `tinymachines`

| Mount | Contents |
|---|---|
| `fs/` | `docs/`, `data/`, `notes/` |
| `git/` | `2a03`, `2c02`, `6502`, `halfphi`, `nes`, `nes-bench`, `nes-bus`, `ntsc-crt`, `public`, `tinypeek` |
| `http/` | `tinymachines.ai`, `beta.tinymachines.ai`; both serve an `/ja` locale |
| `offbox/` | Where a build chain leaves the box: `autopsy-models`, `cartridges`. Named and described, never served (§8) |
| `entity/` | The autopsy's patterns, games, routines and lessons (§11) [shipped: TM-16] |
| `mcp/` | The MCP servers the box reads, each with its tools, resources and prompts as things with addresses (§13): `campaignbrain`, `resume`, `terrapulse` [shipped: tinypeek#22]; and, where a map is derived for one, its data as addresses too (13.1) [shipped: tinyhelper#6] |
| `kinds/` | The kinds of thing the host has served, measured as they go out, each with its media types, its counts and the links it carried (§14) [shipped: tinypeek#23] |

The fourth mount arrived without a grammar change, which is the layer-2 test from §2 passing in practice. So did the fifth, and the sixth.

---

## 6. Facets

| `as=` | Applies to | Returns | Status |
|---|---|---|---|
| `text` | http | Readable extraction of the rendered page's main element. **Default for an http page.** Something that is not a page (robots.txt, a picture) reads as itself with no facet | [shipped]: TM-4 |
| `text` over the cap | http | A page whose text is over the byte cap is refused as `too-large` with its size and a `?as=text&range=` template (and, since v0.17, a `?as=text&lines=` one), and each range reads. | [shipped: tinypeek#8] |
| `rendered` | http | The HTML a visitor gets | [shipped] |
| `raw` | fs, git | Bytes with the backend mimeType; base64 `blob` for binary. The default for fs and git files; `resolve` returns the blob only when `as=raw` is asked for | [shipped]: TM-2 |
| `stat` | fs, git, http, offbox, entity, mcp, kinds | Metadata plus links, no content. For http: status, contentType and size, fetched without following a redirect, and since v0.23 the `mimeType` the thing reads as. It is the one facet a tool, a resource or a prompt of an MCP server offers, and the one a kind in the registry offers; an entity offers it and `set` | [shipped]; on entity since TM-16; on mcp since tinypeek#22; on kinds since tinypeek#23 |
| `links` | every mount | A thing's links and no content, a page at a time (§9). The body is `{uri, total, returned, nextCursor?, rel?, min?}`; the links ride where links always ride. `cursor=` continues, and here it is the links' cursor even on a collection. `rel=` and `min=` narrow the set to one rel and to a count at least `min` (§9) | [shipped: tinypeek#2; the filter tinypeek#17] |
| `set` | entity | A set and its members in one read (§14). On a thing, the targets of one rel, named by `rel=` and narrowed by `min=` as `?as=links` is; on a collection, its leaf children. Each member is what its own address reads, body and type, with no links of its own, since those are behind its address. Paged, 25 members a page, `cursor=` continuing; held to the byte cap like any read. Only a rel whose targets are things of this mount can be inlined, and any other is `bad-facet` naming the ones that can. The set carries the thing's links and an `alternate` back to it | [shipped: tinypeek#23] |
| `log` | git | Commits touching the path | [shipped] |
| `blame` | git | Line attribution | [shipped] |
| `tree` | git | The listing of a tree, one level, paged; the default for a git collection | [shipped] |
| `tree` with `depth=N` | git | The tree to N levels, 1 to 8, in one read. Each entry is named by its path below the tree and carries its `depth`; entries come in path order, so a directory is just before what is in it, and a directory at the last level is listed to be read on. Paged like any listing, 500 entries a page. A submodule is listed and never entered. A denied name is `redacted` at any depth. `depth=1` is the plain listing, directories first. A depth out of range, or on something that is not a tree listing, is `bad-facet` | [shipped: tinypeek#4] |

Other params: `at=<ref or time>` (git and fs, below; on git it defaults to HEAD, and for `6502` to the commit the site serves), `n=<count>` (log, 1 to 100, default 20), `depth=<levels>` (git tree, above), `range=<start>-<end>` (fs and git; bytes `[start, end)` beyond the cap, the end stopping at the thing's end, at most the cap in one read). On http a range is of a page's text, in bytes of UTF-8, with `?as=text` or with no `as`; a cut inside a character reads as the replacement mark at that edge. A range on `rendered`, on `stat`, on a listing or on something that is not a page is refused as `bad-facet`, not dropped [shipped: tinypeek#8], `lines=<first>-<last>` and `pointer=<JSON pointer>` (the other two spans, below), `rel=<rel>` and `min=<count>` (the filter on `?as=links`, §9, and on `?as=set`; refused with any other read, as a `cursor=` off a listing is), `cursor=` (the `nextCursor` of a paged listing).

**Rule:** an unsupported facet returns `bad-facet` listing the valid ones, on files and collections alike. An unknown `as` is refused on every mount [shipped]. A collection offers only its listing (and, on git, `log`; on entity, `set`): a file's facet on one (`?as=stat` on an fs directory, `?as=rendered` on an http collection, `?as=stat` or `blame` on a git tree) is refused rather than dropped [shipped: TM-11]. **A parameter a mount does not take is refused too**, as `bad-facet` naming the ones it takes: `?at=` on an http page, `?depth=` on anything but a git tree, `?pointer=` on a page (until v0.17 the example here was `?lines=` anywhere, which is now taken). Before v0.15 it was dropped, and the answer looked like the one asked for (a page "at" a date the mount has no notion of). `cursor=` continues a listing or `?as=links`, and on anything else is refused the same way [shipped: tinypeek#13].

**The time axis:** `at=` is one parameter with two spellings, and means the same thing on every mount that has a past [shipped: tinypeek#15]. A ref (a branch, a tag, a commit) names a commit, as it always did. A time, spelled as an ISO 8601 date (`2026-10-01`) or instant (`2026-10-01T12:00:00Z`, an offset allowed), names the newest commit on the main line (HEAD's first-parent line) made at or before it. A date alone is the start of that day in UTC; an instant without an offset is UTC. The two are told apart by shape, so a tag spelled like a date is reached by its commit. The clock is the committer's, which is the order the history is in; the log's `date` is the author's, and each log entry also carries `committed`, so a client can pick a time that lands on a commit it has seen. A time after the newest commit is HEAD, and will not stay so; a time before the first commit is `no-such-ref`, naming the first commit's time (§7). The echo keeps the time as it was spelled, and `?as=stat` says which commit it became, as it does for a ref.

On `fs`, `at=` reads the file or directory as the repository behind it had it: for a tracked file that is the checkout's own repository, and for a page the build pulls in it is the repository the page was pulled from, which the file's `tm:repository` or `tm:generated-by` link names. HEAD is not `fs`'s default (the checkout is), so `?at=HEAD` stays in the echo. A directory at a ref lists what the repository had, so a pulled page is not in it; its `?as=stat` carries the commit and the time of the last change at or before it instead of the checkout's modification time; `latest-version` points at the checkout, and the pair into git holds at the ref (§9). A mount with no past of its own refuses `at=` as `bad-facet` and says where the past is: a page's is at its route (`tm:source`); what is kept off this box has none here; an MCP server's answers have none here, since it is read as it answers now (§13). How a client learns what times a thing has: its `version-history` link, which every file on `fs` and `git` carries, and whose entries name commits and their times.

**An entity at a time** is read from its records as the repository had them at the commit `at=` names, a ref or a time with the meaning above [shipped: tinypeek#21]. Every entity address in that answer carries the same `at=`, spelled as it was asked, so the pairs between entities (`tm:found-in` and `tm:exhibits`, and the rest of §11) hold at that time; listings at a time list what was there then; `tm:data` reads the record at that time (`fs/<record>?at=<at>&pointer=<pointer>`); `?as=stat` adds `at` and the `commit` it became. What has no past is not named: a game at a time links to no page and a lesson to no cartridge directory, so no pair is offered one way. `latest-version` goes to the entity now, when it is there now. Every entity, now or at a time, carries `version-history` to its record's log in `git`, which is where its times are; no new facet was needed. A thing that was not in the records then is `not-found`, and when it is there now its address comes first in `nearest`. Not covered: the inverse from the record at a time back to the entities at that time (`tm:read-by` is the record's now), and a diff between two times, which a client makes from two reads. No new facet was needed for that.

**A readable piece:** a piece of a thing has an address and reads, so a page that quotes a span can keep where it came from, which is the transclusion the lens asked for (`docs/lens.md`, idea 2) [shipped: tinypeek#16]. There are three spans, and a read takes one of them. `range=<start>-<end>` is bytes, as above. `lines=<first>-<last>` is lines of a text, counted from 1 and both included, the end stopping at the last line; a span that starts past the last line is `not-found`, saying how many lines there are. `pointer=<JSON pointer>` (RFC 6901, so `/games/3` is the fourth game and `~1` spells a `/` in a key) is what the pointer names in a JSON file, read as JSON; the empty pointer is the whole document and so the identity; a pointer that leaves the document is `not-found`, saying how far it got and what was there (§7). `fs` and `git` take all three, on a file now or at a ref; `http` takes `range` and `lines`, of a page's text, as a range always was; `mcp` takes all three on a tool, a resource or a prompt, the piece being of the description the server published, which is how a tool's schema has an address of its own (§13) [shipped: tinypeek#22]. A span is of the content, so it is refused as `bad-facet` on a listing and with any facet that is not the content (`stat`, `log`, `blame`, `tree`, `rendered`, `links`), and `lines` or `pointer` on something that is not text (a `pointer` on text that is not JSON) is refused the same way; `range` still reads the bytes of anything. A piece is held to the byte cap like any read, and a text over the cap, which is the case a quote most needs, is refused with a `?lines=` template beside the `?range=` one. The span is a facet, not a fragment, because a fragment is not identity by the rule in §9 and the server ignores it; so the entity mount's `tm:data` now carries its pointer as `?pointer=`, and the link reads the piece (§9, §11). Not covered: a span on a listing, a pointer into a record that is not JSON, and a span by anything but lines, bytes or a pointer (a heading, a CSS selector, a byte range of the HTML).

**The echo:** the `uri` an answer carries is the thing's identity plus every parameter the read used, as it used it: a range as the bytes it became, a line span as the lines it became (an end past the last line is spelled as the last line), a pointer as it was spelled, a clamped `n` as the number it became, a listing's page with the cursor that reached it. A parameter that only spells out the default (`?as=raw` on a file, `?at=HEAD`, `?n=20`) is the identity and is left out. So a parameter a client sent and does not see in the echo is one the server did not use, and since v0.15 that cannot happen without a refusal [shipped: tinypeek#13].

MimeType is decided by content as well as extension: valid UTF-8 with no NUL bytes in the first 8 KiB is text. Assembly sources return `text/x-asm`. [shipped] What the media type says about a thing the server composes, and the registry of kinds, are §14.

---

## 7. Errors [shipped unless marked]

Never a bare 404. Every failure is structured and, where possible, teaches the client the right next URI.

| Code | When | Carries |
|---|---|---|
| `not-found` | No such path | `nearest`: up to five names ranked by edit distance, then a shared start, then alphabetically for ties; a path whose directory is missing answers from the deepest one that exists [shipped: TM-5]. `nearest` never contains the URI that was refused, which a client following it would take round forever; `x/` offered for `x` is a different address and allowed [shipped: TM-19] |
| `not-found` (on a span) | A line span past the text, or a pointer that leaves the document | For lines: `lines`, how many the text has, and the whole as `nearest`. For a pointer: `at`, the pointer as far as it held, with the `keys` there (an object) or the `length` (an array), and the piece at `at` as `nearest` [shipped: tinypeek#16] |
| `no-such-ref` | Bad `at=` | Up to five real refs (HEAD, branches, tags), ranked the same way [shipped: TM-5]; for a time before the first commit, that commit's time, as `?at=` on the repository's root [shipped: tinypeek#15] |
| `bad-facet` (on `at=`) | An `at=` that is not a ref name (`..`, a leading `-`, a space), or is shaped like a time and is not one (`2026-13-01`) | Refused before git sees it |
| `too-large` | Over the byte cap | Byte size and a `?range=` template, and since v0.17 a `?lines=` one; for an http page's HTML, its `?as=text` and `?as=stat`; for an http page's text, its size, `?as=text&range=` and `?as=text&lines=` templates and its `?as=stat` [shipped: tinypeek#8, tinypeek#16]. A span whose piece is itself over the cap is `too-large` with its size |
| `binary` | Binary content without `as=raw` | mimeType and a `?as=stat` link |
| `bad-facet` | Unsupported `as=`, or a parameter the mount does not take | The facets that path accepts, or the parameters the mount takes [the latter shipped: tinypeek#13] |
| `bad-facet` (on a span) | Two spans in one read; a span on a listing or with a facet that is not the content; `lines` or `pointer` on what is not text, `pointer` on what is not JSON; a span that is not spelled right (`lines=5-4`, a pointer without its leading `/`) | Which, and what would read [shipped: tinypeek#16] |
| `out-of-root` | Traversal outside a mount (plain or percent-encoded) | — |
| `denied` | Matches the deny-list | (the path is listed as `redacted`) |
| `redirect` | An http path the site redirects | The status; `?as=stat` reports it without following |
| `unreachable` | An http path that answers 4xx (other than 404) or 5xx; on `mcp`, a server that did not answer as an MCP server does (§13) | The status, where there was one; on `mcp`, the kind of failure, and the server's record as `nearest`, which says the same word [the mcp case shipped: tinypeek#22] |
| `gated` | On `mcp`, a server that wants a token the box did not give: it answered 401 or 403 | `status`, and the server's record as `nearest`, which says `gated` too and whether a token is held [shipped: tinypeek#22] |
| `rate-limited` | A caller over its rate (§10) | `retryAfter`: whole seconds to wait, which is enough, since a refused call costs nothing; `burst` and `perSecond`, the limit itself. It is a JSON-RPC error with code -32029 on a resource method, and a tool result with `isError` through `resolve`, so a model can read it. It never carries the caller's address [shipped: tinypeek#6] |
| `bad-uri` | Not a string, or not a `tm://` URI | |
| `bad-cursor` | A `cursor=` the server did not issue | |
| `bad-argument`, `bad-ref` | A completion for a template argument that does not exist, or for something other than a resource template | |
| `timeout`, `git-error` | git took too long or failed | The message |
| `internal` | Anything else that goes wrong on a read | The kind of failure and nothing more. An exception's text is written for the box's owner and can hold a path on it, so it never reaches a client. A path the filesystem will not look up at all (a name too long) is `not-found`. Before 2026-10-11 the live server answered such a path with an internal error that quoted the checkout's location [shipped: tinypeek#7] |

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

A git submodule is neither a tree nor a file of the repository that holds it: its commit lives in another repository. It reads as a record, `{mimeType, type: "submodule", path, at, commit, pinned, url, repository}`, where `mimeType` is `application/vnd.tm.submodule+json` since v0.23 (what its listing claims; it was `application/json`), `pinned` is the commit it pins, `url` comes from `.gitmodules` at that ref, and `repository` is the namespace URI of the pinned commit when the server also mounts that repository and its copy has that commit (else `null`: a link that would not resolve is worse than none). It links `tm:pins` there, and `?as=log` is the commits that moved the pin. It offers `stat` and `log`; `blame` is refused. [shipped: TM-19]

Collections listed by a mount must be complete. For `http`, dynamic routes (`[game]`, `[lesson]`) are enumerated from the framework's build output, not a hand-kept route list. [shipped — TM-3]

### The link resolver

The one part with no off-the-shelf answer: knowing that a page was produced by a given source file and reads a given dataset. Three sources, tried in order:

1. **What a record says of itself.** A data record's own note naming its writer (`Written only by scripts/…`) makes that `tm:generated-by` exact. [shipped: TM-7]
2. **The build's own output.** The framework's prerender manifest lists every page a route renders, dynamic routes included (`tm:source` / `tm:renders-as`, exact); each page's server bundle and its source maps confirm which reader modules ship with it. [shipped: TM-3, TM-8]
3. **Route and import introspection.** A module reads a record when it builds the record's path or imports it, never when a comment names it. A page's data is what its own code reads, through the library but never through the shared frame's modules: exact for a reader the page imports itself, inferred further down. [shipped: TM-8, TM-14]
4. **A small manifest** for what nothing above can see: what a script reads that it did not make, and where the chain leaves the box. On `tinymachines` this is `api/lineage.json`, and a test holds every path it names to be tracked. Exact. [shipped: TM-7]
5. **Heuristic.** A script under `scripts/` that names a record it is not stated to write: `inferred`.

Every `tm:` link carries `confidence: exact | inferred | low`. The live server emits `exact` and `inferred`; `low` is reserved for path-shape guesses, which it does not make.

**No link manifest, and why (tinypeek#9).** The question was whether the site's build should emit one file, a `tm-links.json`, stating every join outright, in place of the five sources above. It was settled by counting what the sources already give, on `tinymachines` on 2026-10-11:

| | |
|---|---|
| Typed (`tm:`) links the crawl reaches | 8,260 |
| Of them `exact` | 8,054, which is 97.5% |
| Of them `inferred` | 206 |
| Where the inferred ones come from | 10 of the 69 route-to-record reads, all through two library modules a page reaches two imports down, counted once for each page, site and locale; and 2 scripts that name a record they are not stated to write |
| Joins kept by hand | 3 paths under 2 nodes, in `lineage.json`, each held to a tracked file by a test |
| Records with no writer known | 7 of 17. They are kept by hand, so there is no writer for a manifest to name |

So a manifest would replace 206 inferred links and 3 hand-kept lines, and it would restate the other 8,054, which the build, the records and the repositories already state. A fact in two files is a fact that drifts, and here the second file would be the larger one. **Decision: not built.** The sources stay the one copy.

Two things a manifest could do that the sources cannot, noted so the decision can be revisited on its merits:

- **Say what a page really read.** The 206 are inferred because reaching a module is not the same as reading its record at render time. A build that recorded the files each page opened while it was prerendered would make them exact. That is a change to the site's build, and it is worth doing only if those ten reads start to matter.
- **Carry the protocol to a second site.** Everything above is particular to this one: a framework's prerender manifest and source maps, a convention for how a module names a record, the notes records keep about their writers, two pull scripts. A site built another way could reuse none of it, and a manifest schema is the portable answer. That is the condition that reopens this: a second deployment (§12, multi-host). Until there is one, a schema would be designed against a single example.

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

Every response carries `links`: `{rel, href, type?, confidence, title?, count?}`, RFC 8288 semantics. IANA relations are reused where they exist; the rest are namespaced `tm:`.

**`type`.** A link may carry the media type its target reads as, RFC 8288's target attribute of that name, so a client can tell a page from a record from a listing before following (§14). The namespace fills it in on every link whose address settles the kind, on every mount, in one place; a link whose target the address does not settle carries none, and the field is never a promise a client must have. The crawler follows every link that carries it and holds the target to it. [shipped: tinypeek#23]

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
| `tm:working-copy` / `tm:repository` | git path ↔ fs path | Checked-out file; inverse. At a ref the pair holds at that ref, both ends carrying the same `at=` (§6) | [shipped]; at a ref since tinypeek#15 |
| `tm:pins` | submodule → repository at the pinned commit | The repository and commit a submodule names. Unpaired: a repository does not list everything that embeds it | [shipped: TM-19] |
| `tm:step` / `tm:step-of` | trail ↔ each thing on it | A trail is a file (below) and its steps are the addresses it lists, as it writes them, facets and all; each step links back to every trail it is on, on whatever mount it lives. `title` says the position (`step 2 of 6`) and the step's note; the order is the file's | [shipped: tinypeek#18] |
| `tm:served-by` / `tm:serves` | a tool ↔ the MCP server that lists it | A tool of a server the box reads (§13), and the server back, one link a tool. `exact` both ways: the server listed it | [shipped: tinypeek#22] |
| `tm:schema` | a tool → `?pointer=/inputSchema`, and `?pointer=/outputSchema` where the server published one | A tool's schemas as the server published them, each a piece of the tool's own record (§6), so a schema has an address and reads. Unpaired: it names a piece of the thing that carries it | [shipped: tinypeek#22] |
| `tm:data` / `tm:read-by` | a server's map ↔ the two files it is read from | The derived map and its override (13.1), `exact` both ways: the map is those files merged. The file in `fs` answers with the map | [shipped: tinyhelper#6] |
| `tm:read-with` | a mapped read → the tool it was made with | What a map's entry names (13.1), with the entry's confidence, so a lens can show the tool behind a thing. Unpaired: a tool with thousands of things behind it would carry thousands back, and the map says which paths read it | [shipped: tinyhelper#6] |
| `version-history` (IANA) | any → `?as=log`; an entity → its record's log in `git` | Commits touching this | [shipped]; on entity since tinypeek#21 |
| `latest-version` (IANA) | `?at=<ref>` → HEAD; on fs, → the checkout; on entity, → the entity now | Newest revision | [shipped] |
| `alternate` (IANA) | any → same path, other facet | Another representation of one identity (`?as=rendered`, `?as=blame`) | [shipped] |
| `alternate` (IANA) | page → the same page in another locale, or on another site | Another version of the page, its `title` naming which. The other locale only where the site's build made both; the other site only where both sites serve the page. Each condition reads the same from either end, so every link is answered. A site's root is its front page as well as its top collection, so it carries the front page's versions too | [shipped: TM-20] |
| `up` (IANA) | any → parent | One level up; a mount root's `up` is `tm://<host>/`, and a host root's is `tm://` (§5) [shipped: tinypeek#10] | [shipped] |
| `collection` (IANA) | leaf → its listing | Siblings | [shipped] |
| `describedby` (IANA) | any → `?as=stat` | Metadata | [shipped] |
| `tm:links` | a read over the cap → `?as=links` | The thing's whole link set, paged. Its `count` is how many links there are. Always the last link of the read that carries it. Unpaired | [shipped: tinypeek#2] |
| `next` (IANA) | a page of `?as=links` → the page after | The last link of every page but the last | [shipped: tinypeek#2] |
| `help` (IANA) | the root → an orientation document | What to read first on this box (§4). Unpaired: a document does not know it was recommended | [shipped: TM-12] |

Rules:

- Links are typed, never free text. A client ignores rels it doesn't know.
- Inverse pairs are both emitted, and a cross-version `alternate` is answered by one back. `tm:read-by` is the one bounded exception: a page on another site or in another locale is answered by the one link that stands for its route.
- `confidence` is mandatory on `tm:` rels and omitted on IANA rels. `type` is optional on any rel and is the target's media type (§14).
- `href` is always a complete `tm://` URI. It may end in a fragment, which names a place inside the thing and is not part of its identity; the server reads the URI and ignores the fragment [shipped: TM-16]. Until v0.17 an entity's `tm:data` carried its JSON pointer that way, so the pointer said where to look and did not fetch it. It is now a facet, `?pointer=`, which reads the piece (§6); the server emits no fragment any more, and the rule stays for clients, which must still drop one when comparing identities [shipped: tinypeek#16].
- A collection is a URI whose path ends in `/`, whatever query follows it: `git/<repo>/?at=<commit>` is a tree, and a client wanting metadata reads it as it is, not with `?as=stat` added (TM-11 refuses that).
- **Fan-out is bounded.** One link per route on the canonical site and locale; dynamic routes collapse to their collection (a dynamic route whose pages share only the root is named page by page, since the root is the front page too); other sites and locales are reached through `alternate`, which is why those links are never capped (TM-20). `autopsy.json` carries 5 `tm:read-by` [shipped: TM-18]. A record most routes read still carries one a route (`projects.json`: 33). What is left after that is bounded by paging, below.
- **Links come in one order.** On every mount: the IANA relations first (they are how a client moves), then `exact`, then `inferred`, then `low`; within each by `rel`, then by `href`. The order is stated so that a page of a large set is the same page on the next read. A body may keep an order of its own where one matters (the root's `start_here` is a reading order). [shipped: tinypeek#2]
- **No read carries more than 100 links.** A set over the cap is cut to its first 99 in that order, and the read's last link is `tm:links` to `<uri>?as=links`, so nothing becomes unreachable. `?as=links` returns the whole set and no content, 99 a page, each page but the last ending in `next`; its body says `total`. Walking it yields every link exactly once. A git `at=` stays on the way there, since a ref is part of what the thing is; no other facet does. **The set can be narrowed, and the narrowed set is an address** [shipped: tinypeek#17]: `rel=` keeps one rel, `min=` keeps a link whose `count` is at least it (a link with no `count` stands for one thing and counts as 1), and the two combine. So `entity/pattern/pad-poll?as=links&rel=tm:found-in&min=2` is the games a pattern is found in at least twice, which was the lens's own example of a set with no address (`docs/lens.md`, idea 3). The echo and the body carry the filter, `total` is the narrowed set's, it pages like the whole, and an empty result is a set with `total` 0, not a refusal. Its version is its thing's: a client that wants to know whether the set changed reads the thing's `?as=stat` again, as §4 settled. That is the whole of the query language, on purpose: one rel, one lower bound on the one number a link carries. What is not here, and would reopen it: a second dimension (a filter on `title`, on `confidence`, on `href`), a set across more than one thing (a join, a walk), and a saved walk, which is a thing written down somewhere, and so a file in a repository read like any other (a trail, next).

**A trail** is the memex's named, ordered list of addresses, and it is no grammar change [shipped: tinypeek#18]. It is a file: JSON, `{title, note, steps: [{uri, note}]}`, written by whoever commits it, read through `fs` as itself, with its history in `git` like any file. What makes it a trail is what the server adds: a `tm:step` link to each step as the file writes it (so a step can be a piece of a thing, `?lines=`, a quote kept with its address), and on every step, on whichever mount it lives, a `tm:step-of` link back to each trail it is on. The order is the file's, and the titles say the position for a person; the links themselves come in the namespace's one order, as every link does. A server says where it reads trails from, and that is the one thing particular to it: on `tinymachines` it is `fs/notes/trails/`, whose listing is the list of trails, and the first trail there is the brief's three documents. A file there that is not of that shape is a file and nothing more; a step that is not a `tm://` URI stays in the body and gets no link; a step that names nothing still gets its link, and the crawler fails the deploy on it, which is how a trail that has gone stale is found. The copy in `git` is the file's history, not a second trail, so each step links back to one address. Not covered: a trail written through the protocol (it is read-only), a trail of trails (it works, since a trail is a file, and is not special), and a step's position carried on the link as a number rather than in its title. The set is the thing's own links: its `?as=stat` also points back at it with an `alternate`, which is the stat's link and is not counted or paged. Because the set is taken from the stat, a file over the byte cap and a page that would have to be fetched whole still give up their links. The rule is the namespace's and not any mount's. On `tinymachines` five things are over the cap today: the route file that renders every notebook page (349 links), three patterns (`sprite-writer` 309, `bank-switch` 200, `position-compare` 116) and the route file of the lessons (105). v0.5 called `sprite-writer` the largest set on the server; the crawler, once it counted, found the notebook's route file larger. [shipped: tinypeek#2]

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
| Token exposure | Bearer token in the `Authorization` header, never in the URI. OAuth 2.1 when a second client appears. [planned, not scheduled: tinypeek#5]. The live server is anonymous; everything it serves is already public. See below. **A token the box holds for a server behind the mcp mount** is the box's and not a client's: it comes from the service's environment, is named and never written in the file that names the server, goes in a header to that server only, and appears in no URI, body, listing or refusal; the server's record says only whether one is held (§13) [shipped: tinypeek#22] |
| Open proxy | The http mount fetches from loopback only. The mcp mount connects only to the servers named in a file of the checkout (§13), never to one a client names, and calls a tool only where that server's map names it, with the path's arguments and nothing a client composes beyond them (13.1). |
| Host detail in an answer | No refusal carries a path, an address or a name of the host. Structured refusals are written from the URI the client sent; an unexpected failure answers `internal` with its kind only (§7) [shipped: tinypeek#7] |
| Request abuse | `complete` capped at 100; `list` pages at most 500; git calls time out after 15 s [shipped]. No recursive `list` on `fs` or `http`. On `git` a tree lists to at most 8 levels, 500 entries a page, from one git call under the same timeout: a walk of an object store that is already bounded, where a walk of the disk is not, which is why `fs` has none. Every tracked file under the `fs` roots is in `git/public/` and reads to depth there [shipped: tinypeek#4]. **A rate limit by caller.** Every other control bounds one request; this one bounds how many. Each caller has a bucket: a burst of 240 units, earned back at 4 a second. A read costs 1 unit, a page on `http` 5 (the server fetches it through the front door) and a read on `git` 2 (a process). `initialize`, `ping`, notifications and the two listings of tools and templates are free, so a limited client can still connect and learn the grammar. A batch is counted message by message. It is held in the transport, before anything is parsed or read, and so covers both doors, `resources/read` and the `resolve` tool. A caller is the address the front door accepted the connection from, which a client's own headers cannot change. The address is a key in a table in memory and nothing more: not logged, not stored, not returned, forgotten on restart, and the table keeps at most 10,000 callers, the longest idle dropped first. The box reading itself in-process (the deploy's crawl) is not a caller. Callers on the box that reach the port directly share one bucket; they are not exempted, since an exemption is a limit anything on the box can step around. The limit is per server process, which on `tinymachines` is one [shipped: tinypeek#6]. A per-token limit [planned: there is no token yet; a token id takes the address's place as the key] |
| Audit | **One record for every request that has an answer**, written in the transport so both doors are covered: the time, the method, the tool and the URI where there is one, how it ended (`ok`, or the refusal's reason, `rate-limited` included), the bytes sent back, the milliseconds taken, and a token id, which is null until there are tokens. **It records what was read and not who read it:** no address and no hash of one. The address is the only identity there is today and it is personal data; a token id will be who asked. **It is never served.** It is written outside the checkout, and a location under the checkout is refused outright instead of being trusted to sit outside the served roots; where it goes is configuration and is in neither repository. **It is bounded twice:** one file a day and thirty days kept, and in bytes, 8 MiB a day and 64 MiB in all with the oldest days going first, because a log bounded only by days can fill the disk it shares with the service's own state. Records past a day's cap are counted and the next day's file opens by saying how many. A URI is recorded cut to 300 characters with its real length beside it, so a record stays a few hundred bytes and a long URI is not a cheap way to spend a day's room [shipped: tinypeek#7]. What is left is plain volume: a caller inside the rate limit can still fill a day's 8 MiB, after which that day's records are counted and not kept. A record that cannot be written is counted and never fails the read. The box reading itself in-process (the deploy's crawl) leaves none [shipped: tinypeek#7] |

**Data licensing travels with the data.** Code is MIT. visual6502-derived die data is CC BY-NC-SA 3.0, and NonCommercial + ShareAlike carry through to the netlist, measured tables, API responses and cartridges. `halfphi` embeds no die data. The autopsy publishes shape only — addresses, counts, labels — and no ROM bytes. The `licensing` tool states this at runtime.

**Tokens stay planned, and why (tinypeek#5).** The owner decided this on 2026-10-11. A token is what would let a server serve something that is not public, and `tinymachines` has nothing of the kind to serve: three allowlisted directories, repositories that are public elsewhere, and pages anyone can load. Its rule is the other way round, that anything mounted is published. A token check built now would guard nothing, and a control that guards nothing cannot be shown to work. So the live server reads no `Authorization` header: a token sent to it today is ignored, changes no answer and is not recorded.

What a build must keep, decided now so it is not argued later:

- **A token adds access and takes none away.** Everything a server serves without a token stays readable without one. A token opens what is not public and nothing else, so no client that works today stops working.
- **In the header, never in a URI.** A URI is logged, linked and quoted in refusals; a token must be none of those. A token that arrives in a URI is refused and not echoed.
- **Checked in the transport, before any mount is asked,** and kept hashed, outside the checkout, where the namespace cannot serve it.
- **A missing or wrong token is a structured refusal** for the thing it would have opened, and says no more about that thing than that it needs a token.
- **The token's id, never its value, is who asked.** The rate limit keys its bucket by it and the request log records it; both have the place ready and hold nothing there today.

What would schedule it: a mount that is not public, or a second client that needs its own allowance. Neither exists.

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

**What reads.** Each entity reads as `application/vnd.tm.<kind>+json`, its kind in its type since v0.23 (§14): `entity` (its kind), `key`, the record's own fields, and its links. `?as=stat` gives `{entity, key, name, mimeType, size}` with the same links, and `at` and `commit` at a time; `?as=set&rel=<rel>` reads the things behind one of its rels inlined, a page at a time (§6, §14); no other facet is offered, and `at=` reads it as its records had it (§6). `entity/{kind}/` lists the keys with a `title` each (a game's name, a lesson's title, how often a pattern was found). A game is an entity and has things under it, so `entity/game/` lists both `{key}` and `{key}/`, and `entity/game/{key}/routine/` lists that game's routines.

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
| any entity | `tm:data` | the JSON record with `?pointer=` to this entity's place in it, which reads that piece (until v0.17 the pointer was a fragment) | exact |

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

## 12. Settled questions, conformance and v2

- **Multi-host.** Settled (tinypeek#10): a server answers for a set of hosts and one is enough (§5). What stays open is federation between servers, which waits for a second box.
- **One time axis.** Settled (tinypeek#15): `at=` is a ref or a time, with one meaning on every mount that has a past (§6). The entity mount took it in v0.21 (tinypeek#21), from its records' past.
- **Hosts that are not machines.** Settled (tinypeek#19): the grammar takes them as a mount of a host that answers, or as a host of its own (§5), and nothing is built until there is one. The first device or bench with readable state schedules it, and its coming as a host of its own schedules federation (tinypeek#10) and, if it is not public, tokens (tinypeek#5).
- **A trail.** Settled (tinypeek#18): a trail is a file in a repository, read as itself, and the server adds the links to each step and from each step back (§9). No new mount, no new facet, no write path. What would reopen it: a trail that must be written through the protocol, or a client that needs the order on the links and not in the file.
- **An address for a set.** Settled (tinypeek#17): a set is a thing's links narrowed, by `rel=` and `min=` on `?as=links`, and it is an address because the echo carries the filter (§9). No new mount and no query language: a second dimension, a set across things, or a saved walk that cannot be a file would reopen it.
- **A readable piece.** Settled (tinypeek#16): a span is a facet, not a fragment, and there are three of them, `range`, `lines` and `pointer`, one a read (§6). The entity mount's `tm:data` reads the piece. What would reopen it: a span of another shape, say a heading of a page, which a client building a quote might want more than a line count.
- **Subscriptions.** Settled (tinypeek#11): none, and a client reads `?as=stat` again (§4). A real need to know within seconds, or tokens, would reopen it.
- **An MCP server as a mount.** Built (tinypeek#22, §13): a server named in a file of the checkout is a mount of this host, and the box keeps the connection. That was decision A of the v0.22 handoff (`docs/tm-v0_22-handoff.md`, 2026-10-22): one host, since a server becomes a host of its own only through federation (tinypeek#10), and a host alias can carry these addresses across when one does. Decision C there: a free-text search stays a tool, since its answer changes with the index and `at=` could not hold it; a saved search is a trail.
- **Kinds and media types.** Settled (tinypeek#23, §14): the server says what a thing is in its media type and lists the kinds it has served at `kinds/`, measured; a link may say its target's type; a set and its members are one read on the entity mount. No schema per kind and no renderer yet, each with what schedules it in §14. What would reopen it: a set across mounts, or a client that needs the kind of a thing no address settles without reading its stat.
- **CI conformance.** [shipped: TM-15] A link-integrity crawler runs at the end of every `tinymachines` deploy, after the beta follows: every `href` resolves, no `up` names itself, every `tm:` pair has its inverse (§9's bounded exception included), every listed child resolves with the claimed mimeType. About 3,300 URIs a run with the mcp mount (3,200 with the entity mount, 2,300 before it); the mcp addresses are read live from the servers, so a server that is down at deploy time reads as `unreachable` and lists nothing, which the crawl passes and the record shows. It holds the five entity pairs to the same confidence and the same `count` at both ends. It fails a read over the link cap, and walks `?as=links` wherever a read points there (every link once, as many as it said), so an inverse on a later page still counts [shipped: tinypeek#2]. And a run whose budget ends with URIs still queued fails instead of passing on what it reached [shipped: TM-16]. It holds the mcp mount's pair and reads every `tm:schema` piece; broken on purpose on 2026-10-22, it failed on 96 problems [shipped: tinypeek#22]. It fails a read whose type is bare `application/json` or names a kind the vocabulary does not know, follows every link that carries its target's `type` and holds the target to it (52,231 links a run, and a run that followed none fails), and reads the registry last: every kind the walk was served is listed and each reads with a count. With a stat link's type, a listing's type and the registry's count broken on purpose on 2026-10-22, it failed on 6,634 problems [shipped: tinypeek#23]. It walks what a server's map makes addressable, sampling each mapped collection at three children a run so the deploy's check reads each mapped shape without reading a whole dex, counts the mapped reads, and fails a run that made none while a map is derived; the kinds a map names are in the vocabulary it checks against. With a map naming a tool the server does not list, the three sampled things under it failed to resolve, and with the roots gone from the server's record it failed for having made no mapped read [shipped: tinyhelper#6].

v2, deliberately excluded:

- **Proposals.** A tool that takes a URI the client wishes existed plus a description, stages a scaffold as a branch or diff, and returns a review URI. Nothing lands without owner approval.
- **Elicitation** when a proposal is ambiguous.
- **Write verbs.** None planned; mutation stays behind proposals.

---

## 13. Layer 5: the mcp mount [shipped: tinypeek#22]

The second application on the platform, and the first that reads something no disk on the box holds: another MCP server. Its claim is that an MCP server becomes part of a host by being named, with no code written for it. The box keeps the connection; a client only ever sees addresses. This is the first of the four additions in the v0.22 handoff (`docs/tm-v0_22-handoff.md`); the other three are §14 to §16, each marked with the issue that builds it.

A server is named in a file of the checkout (`api/mcp_servers.json` on `tinymachines`): its endpoint, its transport (streamable HTTP, or the older SSE transport with its endpoint event), one line saying what it is, and, where the server wants a token, the name of the variable in the service's environment that holds the `Authorization` header's value. The file holds no token. On `tinymachines` three servers are named: `terrapulse` (measured climate and geophysical data, one indexed list per phenomenon), `resume` (the owner's resume as read-only tools) and `campaignbrain` (a service catalog, behind a token). The grammar gains one template and no new shape:

```
tm://{host}/mcp/{server}{/path*}{?as,range,lines,pointer,rel,min,cursor}
```

**What a server exposes with no map**, which is what MCP itself lists:

| Address | What it reads |
|---|---|
| `mcp/` | the servers the box reads, each with its one line |
| `mcp/<server>/` | the server: its record and its collections in one read. The record says what the server is, how it is reached, whether a token is involved (`none`, `held by this box`, or `named, not held by this box`), its measured `status` (`up`, `gated` or `unreachable`) and when it was `checked`; when it is up, what it said at `initialize` (`serverInfo`, `protocolVersion`, `capabilities`, `instructions`) and `counts` of what it lists. Its children are `tools/`, `resources/` and `prompts/`, each only where the server declared the capability, then `map` and the map's roots where a map is derived (13.1); `map` in the body is the map's address or null, and `counts.reads` is how many paths the map names |
| `mcp/<server>/tools/` | its tools as `tools/list` answered, each child claiming `application/vnd.tm.tool+json` |
| `mcp/<server>/tools/<name>` | one tool as the server described it (`name`, `title`, `description`, `inputSchema`, `outputSchema`, `annotations`), with its own address and its server's. `?as=stat` is its metadata; `?pointer=`, `?lines=` and `?range=` read a piece of it |
| `mcp/<server>/resources/`, `resources/<name>` | its resources and resource templates as described, `application/vnd.tm.resource+json`; the listing's body also carries the templates whole, and a template's `resource` is its `uriTemplate`. The content behind a resource is not read here; that is the map's job (13.1) |
| `mcp/<server>/prompts/`, `prompts/<name>` | its prompts as described, `application/vnd.tm.prompt+json` |
| `mcp/<server>/map` | the server's map (13.1), `application/vnd.tm.map+json`: which of its tools read as addresses, each entry with its confidence, what the driver could not decide, and the two files it is read from. Listed as a child of the server where a map is derived [shipped: tinyhelper#6] |
| `mcp/<server>/<path the map names>` | the server's data, read by the tool the map names (13.1); a collection where the path ends in a slash, listing its items as addresses and taking the query its entry lists, a thing otherwise, typed by the kind the map gives it. The roots a map names with no argument (`dex/`, say) are children of the server [shipped: tinyhelper#6] |

A trailing slash keeps its one meaning. `mcp/<server>/` is a collection whose body is also the record, the way a site's root is its front page too (§8), and since v0.23 it reads as `application/vnd.tm.server+json`, so a client knows it holds a record and not only children; `mcp/<server>` without the slash is `not-found` and names it. These were the first reads to carry a vendor media type, and a `+json` type is JSON to every rule here (`pointer=` reads into it); since v0.23 every read carries one (§14).

**Links.** A tool, a resource or a prompt carries `up`, `collection` and `describedby` like any leaf, and `tm:served-by` to its server, which carries `tm:serves` back, one a tool (§9). A tool carries `tm:schema` to `?pointer=/inputSchema` and, where the server published one, to `?pointer=/outputSchema`: its schemas as pieces of its own record, so a schema is an address and reads. The crawler holds the pair and reads every piece.

**Measured, not asserted.** The record's `status` is what happened when the box asked, with the time. A collection exists only for a capability the server declared, and a declared collection that lists nothing is there and empty (`terrapulse` declares resources and prompts and lists none, so both read as empty listings). A server that did not answer as an MCP server does reads as `unreachable`, with the kind of failure and nothing more, lists no children, and its collections and things refuse `unreachable` naming the record (§7). A server that wants a token the box did not give reads as `gated` with the status it answered, the same way. What a server listed is kept five minutes and then asked for again; a failure stands one minute, so a walk of a server's tools asks it once and a server that comes back is seen within a minute. A read on the mount costs two units, as a git read does (§10).

**The token is the box's.** It comes from the service's environment, under the name the file gives; it goes in a header to that server's endpoint and nowhere else; it appears in no URI, body, listing or refusal, and the record says only whether one is held. These are not the tokens of §10 (tinypeek#5), which would be for a client reading this server, and which stay planned. A reader reads what the box may read, and the rule that anything mounted is published holds: a server the box is given a token for is one whose answers the owner meant to publish.

**No past.** `at=` is refused, saying the server is read as it answers now (§6). A client that wants to know whether a server changed reads its record again (§4), and `checked` says when the box last asked.

**Not covered, and where it goes:**

- A tool is called only where a map names it (13.1), so v0.21's read-only rule holds without reading a tool's description to guess: the map is the one place a tool becomes a read, and it is derived from the server's schemas and corrected by a person. A tool no map names is listed, described and never called. The content behind a resource is not read yet: a map names tools, and the first server whose data is behind resources rather than tools (the catalog's `cb://` resources) will say whether a map entry names a resource the same way.
- A free-text search stays a tool (the handoff's decision C): its answer changes with the index, so `at=` could not hold it, and a saved search is a trail (§9).
- A server is a mount of this host (decision A). One with readable state of its own that should be a host of its own waits for federation (tinypeek#10, §5).
- Nothing here is checked from outside until the next deploy of `public`; the version history says when it went live.

### 13.1 Shape discovery: the map [shipped: tinyhelper#6]

A map is what makes a server's data addressable: `dex/{kind}/{slot_id}` reading `get_slot` with those two arguments, say. It is derived, not written. Every server here publishes its shapes already, as JSON Schema in `tools/list` and as OpenAPI from the same models, and an index driver in tinyhelper reads those and derives the map by five rules: a model with a title is a kind and names the media type; a tool whose inputs are identifiers and filters and whose output is an object or a list is a read, and a tool with a body argument or a side-effect verb in its name stays a tool; a read's required inputs are its path segments in schema order and its optional ones its query; a field that names another kind's key is a typed link; provenance fields are recognised by name and carried into `_meta` untouched. What the rules could not decide is listed in the map by tool, one sentence each, so a person sees what to correct.

**Two files, one map.** The derived map is `notes/maps/<server>.json` on the serving box (the handoff's decision B: one place, one owner, served and versioned through the namespace), written by the index driver and by nothing else; the override is `notes/maps/<server>.override.json` beside it, the one hand-written thing, with the entries it corrects and a null for one it removes. The mount merges the two and serves the result at `mcp/<server>/map`: every entry from the derived file reads `confidence: inferred` and every entry from the override `exact`, in the three words §9 has, so a lens shows which addresses were guessed without a fourth word. The map carries `tm:data` to both files, which answer `tm:read-by`, and a map's history is its files' (`fs/notes/maps/<server>.json?as=log`). A changed file is seen on the next read, with no restart. A server with no derived file has no map and reads as §13 says; an override alone corrects nothing.

**An entry.** A key is a path of segments, each a name or one `{argument}`, with a trailing slash for a collection; the mount's own paths (`tools/`, `resources/`, `prompts/`, `map`) may not be claimed, and an entry that does not parse is dropped and said in the map's `ignored`, never guessed at. An entry names its `tool`, and may name its `kind` (the media type of the answer, with the path's arguments substituted, which is how a subkind rides as a parameter: `vnd.tm.slot+json; kind={kind}`; `from-result` means the server's own type; none means a record), a collection's `query` (the names it takes as its own, `*` passing any other through), which field holds a collection's `items` and which item field is the `key` that fills the address one segment deeper, `links` to fill from the arguments and the body's fields, and a field of `edges` to lift.

**A read.** A path the map names reads by calling the entry's tool with the path's segments as arguments, each coerced by the tool's input schema (an integer argument spelled otherwise is refused before the server is asked), and on a collection with the query the entry lists; the mount's own parameters (§6) are never passed through and keep their meaning, and `at=` is refused as on the rest of the mount. The answer is `structuredContent` where the server gave it, else its first content, parsed when it is JSON; an embedded resource's bytes come back as bytes with the server's type; `isError` is `not-found` with the server's words and the collection above as `nearest`. A thing carries `up` and `collection` to the collection above where the map names one (else `up` to the server), `describedby` to its stat, `tm:read-with` to the tool, the entry's `links` filled, and one `related` link for each edge, typed by the entry's own kind; its `_meta` carries `tinymachines.ai/map` (the map, the entry, the tool, the confidence) and `tinymachines.ai/provenance` (the body's `sources`, `licence_basis`, `source`, `citation` and `checked_at`, untouched) beside the links. A collection lists its items at the address one segment deeper, a collection before a thing where the map names both (`dex/` lists `dex/earthquake/`, which carries `describedby` to `dex/earthquake`), each child claiming its type, the tool's whole answer kept in `result` and its `total` surfaced, pages the children as every listing does, and echoes the query it was asked with. One answer is kept five minutes, so a thing and its stat cost the server one call. A gated or silent server refuses a mapped read with the same word its record says.

**What a map says about kinds.** A kind a map names is in the vocabulary while the map is (§14): `kinds/<kind>` says which map names it and which tool reads it, and `describedby` points at the schema the server published for it, as a piece of the tool, never a copy. A link to a mapped address carries its type from the map alone, since the address and the map settle it; a `from-result` address carries none.

**Not covered, and where it goes:**

- A map names tools. The content behind a resource waits for the first server whose data is behind resources (§13).
- An entry's `kind` is what the driver inferred from a schema's title; the registry counts what was served under it and says nothing about whether the body fits. A client that validates a body schedules a schema check (§14).
- The crawler samples each mapped collection at three children (§12). A whole dex is the server's to list, not the check's to read.
- The derived maps for the three servers named on `tinymachines` are tinyhelper's to write (tinyhelper#6); the version history says which landed and what was read through them.

### How the test went

| Layer | What the mount asked of it | Verdict |
|---|---|---|
| 1 Transport | Nothing. The cost table gained one line (a read on `mcp` costs 2) | Done |
| 2 Addressing | Nothing. One template, the same shape as the five before it | Done |
| 3 Resolver | Two refusals were named, `gated` and a wider `unreachable`, and one rule was widened: a `+json` vendor type is JSON, so `pointer=` reads into it. The rule is the namespace's, not the mount's | Done; the widening is what §14 needs anyway |
| 4 Link vocabulary | Two table rows, `tm:served-by` / `tm:serves` and the unpaired `tm:schema` | Done |
| 5 Application | One class and a file of servers, with two transports in it | Built |

One finding. Every mount before this one read a disk or loopback, and the namespace never had to say whether a thing was reachable; the `overview` tool measured reachability and the namespace asserted it. The mcp mount is the first where a read can fail for a reason that is nobody's fault here, so a measured `status` with a time entered the namespace, and the refusals name the record that carries it. §14's kind registry is measured the same way.

---

## 14. Kinds and media types [shipped: tinypeek#23]

The server says what a thing is, in the media type, and publishes the list of kinds it has served; a client never infers a kind from a path or a body's shape, and a client that has to is logging a bend. This is the second of the four additions in the v0.22 handoff (`docs/tm-v0_22-handoff.md`, its §14).

**The rule.** Every read's `mimeType` is one of three things. A thing the server composes is `application/vnd.tm.<kind>+json`, or `text/vnd.tm.<kind>` when it is a text; the `+json` suffix keeps every generic client parsing, and the vendor part is the kind. A file the server merely holds keeps the file's own type (`text/markdown`, `image/png`), with one exception: a JSON file reads as `application/vnd.tm.record+json`, a record, since what a client does with it is read it as data. Nothing reads as bare `application/json`, and the crawler fails a read that does. A piece of a thing (`?lines=`, `?pointer=`, `?range=`) reads as the thing's type, as §6 has it. A stat's own type is `stat`, and its body's `mimeType` is the type of the thing it describes, so a listing's claim for a child and the child's stat say one thing, which the crawler has held since TM-15.

**The kinds on `tinymachines`.** The table is the vocabulary the server can say; the registry below says what it has said.

| Kind | Media type | What reads as it | Status |
|---|---|---|---|
| `listing` | `application/vnd.tm.listing+json` | every collection, a page at a time; the hosts (`tm://`) and the root too; a git tree at any depth | [shipped: tinypeek#23] |
| a file | the file's own type | a file on `fs` or `git`, and anything through `http` that is not a page (`robots.txt`); the registry counts these as `file`, by type | [shipped] |
| `record` | `application/vnd.tm.record+json` | a JSON file the server did not compose, on `fs`, on `git` or through `http` | [shipped: tinypeek#23] |
| `trail` | `application/vnd.tm.trail+json` | a JSON file under `notes/trails/` of the shape §9 gives; one there of another shape is a record, and the copy in git is a record | [shipped: tinypeek#23] |
| `page` | `text/vnd.tm.page` | a page's readable text, which is `?as=text` and the default on http; `?as=rendered` is `text/html`, the thing itself | [shipped: tinypeek#23] |
| `stat`, `links`, `log`, `submodule` | `application/vnd.tm.<kind>+json` | the facets of those names, and a submodule's record | [shipped: tinypeek#23] |
| `blame` | `text/vnd.tm.blame` | `?as=blame` | [shipped: tinypeek#23] |
| `offbox` | `application/vnd.tm.offbox+json` | a place a build chain leaves the box (§8) | [shipped: tinypeek#23] |
| `pattern`, `game`, `routine`, `lesson` | `application/vnd.tm.<kind>+json` | the entity mount's things (§11) | [shipped: tinypeek#23] |
| `server`, `tool`, `resource`, `prompt` | `application/vnd.tm.<kind>+json` | the mcp mount's things (§13); the server's record reads as `server` since v0.23 | [shipped: tinypeek#22, tinypeek#23] |
| `set` | `application/vnd.tm.set+json` | `?as=set` on the entity mount (§6): a set and its members in one read, the bend the lens had left standing (`docs/lens.md`, idea 4) | [shipped: tinypeek#23] |
| `kind` | `application/vnd.tm.kind+json` | one entry of the registry below | [shipped: tinypeek#23] |
| `finding` | `application/vnd.tm.finding+json` | a helper's answer, always `confidence: generated` (§16); the helper's host serves it, not this one | [planned: tinyhelper#9] |
| `map` | `application/vnd.tm.map+json` | a server's map (13.1) | [shipped: tinyhelper#6] |
| a kind a map names (`slot`, `node`, `dex-kind`, ...) | `application/vnd.tm.<kind>+json`, with a `kind=` parameter for a subkind (`application/vnd.tm.slot+json; kind=earthquake`) | what a map makes addressable (13.1). These are not in the vocabulary's own list: a map adds them while it is served, and `kinds/<kind>` points at the schema the server published | [shipped: tinyhelper#6] |
| `blocks`, `manifest` | `application/vnd.tm.<kind>+json` | `?as=blocks` and the manifest (§15) | [planned: tinylens#2] |
| `cartridge` | `application/vnd.tm.cartridge+json` | a minted cartridge (§16); today a lesson's cartridge is a tree in git and reads as a listing | [planned: tinyhelper#7] |

**The registry is an address, and it is measured.** `tm://<host>/kinds/` lists every kind the host has served since its record began, and `kinds/<kind>` reads one: its media types and how often each was served, when first and last, since when the record runs, the one line from the vocabulary, and the link relations such a thing carried here, each counted. A kind the host has never served is not listed, and reading it is `not-found` saying so, and whether the vocabulary knows the name, with the nearest kinds that were served; so the registry says what has happened, not what was meant, like a server's `status` (§13). It keeps no address: what was read is the request log's business, and that is not served (§10). On `tinymachines` the counts live in one file in the service's state directory, outside the checkout, and survive a restart; a server with nowhere to write counts from its start, and `since` says which. A new kind, type or relation is written at once and a count alone within a minute, so a restart loses at most a minute of counting. The grammar gains one template and no new shape:

```
tm://{host}/kinds/{kind}{?as,rel,min,cursor}
```

`?as=stat` and `?as=links` are the facets a kind offers; `at=` is refused, since the registry keeps no past (§6). Completions for `kind` are the kinds served, not the vocabulary.

**A link may carry its target's type.** `type` on a link is RFC 8288's target attribute, the media type the target reads as, so a lens can draw a card's shape before following it (§9). The namespace fills it in, in one place for every mount, wherever the address alone settles the kind: a facet (`?as=stat` is a stat, `?as=log` a log), a collection (a listing, or a server for `mcp/<server>/`), an entity's address, a page's address, a file's extension (`.md` is `text/markdown`, `.json` a record, a trail a trail), a submodule's path, a path a map names (13.1). Where the address does not settle it (a file with no known extension, a page that is not a page) the link carries no `type`, and a client that needs it reads the stat. The crawler follows every link that carries one and holds the target to it.

**Not covered, and where it goes:**

- No JSON schema for a kind this host composes. The handoff asks for one as a pointer address into the spec repository, so a schema has history too; none is written yet, and the registry does not point at what does not exist. A kind a map names is the exception since 13.1: its record points at the schema the server published, as a piece of the tool. The first client that validates a body schedules the rest.
- No renderer in a kind's record: that is the renderer registry of §15, tinylens#3.
- A subkind rides as a parameter of the type (`application/vnd.tm.slot+json; kind=earthquake`), which a map's entry gives it (13.1); the vocabulary reads the vendor part and counts each parameterised type on its own under the kind, so `kinds/slot` says how many of each subkind were served.
- A set is of one rel on one thing, or of one listing, and only on the entity mount, where every member is in memory already. A set across mounts would fan out to disks and the front door, so it waits for a reason; §12 says what reopens it.
- The lens's `kindOf()` can now become a lookup on `mimeType` (tinylens#2). Until it is, it infers as it did, and nothing here breaks it: every type it tested for is still a text or still JSON.
- Nothing here is checked from outside until the next deploy of `public`; the version history says when it went live.

### How the test went

| Layer | What the change asked of it | Verdict |
|---|---|---|
| 1 Transport | Nothing. A read on `kinds` costs one unit, the default | Done |
| 2 Addressing | One template, the same shape as the six before it | Done |
| 3 Resolver | One rule, in one place: every read's type is counted as it goes out, and every link is offered its target's type. Neither touched a mount | Done |
| 4 Link vocabulary | One field on the link, `type`, defined once in §9; no new rel | Done |
| 5 Application | Each mount names its own kinds in the types it emits; the registry is one class and one file | Built |

One finding. Making every read say its kind showed where the server had been quiet: a page's text and a blame were `text/plain`, a listing and an entity were `application/json`, and the lens told them apart by their paths. Each now says. The crawler's claim-against-read rule, which had held listings' children to their type since TM-15, holds every typed link too, and the first run found two claims the address had not earned: a page the build lists but the server cannot fetch is the resolution rule's finding, not the type rule's, so a target that does not resolve is left to that rule.

---

## 15. Panels [planned: tinylens#2, tinylens#3]

A panel is one address rendered by one module chosen by media type, and the standard is the four messages between a host page and a panel (`navigate`, `select`, `resize`, `ask`), the manifest that is the visual language as data, and the registry that says which module renders which kind. The box serves `tm://<host>/manifest` and `tm://<host>/renderers/` when they come, and `?as=blocks` renders a composition server-side for a host with no modules. The handoff's section 15 is the proposal; tinylens builds it after §14 ships.

---

## 16. Writes [planned: tinyhelper#7, tinyhelper#8]

The protocol gains no write verb. Agents write through helpers, and each kind declares what a helper may do to it and how the result is verified before it is served: a record is proposed as a branch and becomes a fact when an owner merges it, a finding is never a fact and is superseded rather than deleted, a tool is written by the crawler from the server, a cartridge is minted and re-run by the host that owns it. The handoff's section 16 is the proposal, with the five helper tools; tinyhelper builds it after 13.1.

---

## Version history

Newest last. A version that changed behaviour says when it went live; one that says "no behaviour changes" recorded a decision.

| Version | What it changed |
|---|---|
| v0.1 | 2026-10-06. The first draft, written before there was a server. |
| v0.2 | 2026-10-08. Brought the spec in line with the server that shipped on `tinymachines`, added the layer model and its "done" criteria, and marked every section with its conformance status. |
| v0.3 | Re-checks every marker (TM-13) against the running server after TM-4, 5, 7, 8, 9, 14 and 18 shipped, adds the `offbox` mount and the `tm:input` pair, and marks as planned the controls v0.2 had called shipped but the server does not have (tokens, rate limits, an audit log). |
| v0.4 | Adds what TM-11, TM-19 and TM-20 change: a collection refuses a file's facet instead of dropping it, a submodule reads as what it pins (`tm:pins`), a page links to itself in the other language and on the other site (`alternate`), and no refusal offers the address it refused. All three went live on 2026-10-10 after the deploy's crawl caught nine faults in the first attempt (a submodule record without its type, a crawler that read a tree at a ref as a file, a front page whose other language went unanswered); the spec records the fixed behaviour. |
| v0.5 | Adds the last two tickets of the work package: the root and the connect instructions name the box's orientation documents (TM-12), and the first application is built on the platform, the `entity` mount (TM-16), with ten relations of its own. §11 says what building it asked of the layers under it. Both went live on 2026-10-10 and were re-checked from outside on the live server, where the deploy's crawl read 3,189 URIs clean. |
| v0.6 | Takes up three of the findings §11 left open: a link may carry a `count` (tinypeek#3), and no read carries more than a hundred links, the rest being behind `?as=links` a page at a time, in one stated order (tinypeek#2). A lesson's record now keeps its game's key, so the lesson-to-game link is exact for all 25 (public#7). All three went live on 2026-10-10 and were re-checked from outside on the live server. |
| v0.7 | Closes the one read that had no byte cap: a page's text, which is also a page's default read, is held to the cap and reads in ranges past it (tinypeek#8). It went live on 2026-10-10 and its ranges were re-checked from outside; no live page's text is over the cap, so the refusal itself is held by the tests and not seen live. |
| v0.8 | Finishes the git `tree` facet: a tree reads to a stated depth in one read (tinypeek#4), and a listing at a ref names its children at that ref. It went live on 2026-10-10 and was re-checked from outside. |
| v0.9 | Adds the control that was missing over how many requests a caller makes: a rate limit by caller, in the transport (tinypeek#6). It went live on 2026-10-10 and was re-checked from outside by spending a bucket. |
| v0.10 | Adds the audit log (tinypeek#7): one record a request, with no address in it, bounded in days and in bytes, and never served. Testing it found a refusal that named where the checkout is on the host; no refusal may, and §7 and §10 now say so. Both went live on 2026-10-11 and were re-checked, from outside and against the log on the box. |
| v0.11 | Settles the first open question of §12: a build-emitted link manifest is not built for `tinymachines`, and §8 says why, with the counts, and what would reopen it (tinypeek#9). No behaviour changes. |
| v0.12 | Settles the second: a server answers for a set of hosts, a set of one is conformant, and `tm://` lists the set, which the spec had said since v0.1 and the server had refused (tinypeek#10). A host is a name and not a place to look, so a link never leaves the hosts its server answers for; how two servers would find each other is deferred until there is a second box. The listing went live on 2026-10-11 and was re-checked from outside. |
| v0.13 | Settles the last open question: there are no subscriptions, a client that wants to know whether a thing changed reads its `?as=stat` again, and §4 says what each mount gives it to compare, what that misses, and what would reopen it (tinypeek#11). No behaviour changes. |
| v0.14 | Records the owner's decision on tokens (tinypeek#5): they stay planned and unbuilt, because nothing the server serves needs one, and when they come they add access and take none away. §10 has the reasons and the rules a build must keep. No behaviour changes, and with it nothing in §12 is left open. |
| v0.14.1 | Editorial: this history moved out of the opening paragraph into a table, and §12 was renamed for what it now holds. No behaviour changes. |
| v0.15 | Closes the one place the namespace still dropped something quietly (tinypeek#13, found by the first walk of the live server for the lens): a parameter a mount does not take is refused, naming the ones it takes; the echo carries every parameter a read used; and the templates name every parameter, so a client learns a mount's grammar from the server. §5, §6 and §7 say so. A client that sent a harmless extra parameter now gets a refusal; none was known to. It went live on 2026-10-15 and was re-checked from outside: the two addresses the lens found are refused, a log echoes its `n`, and the templates list names every parameter. |
| v0.16 | Takes up the first of the lens's ideas (tinypeek#15): one time axis. `at=` is a ref or a time, with one meaning on every mount that has a past, and `fs` now takes it, reading a file as the repository behind it had it. A log entry says when its commit was made. A mount with no past refuses it and says where the past is; an entity at a time stays planned (tinypeek#21). §5, §6, §7 and §9 say so. It went live on 2026-10-15 and was re-checked from outside: a file on `fs` at a date gives the commit that date names, a time before the first commit is refused with that commit's time, a page refuses the parameter and names its route, and the `fs` template names `at`. |
| v0.17 | Takes up the second of the lens's ideas (tinypeek#16): a readable piece of a thing. `lines=` reads lines of a file or of a page's text and `pointer=` reads what a JSON pointer names in a JSON file, beside `range=`, one span a read, and the answer's `uri` keeps the span, so a quote keeps where it came from. The entity mount's `tm:data` carries its pointer as a facet instead of a fragment, so the link reads the piece and the crawler checks that it does. The templates name the two spans, and `?lines=` stops being the example of a refused parameter. §5, §6, §7, §9, §11 and §12 say so. It went live on 2026-10-16 and was re-checked from outside: lines of a file and of a page's text read with the span in the echo, a pointer reads a record's entry and a pointer past the end says how far it got, two spans in one read are refused, a pattern's `tm:data` carries `?pointer=`, and the three templates name the spans. |
| v0.18 | Takes up the third of the lens's ideas (tinypeek#17): an address for a set. The set behind `?as=links` can be narrowed by `rel=` and `min=`, the echo and the body carry the filter, and so a pattern's games filtered by count has an address, pages like the whole and is linkable. The two parameters ride with `?as=links` on every mount, are refused anywhere else, and the templates name them. The line is drawn in §9 and §12: one rel and one lower bound, no second dimension, no join, and a saved walk is a file in a repository. §5, §6, §9 and §12 say so. It went live on 2026-10-16 and was re-checked from outside: a pattern's games found at least twice read as one set with the filter in the echo and the body, a rel no link has is a set of none, the filter off `?as=links` is refused, the root's collections read as a set, and the templates name the two. |
| v0.19 | Takes up the fourth of the lens's ideas (tinypeek#18): a trail as an address, with no grammar change. A trail is a JSON file under a directory the server names (`fs/notes/trails/` on `tinymachines`), read as itself; the server links it to each step as written (`tm:step`) and every step, on any mount, back to the trails it is on (`tm:step-of`), and the crawler holds the pair. The first trail is the brief's three documents and a quote. §9 and §12 say so. It went live on 2026-10-16 and was re-checked from outside: the trail reads as its file with a step link to each of its four steps, each step on `git` and on `fs` links back naming its position, the quote and the file it is cut from are one identity and link back once, and the trails directory lists it. |
| v0.20 | Settles the last of the lens's ideas (tinypeek#19): a host need not be a machine. The grammar takes a device, a bench or a place either as a mount of a host that answers or as a host of its own, and the line between a mount, a host and an `offbox` node is a server (§5). No behaviour changes and nothing is built: the first such thing decides which way it comes, and with it whether federation and tokens are scheduled. With this, all five ideas in `docs/lens.md` are settled, four built (v0.16 to v0.19) and one decided. |
| v0.21 | Builds the one item left planned (tinypeek#21): an entity at a time. `at=` on the entity mount reads the two records as the repository had them at the commit a ref or a time names; every entity address in the answer carries the same `at=`, so the pairs between entities hold at that time, and `tm:data` reads the record then. A page and a cartridge have no past and are not named at a time. Every entity carries `version-history` to its record's log, and at a time `latest-version` to itself now. §5, §6, §9, §11 and §12 say so. With it, nothing in the spec is planned except tokens (§10), which wait on a reason. It went live on 2026-10-18 and was re-checked from outside: pad-poll at 2026-10-01 is found in 19 games and demonstrated by no lesson, and at 2026-10-10 by 23; every entity address in the answer carries the `at=` except `latest-version`, which names it now; `tm:data` reads the record at that time; the stat names the commit; and a time before the repository's first commit is refused. |
| v0.22 | Takes up the first of the v0.22 handoff's four additions (`docs/tm-v0_22-handoff.md`, tinypeek#22): the `mcp` mount, the second application on the platform and the first to reach off the box. An MCP server named in a file of the checkout is a mount of this host: its record with a measured status and the time it was checked, its tools, resources and prompts as things with addresses and vendor media types, `tm:served-by` and `tm:serves` between a tool and its server, and `tm:schema` to a tool's schema as a piece of itself. A server behind a token reads as `gated`, one that does not answer as `unreachable`, and a token comes from the service's environment and never leaves the box. Three servers are named, two of them open. §2, §5, §6, §7, §9, §10, §12 and §13 say so, and §14 to §16 are marked planned with the issues that build them. Built on 2026-10-22: the suite passed, and the crawler read 3,336 URIs clean against the checkout, 62 of them new, and failed on 96 problems when the pair was broken on purpose. It went live on 2026-10-22 and was re-checked from outside: TerraPulse read `up` with 11 tools and the resume `up` with 6, both checked at the time the record names; Campaign Brain read `gated`; a tool carried 6 links, among them `tm:served-by` to its server and `tm:schema` to its own input and output schema, and the server carried 11 `tm:serves` back; `at=` was refused naming the parameters the mount takes. |
| v0.24 | Takes up the mount's side of the v0.22 handoff's fourth addition (tinyhelper#6, §13.1): a server's map, read. The derived map and its override are two files under the box's `notes/maps/`, merged and served at `mcp/<server>/map` with each entry's confidence, `tm:data` to the files and `tm:read-by` back; a path the map names reads by calling the tool its entry names with the path's segments as arguments, coerced by the tool's schema, typed by the kind the entry gives it with a subkind as a parameter, `tm:read-with` the tool, the entry's links filled and its edges lifted to `related`, the server's provenance in `_meta` untouched; a mapped collection lists its items as addresses and takes the query its entry lists; a kind a map names joins the vocabulary with the schema the server published. §5, §9, §10, §12, §13 and §14 say so. Built on 2026-10-22: the suite passed (329 tests), and the crawler samples each mapped collection at three children, counts the mapped reads and fails a run that made none while a map is derived. The first derived maps are tinyhelper's; this row is amended with what was read through them when they land and go live. |
| v0.23 | Takes up the second addition of the v0.22 handoff (tinypeek#23): kinds and media types. Every read says what it is in its media type, `application/vnd.tm.<kind>+json` or `text/vnd.tm.<kind>` for what the server composes and a file's own type otherwise, a JSON file reading as a record; nothing reads as bare `application/json`. `tm://<host>/kinds/` is the registry of kinds, measured from what has been served and kept outside the checkout; a link may carry its target's `type`; and `?as=set` on the entity mount reads a set and its members in one, the bend the lens had left. §2, §5, §6, §9, §11, §12, §13 and §14 say so. Built on 2026-10-22: the suite passed (318 tests), and the crawler read 3,340 URIs clean against the checkout, followed 52,231 typed links, and failed on 6,634 problems when a stat link's type, a listing's type and the registry's count were broken on purpose. It went live on 2026-10-22 and was re-checked from outside: the root, a pattern, a page's text, a stat, a set, a server record and a kind each read as their type, every link on each carried its target's `type` (72 of 72 on pad-poll), `?as=set&rel=tm:instance` on pad-poll returned 25 of 25 members, `kinds/` listed what had been served since the service started with its counts, and `kinds/finding` was `not-found` naming the kinds that had. The deploy's crawl read 3,341 URIs clean and followed 52,239 typed links. |

---

Sources: [MCP specification](https://modelcontextprotocol.io/specification) · [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986) · [RFC 6570](https://www.rfc-editor.org/rfc/rfc6570) · [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288) · [RFC 6750](https://www.rfc-editor.org/rfc/rfc6750) · [IANA link relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml)
