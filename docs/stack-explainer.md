# The tm:// Stack — What MCP Gives Us, What We Built, and Where to Stop

**Companion to the [tm:// Protocol Spec](../spec/tm-protocol-spec.md) · last brought up to date 2026-10-23, for v0.26**

This is the plain-language version. The spec says *what* the protocol is; this says *why it's shaped that way* and how to think about building on it.

---

## 1. MCP in one paragraph

MCP, the Model Context Protocol, is a standard way to plug tools and data into an AI client. Before it, every integration was bespoke glue. MCP says: run a server that speaks one protocol, and any client that speaks it can use you. The tinymachines server is exactly that — Claude connected to it with no custom code on the client side.

A server offers two main kinds of thing:

- **Tools** — actions the client calls. Ours: `resolve`, `overview`, `piece`, `licensing`.
- **Resources** — read-only, addressable data, each with a URI and a mimeType.

We speak both. The namespace is served as MCP resources, and a single `resolve(uri)` tool reads the same URIs, because in practice tool-first clients navigate tools more fluidly than raw resources. That was an open question in the first spec; the audit settled it.

---

## 2. Does MCP already have an addressing scheme?

**Partly.** MCP has the *concept*; we took it further.

What MCP gives you:

- **Resource URIs.** Every resource has a URI, and the scheme is yours to define — `file://`, `https://`, or a custom one like `tm://`. So the primitive of "address a thing" exists.
- **Resource templates.** RFC 6570 parameterized URIs — the "generate an address from rules" idea. A client can build an address it was never told about.
- **Read and list.** A way to fetch what's behind an address and page through collections.

What MCP does **not** give you:

- **A link graph.** There's no standard way to say "this resource relates to that one, by this named edge." MCP has the nouns; it has no verbs *between* nouns.

That gap is what we filled. `tm:source`, `tm:renders-as`, `tm:generated-by`, `tm:data`, `tm:read-by` — the typed-relation layer — is borrowed from Web Linking (RFC 8288), but putting it on top of MCP resources is ours. **It's the real invention in the stack, and it's what makes the stack reusable.**

So to answer the two original questions directly:

| Question | Answer |
|---|---|
| A. Does MCP have a structured way to address the real world? | It has addresses and templates, but leaves the scheme and its meaning to you. `tm://` is our scheme over the real machine. |
| B. Does it have a way to integrate the two (address + relationships)? | No. That's the link-vocabulary layer we added. |

---

## 3. The stack, bottom to top

```
 5  Applications       entity index, search, proposals, dashboards     ← ours, built on the platform
    ─────────────────  platform boundary
 4  Link vocabulary    typed edges between resources                   ← ours (the invention)
 3  Resolver           what's behind a URI: content + links + errors   ← ours
 2  Addressing         tm://<host>/<mount>/<path>?<facets>             ← ours, on MCP's URI primitive
 1  Transport          MCP: session, tools, resources, auth            ← borrowed
```

Only layer 1 is borrowed wholesale. Layer 2 uses MCP's URI primitive but the scheme is ours. Layers 3 and 4 are ours. That's why the top of the stack is portable: it doesn't care what's underneath as long as the layer below keeps its contract.

---

## 4. Separation of concerns: where to stop

The risk with a layered system is reopening the same layer forever. The test that prevents it is the one that made the web work:

> **A layer is done when the layer above it can be built without changing it.**

If adding a feature makes you reach down and modify the addressing scheme, the cut is in the wrong place.

### Addressing — done when any thing has a URI and the grammar never changes

You can hand someone the grammar and they can construct an address for something you've never discussed. The proof: `fs`, `git` and `http` all fit the same shape, and when `offbox` arrived (TM-7) it fit too. Adding a mount did not change the scheme. **This layer is effectively done. Lock it.**

### Resolver — done when every URI returns content plus typed links

The scheme says what a name looks like; the resolver says what's behind it. Keep that cut clean — resolver logic never leaks into the grammar. The http default facet (TM-4), ranked `nearest` suggestions (TM-5) and facet errors on collections (TM-11) are done.

### Link vocabulary — done when the set of relations is closed and documented

A client should traverse the graph knowing only the rel names, not how any mount computes them. The discipline: **a new relation is a vocabulary change, not a resolver change.** If adding `tm:measures` forces a resolver restructure, the cut slipped. Full lineage (TM-7) and bounded fan-out (TM-18) are done, and `tm:input` arrived without a resolver change, so by its own test this layer is finished.

### Applications — everything semantic

Patterns, games, routines, graph queries, search, proposals: all of it is a *consumer* of the layers below. It should be buildable without touching the scheme, the resolver or the transport.

### The finish line

> **Stop at: every real thing on the box is addressable and resolvable with typed links. That's the platform.**

Everything after is an application on the platform, and each one is a test. **The first application that forces a platform change tells you the platform wasn't done.** The entity mount (TM-16) was that first test. It found the platform close and not finished: one hook was missing in the resolver and two vocabulary rules were too narrow. Both are fixed, and the next application is the next test.

---

## 5. How to tell if a layer is leaking

Quick checks to run whenever you add something:

| You're adding… | It should touch… | If it also touches… | That's a leak in… |
|---|---|---|---|
| A new mount (e.g. hosts, packages) | Resolver (one new backend) | The URI grammar | Addressing |
| A new facet | Resolver | Identity (a new path) | Addressing — facets must not mint identities |
| A new relation | The vocabulary table | Resolver structure | Link vocabulary |
| A new application (entity mount) | Only itself | Any of layers 1–4 | Whichever layer it touched |

---

## 6. Where else the stack can go

Because layers 1–4 don't know what they're pointing at, the same stack applies wherever things have identities and relationships. Each of these is a new mount or a new application, not a new protocol:

- **More of the box.** Hosts and hardware (an osquery- or Redfish-backed mount), installed packages (purl identities), running services.
- **Other boxes.** The grammar already has `host`, and a server answers for a set of them, listed at `tm://`. Today the set is one. How two separate servers would find each other is not decided, and waits for a second box. A host need not be a machine, either: a device, a bench or a place can come as a mount of a host that answers or as a host of its own (spec §5, v0.20).
- **Code at symbol level.** SCIP/LSIF symbols as addressable entities, linked to the files and pages they appear in.
- **The entity index.** Per-kind identity (content hashes, SWHID for git objects, canonical URLs for pages) with an `edges(src, rel, dst, confidence, observed_at)` table — the resolver serves live views, the index answers graph queries.

Keep scope honest: each new area is valuable only if it fits the existing layers without changing them. If it doesn't fit, that's a signal about the platform, not a reason to bend it.

---

## 7. Status snapshot (2026-10-22)

Everything the spec marks shipped is live on `tinymachines`; tokens wait on a reason, and the three additions of the v0.22 handoff are planned with their issues. The spec's version history says what each version changed and when it went live.

- **The platform, layers 1 to 4.** Seven mounts under one grammar (`fs`, `git`, `http`, `offbox`, `entity`, `mcp`, `kinds`), facets for other representations, refusals that name the nearest addresses that do resolve, and typed links with their inverses. A link crawler reads the whole namespace at the end of every deploy, about 3,340 addresses, and fails the deploy on a link that does not resolve or a pair with one end missing.
- **The first application.** The entity mount gives patterns, games, routines and lessons addresses and links of their own. Building it left the grammar and the transport alone. The resolver needed one hook so a mount can answer for a link another mount starts, and two vocabulary rules had been written around pages and had to be widened. The spec's section 11 has the table.
- **The second test, a browser.** tinylens, a browser for `tm://` served on the tinypeek site at `/lens/`, was built over the live server to find where the addressing bends (`docs/lens.md`). Its first walk found one: a parameter a mount did not take was dropped without a word. Since v0.15 it is refused, naming the ones the mount takes. Then its five ideas were taken up in order:
  - **One time axis** (v0.16). `at=` is a ref or a time on every mount that has a past, so a file on `fs` reads as its repository had it then. A mount with no past refuses it and says where the past is.
  - **A readable piece** (v0.17). `lines=` and `pointer=` sit beside `range=`, and the answer's address keeps the span, so a quote keeps where it came from.
  - **An address for a set** (v0.18). `?as=links` narrowed by one `rel=` and a lower bound on count, `min=`. One rel and one bound, and no joins: past that it would be a query language.
  - **A trail** (v0.19). A named list of steps is a JSON file in a repository, linked to each step and back from each one, and the crawler holds the pair. No grammar change.
  - **Hosts that are not machines** (v0.20). Decided, not built: the first device or place with readable state decides whether it comes as a mount or as a host.
  - **An entity at a time** (v0.21). The entity mount reads its records as the repository had them, so pad-poll at 2026-10-01 is found in 19 games and demonstrated by no lesson, and at 2026-10-10 by 23.

  Every one of them arrived as a facet, a file or a decision. The grammar and the transport did not change, which is the layer test of section 4 passing a second time.
- **The second application, off the box.** The `mcp` mount (v0.22). Another MCP server named in a file of the checkout becomes a mount of this host: its tools, resources and prompts get addresses, a tool links to its server and its server back to each tool, and a tool's schema is a piece of it. The box keeps the connection and measures the server's status each time it is asked, so a server behind a token reads as gated and one that does not answer as unreachable. Three servers are named today, two of them open. Nothing is called: a tool is listed and described, and the read-only rule holds. What comes next is in the v0.22 handoff (`tm-v0_22-handoff.md`): kinds and media types, so a client knows what it is holding; panels, so the lens can show a kind well; and writes, which stay the helper's.
- **Every read says what it is** (v0.23). Its media type names its kind: a listing, a stat, a record, a pattern, a tool, a page's text, each `vnd.tm.<kind>`, and a file the server merely holds keeps its own type. A link may carry its target's type, so a browser can draw the right card before following. `kinds/` lists the kinds the host has served, counted as they go out, so it says what has happened and not what was meant. And a set and its members read in one on the entity mount, which closes the one bend the lens had left standing. The crawler follows every link that says a type and holds the target to it.
- **Another server's data has addresses** (v0.24). A map, derived by tinyhelper's index driver from the schemas a server already publishes and corrected one entry at a time by a person, says which of its tools read as paths: `mcp/terrapulse/kinds/eq/<id>` is one earthquake, read by the tool the map names, typed as a slot of kind `eq`, with the server's sources and licence carried along untouched. Each entry says whether it was inferred or confirmed, so a browser shows which addresses were guessed. The real servers taught two things on the day: a walk that follows every edge reads a whole graph live, so the check samples; and a server has its own rate, so the box keeps one session and paces itself.
- **A site built somewhere else has addresses too** (v0.25). The box serves a second site it did not build, so the namespace lists it from the page list the site publishes, its sitemap, and treats the site's own robots rules as a fence: a page the sitemap does not name is never asked for, and a path the robots disallow reads as denied with the rule. The pages read as pages, with no link back to a source, because the join from a page built elsewhere to its code is the one thing a manifest would add; that question, closed in v0.11 for lack of a second example, is open again now that there are two sites.
- **A page nobody wrote, for a screen with no code on it** (v0.26). Ask any address for its blocks and the server composes it into a short list of plain pieces, headings, sentences, tables, links, each saying where it came from, so a terminal, a print page or a voice agent can show anything in the namespace without knowing what kind of thing it is. The same address also publishes the visual language the lens draws with, as data, so every viewer draws the same shapes.
- **Answers to questions.** tinyhelper, the one member of the family that writes, runs behind the site at `/helper/`. The lens's ask button sends it a question about a thing, with the helper's token, and the answer comes back as a finding with an address of its own on `tm://helper/`, its citations checked against the namespace. A finding is generated, never measured, and the link that reaches it says so. Anyone can read an answer; any other kind of finding needs the token.
- **Bounds.** No read carries more than 100 links, and the rest is a page at a time behind `?as=links`. Every read is held to a byte cap and reads in ranges past it. A git tree reads to a stated depth. Each caller has a rate limit.
- **Record keeping.** The server keeps a record of each request with no address in it, bounded in days and in bytes, and never served. No refusal names anything about the host.
- **Hosts.** A server answers for a set of hosts and a set of one is enough. `tm://` lists them.
- **Decided and not built, each with its reasons in the spec:** a link manifest emitted by the site's build (section 8), subscriptions (section 4), tokens (section 10), and hosts that are not machines (section 5). Tokens wait for a mount that is not public; when they come, anonymous reads of public things stay.
- **Deferred until there is a second box:** how two servers would find each other.
- **Not covered here:** the pattern records say how often and where a pattern occurs, not what it is, so an answer about a pattern can only go by its name. Whether they should carry a description, or a link to the rule that finds them, is open.
