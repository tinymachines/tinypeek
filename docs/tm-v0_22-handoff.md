# tm:// v0.22: the mcp mount, kinds, panels, writes

Handoff for the master node. 2026-10-21. Written with Bradley Isenbek from a conversation over tinypeek v0.21, tinylens (LensKit), tinyhelper, and the sampled MCP servers (TerraPulse, the CampaignBrain catalog, bradley.io/mcp).

Contents: 1. Why. 2. Routing: which agent gets what. 3. The proposal (spec sections 13 to 16). 4. Build order, one issue each, ready to paste. 5. The bradley.io issue (scene 4 rebuilt as the stack, the aerial line as the door). 6. Open questions for Bradley.

House rules apply to everything here and to everything built from it: no em dashes in shipped text; every number carries where it was read from; counted, not described; nothing autoplays; only helpers write.

---

## 1. Why

The wiki is a mount, not a platform. tm:// v0.21 already has the five axes a wiki needs and no wiki has: kind (mounts, entities), time (`?at=` on git, fs, entity), piece (`?lines=`, `?pointer=`, `?range=`), relation (26 typed rels with confidence) and path (trails). What it lacks is a way to grow past one subject, a name on every thing, a rendering contract any client can follow, and a disciplined write side. Four additions, numbered to follow the spec's section 12 (Proposals):

- **13, the `mcp` mount.** Any MCP server becomes a tm:// host by being named. The map that makes its data addressable is derived from the schemas the server already publishes (pydantic to JSON Schema to tools/list and OpenAPI), never hand-written. This is the second entity domain (tools) and the third, fourth and fifth subjects (earthquakes, FastAPI services, a resume) in one step, so the rest of the standard is shaped by more than the 6502.
- **14, kinds and media types.** The server says what a thing is, in the media type, so no client guesses. Today `kindOf()` in tinylens infers the kind from the path and the body's shape; that becomes a contract.
- **15, panels.** A panel is an address, a media type, bytes and links, rendered by a module registered for that media type. The contract between a host page and a panel is four messages. It is shaped to sit inside MCP's UI resource bridge, so every panel is also an MCP UI resource. tinylens is the browser for tm:// until browsers take a plugin.
- **16, writes.** Agents never write to the protocol. They write through helpers, and each kind declares what a helper may do to it and how it is verified. Four write kinds, five helper tools.

None of this is a new protocol beside MCP. The mount reads MCP servers; the panels fit MCP's UI frames; the helper tools are MCP tools. tm:// is the address book and the rendering contract that MCP leaves to the application. That is the killer app.

The one-line thesis, for the top of the site and the top of this work: **Let AI build. Let the humans watch the cities being built from the air.** The aerial view is LensKit; the first city to watch is Bradley's own fleet.

---

## 2. Routing: which agent gets what

Dependency order. Each row is one sentence to give a session; the issue texts are in section 4.

