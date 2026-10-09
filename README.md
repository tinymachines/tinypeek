# tinypeek

**A read-only URI namespace over MCP: every real thing on a machine gets an address, and every address tells you what it's connected to.**

tinypeek is the home of the `tm://` protocol. It lets an AI client walk one machine's websites, source repositories and filesystem through a single grammar, and pivot between the faces of a thing (the rendered page, the code that emits it, the data it reads, the history behind it) by following typed links instead of guessing paths.

```
tm://tinymachines/http/tinymachines.ai/autopsy/lessons/jump
  tm:source   → tm://tinymachines/git/public/lessons/jump/prg.s
  tm:data     → tm://tinymachines/fs/data/lessons.json
  alternate   → tm://tinymachines/http/tinymachines.ai/ja/autopsy/lessons/jump
```

## What's here

| Path | What it is |
|---|---|
| [`spec/tm-protocol-spec.md`](spec/tm-protocol-spec.md) | The protocol: layers, grammar, facets, errors, mount contract, link vocabulary, safety. Every section is marked shipped, partial or planned. |
| [`docs/stack-explainer.md`](docs/stack-explainer.md) | The plain-language companion: what MCP gives you, what tinypeek adds, and where each layer stops. |

## The idea in one diagram

```
 5  Applications       entity index, search, proposals        ← built on the platform
    ─────────────────  platform boundary
 4  Link vocabulary    typed edges between resources          ← what tinypeek adds to MCP
 3  Resolver           list / read / complete → content + links
 2  Addressing         tm://<host>/<mount>/<path>?<facets>
 1  Transport          MCP
```

MCP gives you addresses and a read verb. It doesn't give you a graph between them. tinypeek adds that layer, borrowing RFC 8288 Web Linking semantics, and holds every layer to one test: **a layer is done when the layer above it can be built without changing it.**

## Principles

- **Read-only.** Safety lives in the verb set, not a curated view.
- **The OS is the namespace.** Real files, repos and sites, not a hand-built tree.
- **Rules, not lists.** Templates publish the grammar; clients compose addresses they were never shown.
- **Errors teach.** A wrong guess comes back with the nearest URIs that do resolve.
- **Standards first.** MCP, RFC 3986 / 6570 / 8288, Plan 9.

## Reference deployment

The `tinymachines` server runs the protocol live over its `fs`, `git`, `http` and `offbox` mounts, and serves this repository at `tm://tinymachines/git/tinypeek/`. It's included as a submodule of [`tinymachines/public`](https://github.com/tinymachines/public) at `extern/tinypeek`.

## License

MIT. See [LICENSE](LICENSE). This repository holds the protocol only; it contains no visual6502 die data and no ROM content.
