# The tm:// Stack — What MCP Gives Us, What We Built, and Where to Stop

**Companion to the [tm:// Protocol Spec v0.3](../spec/tm-protocol-spec.md) · 2026-10-09**

This is the plain-language version. The spec says *what* the protocol is; this says *why it's shaped that way* and how to think about building on it.

---

## 1. MCP in one paragraph

MCP, the Model Context Protocol, is a standard way to plug tools and data into an AI client. Before it, every integration was bespoke glue. MCP says: run a server that speaks one protocol, and any client that speaks it can use you. The tinymachines server is exactly that — Claude connected to it with no custom code on the client side.

A server offers two main kinds of thing:

- **Tools** — actions the client calls. Ours: `resolve`, `overview`, `piece`, `licensing`.
- **Resources** — read-only, addressable data, each with a URI and a mimeType.

We went tools-first with a single `resolve(uri)` verb because, in practice, tool-first clients navigate tools more fluidly than raw resources. That was an open question in the first spec; the audit settled it.

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

You can hand someone the grammar and they can construct an address for something you've never discussed. The proof: `fs`, `git` and `http` all fit the same shape. Adding a mount did not change the scheme. **This layer is effectively done. Lock it.**

### Resolver — done when every URI returns content plus typed links

The scheme says what a name looks like; the resolver says what's behind it. Keep that cut clean — resolver logic never leaks into the grammar. One gap remains: an unsupported facet on a collection is still ignored rather than refused (TM-11). The http default facet (TM-4) and ranked `nearest` suggestions (TM-5) shipped.

### Link vocabulary — done when the set of relations is closed and documented

A client should traverse the graph knowing only the rel names, not how any mount computes them. The discipline: **a new relation is a vocabulary change, not a resolver change.** If adding `tm:measures` forces a resolver restructure, the cut slipped. Lineage now walks to an explicit `offbox` node (TM-7) and fan-out is bounded (TM-18), so this layer meets its test. The `offbox` mount is also the first real check of layer 2: a fourth mount arrived without a grammar change.

### Applications — everything semantic

Patterns, games, routines, graph queries, search, proposals: all of it is a *consumer* of the layers below. It should be buildable without touching the scheme, the resolver or the transport.

### The finish line

> **Stop at: every real thing on the box is addressable and resolvable with typed links. That's the platform.**

Everything after is an application on the platform, and each one is a test. **The first application that forces a platform change tells you the platform wasn't done.** The entity mount (TM-16) is that first test.

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
- **Other boxes.** The grammar already has `host`; the fleet is a set of hosts under one namespace.
- **Code at symbol level.** SCIP/LSIF symbols as addressable entities, linked to the files and pages they appear in.
- **The entity index.** Per-kind identity (content hashes, SWHID for git objects, canonical URLs for pages) with an `edges(src, rel, dst, confidence, observed_at)` table — the resolver serves live views, the index answers graph queries.

Keep scope honest: each new area is valuable only if it fits the existing layers without changing them. If it doesn't fit, that's a signal about the platform, not a reason to bend it.

---

## 7. Status snapshot (2026-10-09)

- **Fixed and verified:** TM-1, TM-3, TM-4, TM-5, TM-6, TM-7, TM-8, TM-9, TM-10, TM-14, TM-18.
- **Open:** collection facet errors (TM-11), orientation at connect (TM-12), the spec catching up with the server (TM-13; this revision).
- **Unverified from outside:** binary through `?as=raw` (TM-2), the CI link crawler (TM-15).
- **Not started:** entity mount (TM-16), completions (TM-17).

Full detail lives in the work package.