| Session | Direction | Reads | Hands back |
|---|---|---|---|
| **tinypeek** (spec, `tinymachines/public`, serves tm://) | Build issues 1 and 3: the `mcp` mount with no maps, then media types on every read and `tm://<host>/kinds/`. Sections 13, 14. | this file; `api/tm.py`, `api/mcp_server.py` | `tm://tinymachines/mcp/` answering for the three sampled servers; every read carrying a `vnd.tm.*` type |
| **tinyhelper** | Build issue 2: the index driver (13.1) deriving maps from `tools/list` and OpenAPI with override files; TerraPulse, the CB catalog, the resume as the three boards. Later issues 6 and 7. Sections 13.1, 16. | this file; the three servers' schemas | `mcp/<server>/map` with `confidence: inferred` for all three, plus the list of what the rules could not decide |
| **tinylens** | Build issues 4 and 5, only after issue 3 ships: the manifest as data, `?as=blocks`, the static blocks page as the second host, then the panel contract and renderer registry in LensKit. Section 15. | this file; `kit/handlers.js`, `kit/scene.js`, `src/compose.js` | a page with no LensKit that renders every kind without peeking; LensKit's three compositions as the first three registry entries |
| **BRADLEYIO** (server) | isenbek/bradley.io issues 12 (beta QA), 13 (`fleet-week.json`), and the new issue in section 5 (scene 4 as the stack, the aerial door). Later: `/mcp` as a panel over `tm://bradley/mcp/`. | the issues | the beta reorganized; the Monday brief leading with "Waiting on you" |
| **6502 / tinymachines.ai** | Nothing new now. When section 16 lands: expose the cartridge registry's mint-and-verify as the model for the cartridge kind. | | |

Two decisions block tinypeek's start and only Bradley can make them (section 6): host naming, and where map and override files live.

---

## 3. The proposal

### 13. The mcp mount

An MCP server becomes a tm:// host by being named in a map. The box that serves tm:// keeps the connection; the client only ever sees addresses. No code per server.

**Grammar.** One new template beside the five in v0.21:

```
tm://{host}/mcp/{server}{/path*}{?as,at,range,lines,pointer,rel,min,cursor}
```

**What a server exposes, always, with no map:**

| Address | What it reads | Media type |
|---|---|---|
| `mcp/terrapulse/` | the server: name, version, transport, auth, counts | `vnd.tm.server+json` |
| `mcp/terrapulse/tools/` | its tool list | listing |
| `mcp/terrapulse/tools/get_slot` | one tool: description, input schema, output schema | `vnd.tm.tool+json` |
| `mcp/terrapulse/resources/` | its resources and templates (CB's `cb://catalog` maps straight through) | listing |
| `mcp/terrapulse/prompts/` | its prompts | listing |
| `mcp/terrapulse/map` | the derived map (13.1), `confidence: inferred` | `vnd.tm.map+json` |

That alone is the tool kind, the second entity domain: every tool on every server in the fleet gets an address, a schema, and links (`tm:served-by` to its server, `tm:schema` to its input schema as a pointer address). bradley.io/mcp becomes a panel over `tm://bradley/mcp/` instead of a page probed at build time.

**The map** is what makes a server's data addressable. It is derived, not written (13.1). The derived map is served at `mcp/<server>/map` with `confidence: inferred`; a human override file under `fs/notes/maps/<server>.json` corrects only what the inference got wrong, entry by entry, with `confidence: exact`. Both have the same shape. This is TerraPulse's, as the inference would produce it:

```json
{
  "server": "terrapulse",
  "endpoint": "https://mcp.terrapulse.info/",
  "transport": "streamable-http",
  "reads": {
    "dex/":                     { "tool": "list_kinds" },
    "dex/{kind}":               { "tool": "describe_kind", "kind": "vnd.tm.dex-kind+json" },
    "dex/{kind}/":              { "tool": "search_slots", "query": ["offset", "limit", "sort", "*"] },
    "dex/{kind}/{slot_id}":     { "tool": "get_slot", "kind": "vnd.tm.slot+json", "links": { "describedby": "dex/{kind}" } },
    "graph/":                   { "tool": "graph_stats" },
    "graph/{id}":               { "tool": "graph_node", "kind": "vnd.tm.node+json", "edges": "links" },
    "lab/":                     { "tool": "lab_workspaces" },
    "lab/{ws}":                 { "tool": "lab_workspace" },
    "lab/{ws}/{folder}/{file}": { "tool": "lab_file", "kind": "from-result" }
  }
}
```

Rules the map follows:

1. A path segment in braces is a tool argument. A trailing slash is a collection and takes the listed query names; `*` passes any remaining query through as a filter. `search_slots` with `?mag=5` is `tm://.../dex/earthquake/?mag=5`.
2. Only tools under `reads` get addresses. Everything else stays a tool: listed, described, callable through the helper, never addressable. This keeps v0.21's read-only rule without reading a tool's description to guess.
3. `kind` names the media type of the answer (14). `from-result` means the server's own `mimeType` is used (a PDF from `lab_file` is a PDF).
4. `edges: links` lifts a result field into tm:// links, so a TerraPulse graph node's neighbours become `related` links with `confidence: listed` and the lens draws them without knowing TerraPulse.
5. `structuredContent` is the body when the server gives it; `content[0].text` otherwise. `isError: true` is a 404 with the message.
6. Provenance fields (`sources`, `licence_basis`) are carried into the read's `_meta` untouched, so a finding built on a slot keeps its citation.

**Worked through for the three sampled servers:**

| Server | Reads mapped | Stays tool-only | Note |
|---|---|---|---|
| TerraPulse (11 tools, streamable HTTP, no auth) | the 9 above | `get_slots` (batch) | no resources to map; the dex is already kind/slot/dossier; `spec.json` carries provenance |
| Campaign Brain catalog (6 tools, 7 resources, SSE, cbauth) | `cb://catalog`, `cb://services/{id}`, `cb://categories`, `cb://guide/{id}`, `cb://handbook/{id}` map through as resources; `get_service_detail` and `fetch_openapi_spec` become `services/{id}` and `services/{id}/openapi` | `search_services`, `find_endpoints`, `search_docs` (free text; a saved search is a trail, not an address) | the cbauth token is held by the box, never by a client; a 401 reads as `tm:gated` |
| Resume (6 tools, `bradley.io/api/resume/mcp`) | `roles/`, `roles/{year}`, `projects/`, `skills/`, `contact` | `search_experience` | the resume becomes a wiki subject with no new code |

The 35 CB services with an embedded `/mcp` need no map to be listed; each appears under `mcp/` with its tools the moment the catalog names it. Maps for the ones worth addressing come one at a time, by inference.

#### 13.1 Shape discovery: the map is built from the schemas the server already has

Boarding a server is naming its endpoint. Nobody writes a manifest, because every server here already publishes its shapes from pydantic models: `tools/list` carries JSON Schema for inputs and outputs, the REST services carry OpenAPI from the same models, TerraPulse's `spec.json` is the same again with provenance. The index driver in tinyhelper reads those and derives the map by five rules:

1. **A model is a kind.** An output schema with a `title` (`Slot`, `GraphNode`, `Service`) names the media type: `vnd.tm.slot+json`. The kind registry (14) points at the server's own schema by address, never a copy.
2. **A tool is a read when its inputs are identifiers and filters and its output is an object or a list.** An output with `total`, `offset` or `limit` beside an array is a collection; a single object is a record. A tool with a body argument, or a name or description with a side-effect verb (create, update, delete, send, mint, run), stays a tool.
3. **Path segments are the required inputs, in schema order.** `get_slot(kind, slot_id)` is `dex/{kind}/{slot_id}`; optional inputs become query parameters; a collection's filters are the search tool's optional inputs.
4. **Links come from identifier fields.** A field that names another kind's key (`kind` on a slot, an `id` list on a node, `service_id` on an endpoint) becomes a typed link: `describedby` to the kind, `related` to the node, `up` to the service. A field whose format is `uri` is a link as it stands.
5. **Provenance is recognised by name** (`sources`, `licence_basis`, `source`, `citation`, `checked_at`) and carried into `_meta` untouched.

What the rules cannot decide is served as `confidence: inferred` and shows in the lens in the inferred family, the word v0.21 already uses for guessed links, so a human sees at a glance which addresses were guessed. The override file fixes one entry at a time and is the only hand-written thing. A server that changes its schema changes its map on the next crawl, with the diff in the map's history (`?as=log`).

The same driver reads OpenAPI, so the 91 REST services board the same way without an MCP endpoint: an operation is a read by rule 2, and its path is its path.

### 14. Kinds and media types

The server names what a thing is, in the media type, and publishes the list of kinds. A client never infers a kind from a path or a body's shape; a client that has to is logging a bend.

**The rule.** Every read's `mimeType` is either a plain registered type (`text/markdown`, `image/png`, `application/pdf`) for a file the server merely holds, or a tm vendor type for a thing the server composes: `application/vnd.tm.<kind>+json` for structured things, `text/vnd.tm.<kind>` for text. The `+json` suffix keeps every generic client working; the vendor part is the kind. A parameter narrows it where a kind has subkinds: `application/vnd.tm.slot+json; kind=earthquake`.

**The kinds**, from what `kindOf()` in tinylens already distinguishes plus what 13 adds:

| Kind | Media type | Where it comes from |
|---|---|---|
| hosts, mounts, listing | `vnd.tm.listing+json` | any collection; `children[]` with a cursor |
| file | the file's own type | fs, git |
| record | `vnd.tm.record+json` | a JSON file the server did not compose |
| page | `text/vnd.tm.page` | http, as text; `?as=rendered` is `text/html` |
| log, stat, blame, tree | `vnd.tm.log+json` and so on | `?as=` facets |
| pattern, game, routine, lesson | `vnd.tm.pattern+json` and so on | entity |
| trail | `vnd.tm.trail+json` | fs/notes/trails |
| finding | `vnd.tm.finding+json` | a helper; always `confidence: generated` |
| server, tool, resource, prompt, map | `vnd.tm.server+json` and so on | 13, no map needed |
| dex-kind, slot, node | `vnd.tm.slot+json; kind=...` | 13 maps; the map names them |
| cartridge | `vnd.tm.cartridge+json` | the 6502 registry today; 16 generalises it |
| set | `vnd.tm.set+json` | a listing whose children are inlined (the one bend standing in tinylens) |
| blocks | `vnd.tm.blocks+json` | `?as=blocks` (15) |
| offbox | `vnd.tm.offbox+json` | offbox |

**The registry** is an address: `tm://<host>/kinds/` lists every kind the host serves, and `tm://<host>/kinds/slot` reads one: its media type, the JSON schema of its body (a pointer address into the spec repo or the server's own schema, so the schema has history too), the links it is expected to carry, and the renderer registered for it (15). A kind the host has never served is not listed, so the registry is measured, not asserted, like reachability.

**Links are not kinds.** A read's typed links stay as v0.21 has them. The one addition: a link may carry the target's media type (`type`, as RFC 8288 allows), so a lens can draw a card's shape before following it.

**What changes in code:** tinylens's `kindOf()` becomes a lookup on `mimeType`; `blocksFor()` keeps its switch keyed on the kind, not the path; `compose.js` moves server-side as `?as=blocks` and its three compositions are the first three entries in the renderer registry.

### 15. Panels

A panel is one address rendered by one module chosen by media type. The standard is the contract between the page that hosts panels and the panel, plus the registry that says which module renders which kind. LensKit becomes one host among several; the proof that the contract is real is a second host that is nothing like LensKit.

**What a panel receives** (one message, on load, and again on `?at=` or piece change):

```json
{
  "uri": "tm://terrapulse/mcp/terrapulse/dex/earthquake/us7000abcd",
  "mimeType": "application/vnd.tm.slot+json; kind=earthquake",
  "body": { },
  "links": [ { "rel": "describedby", "href": "...", "confidence": "exact" } ],
  "manifest": { "shapes": { "mcp": "hex" }, "families": { }, "handles": { "slot": ["history", "views"] } },
  "zoom": "beginner"
}
```

The manifest is the visual language from `kit/scene.js` as data: shape per mount, colour family per rel, handles per kind. It is served at `tm://<host>/manifest` so every host reads the same one and a change to it is a commit with history. `zoom` is the reader's level, so a panel can show one number or thirty tags without the host knowing which kind it is.

**What a panel may send**, and nothing else:

| Message | Meaning | The host does |
|---|---|---|
| `navigate(href)` | the reader followed a link | opens a panel for `href`, or moves the camera to it if open |
| `select(uri)` | the reader marked a piece (`?lines=`, `?pointer=`) | shows the piece address; offers ask, quote, trail-step |
| `resize(height)` | the content changed height | lays the panel out |
| `ask(uri, question)` | the reader asked about a piece | forwards to the helper (16); the finding arrives as a new link |

No `fetch`, no storage, no clock. A panel reads what it was given and draws it. The host owns the network, the camera and the reader's state. That is what makes a panel safe to embed in a page that is not yours, and what makes the standard small enough to keep.

**The renderer registry** is `tm://<host>/renderers/`: one entry per media type, pointing at a module (wasm or JS, by address, with its hash), the manifest version it was built against, and a fallback kind. A host with no renderer for `vnd.tm.slot+json` falls back to `vnd.tm.record+json`, then to `vnd.tm.listing+json` for any collection, then to a text dump. Every kind renders on day one; a better renderer is one registry entry. A lens that boots cold on a new host fetches the manifest and renderers from the host and ships none of them; LensKit's `kit/` must not quietly bundle its three compositions once the registry exists.

**`?as=blocks`.** For a host with no modules at all (a terminal, a print page, a voice agent), the server renders the composition itself: a read with `?as=blocks` answers `vnd.tm.blocks+json`, an ordered list of blocks from a closed vocabulary, every block carrying the address of what it came from:

`heading`, `note`, `kv`, `list`, `table`, `timeline`, `diff`, `code`, `media`, `question`, `finding`, `trail`, `link`.

This is `compose.js` moved to the server, and it is the second host: a static HTML page that renders blocks and nothing else. If that page shows every kind without peeking at a body, the contract holds. If it has to peek, that is a bend, logged where tinylens logs them.

**MCP fit.** MCP's UI extension hands a client a resource meant to be rendered in a sandboxed frame with a message bridge. The four messages above are a subset of what that bridge carries, so a tm:// panel wrapped as an MCP UI resource renders inside any MCP host that supports the extension. The wiki's pages show up inside the agent's own client.

**tinylens is the browser.** Until browsers take a plugin for tm://, tinylens is to tm:// what the Tor Browser is to onion addresses: a user agent that speaks the scheme, carries the renderers, and shows the city from above. The panel contract is what a browser plugin would implement later, so nothing in LensKit is lost when one exists. Two steps are open today: the kit already registers `web+<app>` protocol handlers, so `web+tm://` can route a tm:// address from any page into tinylens now; and a browser extension that does only the four messages over an iframe is small, since the renderers come from the registry and the extension holds none of them.

### 16. Writes

The rule from `docs/family.md` stands: only helpers write, and the protocol never gains a write verb. Section 16 adds the discipline on the helper side, so "agents CRUD the wiki" means one thing: each kind declares what a helper may do to it and how the result is verified before it is served.

**Four write kinds:**

| Kind | Create | Update | Delete | Verified by | History |
|---|---|---|---|---|---|
| record (a file in a mount) | a commit on a proposal branch (section 12) | same | retire: moved to the boneyard with a stone that says what it was | the owner merges; the link check passes | git, `?at=` |
| finding (generated) | a file under the helper's mount, `confidence: generated`, linked to what it is about | a new finding that supersedes (`latest-version`) | never deleted; superseded | nothing beyond its provenance; it is an answer, not a fact | version chain |
| tool (an MCP server's tool) | the crawler, from the server | the crawler, on change | the crawler, when the server drops it | the server answered `tools/list` | the catalog's log |
| cartridge (executable with a contract) | minted: verified by running on the owning host, then packed | re-minted | retired | the host re-runs it rather than trusting its verify block | the registry |

The cartridge kind is the 6502 registry generalised. A cartridge is a sealed unit with a contract; the host that owns the mount runs it; the output is a finding. "Lambda-style execution" is this and only this: nothing runs anywhere except on a host that minted it and can re-run it.

**Five helper tools**, all MCP tools on tinyhelper, all needing a token, all logged to the audit log the MCP server already keeps:

| Tool | Does | Returns |
|---|---|---|
| `ask(about, question)` | the one that exists today | a finding address |
| `propose(uri, body, why)` | stages a record at an address that should exist, as a branch | the proposal's address, `vnd.tm.proposal+json`, with its diff |
| `record(uri, body)` | updates a record the token owns, same path as propose | the new version's address |
| `retire(uri, stone)` | moves a record or cartridge to the boneyard | the stone's address |
| `mint(uri, payload)` | runs and packs a cartridge on its host | the cartridge address and its verification report |

An agent writing the wiki uses `ask` to annotate, `propose` to add a page, `mint` to add something that runs. A human sees the same five through a panel's `ask` message and the proposal queue. Review is the owner merging a branch, which is already how every repo here works.

**Trust lines.** A finding is never a fact: it carries `confidence: generated` and the question that produced it, and a panel draws it in the generated family. A record becomes a fact when an owner merges it. A cartridge is trusted exactly as far as its host could re-run it. Those three lines are the whole trust model, and none of them needs a new protocol.

---

## 4. Build order: one issue each, ready to paste

Each ships alone and proves one thing before the next depends on it. Steps 1 to 3 are tinypeek's; 2 is tinyhelper's; 4 and 5 are tinylens's; 6 and 7 are tinyhelper's. Nothing in 4 to 7 starts until 2 has three servers reading.

### Issue 1 (tinypeek): the mcp mount with no maps

Add `tm://{host}/mcp/{server}{/path*}` to `api/tm.py`: for each configured server, `mcp/<server>/` (server record), `tools/`, `tools/<name>`, `resources/`, `prompts/`, read live over the server's transport (streamable HTTP and SSE both; the box holds any token). Media types per section 14 (`vnd.tm.server+json`, `vnd.tm.tool+json`, listing). Links: `tm:served-by` from a tool to its server, `tm:schema` from a tool to its input schema as a pointer address, `up` and `collection` as usual. Rate limit and audit log as for every other read. Configure three servers: TerraPulse (`https://mcp.terrapulse.info/`), the CB catalog (`https://mcp.campaignbrain.dev/sse`, cbauth), the resume (`https://bradley.io/api/resume/mcp`). Proves: the tool kind exists; bradley.io/mcp can be read live. Resolve open question A (host naming) before starting.

### Issue 2 (tinyhelper): the index driver and three derived maps

Implement 13.1: read `tools/list` (and OpenAPI where a service has it), derive a map by the five rules, write it where the mount serves it as `mcp/<server>/map` with `confidence: inferred`; honour an override file. Board TerraPulse, the CB catalog and the resume; report, per server, every entry the rules could not decide and why. Verify by reading `tm://.../dex/earthquake/<a real id>` and `tm://.../services/<a real id>` end to end. Proves: a server boards by being named; a pydantic model is an address. Resolve open question B (where maps live) before starting.

### Issue 3 (tinypeek): media types on every read and the kind registry

Every read carries a `vnd.tm.*` type per section 14's table (or the file's own type). Add `tm://<host>/kinds/` and `tm://<host>/kinds/<kind>`, measured from what has been served. Add the `set` kind for the one bend standing in tinylens. Allow `type` on links. Spec v0.22 text for sections 13 and 14 lands in `spec/tm-protocol-spec.md` in this issue. Proves: tinylens's `kindOf()` can become a lookup.

### Issue 4 (tinylens): the manifest as data, `?as=blocks`, and the second host

Lift `kit/scene.js`'s shapes, families and handles into `tm://<host>/manifest` (served by the tinypeek box; coordinate). Move `src/compose.js` to the server as `?as=blocks` with the closed block vocabulary in section 15. Build a static HTML page that renders `vnd.tm.blocks+json` and nothing else, and walk `fixtures/walk.json`'s 873 reads through it. Proves: every kind renders with no LensKit and no peeking; any peek is a logged bend.

### Issue 5 (tinylens): the panel contract and the renderer registry

Implement the four-message contract in LensKit (host side) and wrap the three existing compositions as panels (panel side). Add `tm://<host>/renderers/` with those three as entries, with hashes and fallbacks; LensKit fetches renderers from the registry and bundles none. Prove by rendering a panel built for LensKit inside the issue-4 static page and the reverse.

### Issue 6 (tinyhelper): propose, record, retire, mint

Add the four tools beside `ask`, with tokens and audit. `propose` and `record` create a branch in the target repository per section 12 (Proposals); `retire` writes a boneyard stone; `mint` wraps the 6502 registry's mint-and-verify for the cartridge kind. Prove: an agent proposes a page, a human merges it, `?at=` shows both states, and nothing wrote to the protocol.

### Issue 7 (tinyhelper): one panel as an MCP UI resource

Serve one tm:// panel (the slot panel is the natural one) as an MCP UI resource from tinyhelper's MCP endpoint, bridging the four messages to the extension's bridge. Prove: it renders inside an MCP client that has never heard of tm://.

---

## 5. The bradley.io issue: scene 4 as the stack, the aerial line as the door

For isenbek/bradley.io, alongside issues 12 and 13.

**The door (scene 1).** The thesis line goes above the current h1, as the site's first words: "Let AI build. Let the humans watch the cities being built from the air." Then the shortened h1 from issue 12 A4 ("One person, ready-made parts, and Claude.") and the lede "Production software in days."

**Scene 4 becomes the stack**, client-shaped, replacing the five backend-shaped kits. One row per layer, four fields each: what it does for the client (Beginner), what it runs on (Builder), the proof on the site, and a link. The lede: one set of parts, grown into whatever app the job needs. Composition, not coding.

| Layer | Kit | For the client | Runs on (Builder) | Proof on the site |
|---|---|---|---|---|
| Backend | Sysforge services | Sign-in, payments, files, texting, documents, AI: parts that already work and describe themselves | cb* services, FastAPI, mesh, fabric, OpenAPI, MCP catalog | 91 of 103 up; Save VI, State of Race |
| UI | TinyKit | One app that installs on a phone, works offline, looks like yours | React, PWA, themes, passkeys | the beta itself, House Calls |
| Edge | TinyKit edge | Models run on the device the data is on; nothing leaves | tinygrad weights, WASM, WebGPU, sensors | tinychase on the GPU, MNIST on an ESP32 |
| Data | the data kit | Big datasets handled the same way on a laptop or in the browser | Rust, Polars, DuckDB, tinygrad; desktop and WASM | AstroStack, TerraPulse indexes |
| Sensing | the event mesh | Sensors and feeds become events a business can act on | ADS-B, GPS, SDR, Hotbits, Perception bus | Running-now panel, Hotbits |
| Networking | the fleet kit | Your own hardware, provisioned and watched, no cloud | OpenWRT tools (Junior), VPN cluster, netboot | the fleet instrument |
| Design | meatball.ai | Copy and design that are part of delivery | the family style kit | the shelf |

Behind the curtain and not on the page: Gopher, cbcli, cbmcp, cbmodels, cbstitch. Later, this scene becomes a panel over `tm://bradley/mcp/` so the live number and the tool list are one source.

Open from Bradley before building: is TinyKit inside Sysforge or beside it (the house diagram changes); is "Processing" the event mesh or batch data; is "iOS app" the PWA installed or a native deliverable; does Sensing belong on the client page or the Lab page.

---

## 6. Open questions for Bradley

- [x] **A. Host naming for the mcp mount.** Decided 2026-10-22: one host, `tm://tinymachines/mcp/<server>/...`, a sixth mount beside the five. A server becomes a host of its own only through federation (#10), and a host alias can carry these addresses across when it does. (`tm://terrapulse/...` was the other way: it reads better and would have scheduled federation and tokens at once.)
- [x] **B. Where map and override files live.** Decided 2026-10-22: under the serving box's `fs/notes/maps/<server>.json`, one place, one owner, served and versioned through the namespace. Each server's own repository is right once a second box exists.
- [x] **C. Free-text searches.** Decided 2026-10-22: tools only, under rule 2. A saved search is a trail. Nothing to build.
- [ ] **D. Which bradley.io pages become panels first.** `/mcp` is the obvious one; scene 4 next.
- [ ] **E. The resume as a wiki subject** is fine for the mount, but should its findings ever be public? `docs/family.md` left "whether any finding besides an answer is ever made public" open; the resume is where that gets decided.
- [ ] **F. A name for the whole.** tinypeek is the protocol, tinylens the lens, tinyhelper the hands. The wiki the three make has no name yet, and the site will want one before the panels ship. Searchapedia was the working name. Left open on 2026-10-22; wanted before issue 5 ships.
- [ ] **G. The scene-4 questions** in section 5.

---

Sources read for this document on 2026-10-21: tinymachines/tinypeek (spec v0.21, `docs/family.md`, `CLAUDE.md`, `site/`), tinymachines/tinylens (`README.md`, `kit/handlers.js`, `kit/scene.js`, `src/compose.js`, `kit/helper.js`), tinymachines/public (`api/tm.py`, `api/mcp_server.py`), https://terrapulse.info/mcp/docs and https://mcp.terrapulse.info/spec.json, https://mcp.campaignbrain.dev/docs, https://bradley.io/mcp, tinymachines/6502 `games/README.md` and `games/game.js`.
