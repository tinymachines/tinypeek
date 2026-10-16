# tinypeek vs. Gopher: what the old protocol had that tm:// doesn't

Oct 15, 2026 · @Spice Y. Meatball

## Why Gopher is the right comparison

tinypeek is closer to Gopher than to HTTP: both are list-then-resolve protocols over a typed hierarchy, where every answer is either a menu of links or a document. Gopher (1991, port 70) proved that shape scales to thousands of servers with clients that fit in a few hundred lines. Its failures are instructive too: no metadata, no relations beyond "inside this folder", and no way to describe a thing without fetching it.

This doc audits tinypeek's live tm:// surface (as of today, host `tm://tinymachines/`, mounts fs, git, http, offbox, entity) against the Gopher feature set and lists what the old protocol had that tm:// does not yet.

## Two Gophers

"Gopher" is two protocols. Plain Gopher (University of Minnesota, 1991; RFC 1436, 1993) is one line in and bytes out: a selector goes up, and a menu or a document comes down. A menu line is a type character, a display string, a selector, a host and a port, and nothing else. Gopher+ (1993) kept that and added attribute blocks a client could ask for on their own: who runs the item, an abstract, the views it comes in with their sizes, and ASK forms that take input. Most of what plain Gopher lacked, Gopher+ had, so the audit says which one it means each time.

## What Gopher had that tm:// does not

Measured against spec v0.15 and the live server, 2026-10-15. Three verdicts: *declined* means the spec says why and what would reopen it; *not yet* means nothing has decided it; *other form* means tm:// has it, somewhere a Gopher client would not look.

| Gopher had | Which Gopher | tm:// today | Verdict |
|---|---|---|---|
| **Search as an address.** Type 7: a selector that takes the words typed and answers a menu. | plain | No search. A client walks, or a lens indexes what it walked. | not yet (tinypeek#17, and the search section of `lens.md`) |
| **A menu that points anywhere.** Each item names its own host and port, so one menu can link a thousand servers. | plain | A link never leaves the hosts its server answers for, and today that is one host. | declined until a second box (spec §5, tinypeek#10) |
| **The type in the address.** A Gopher URL carries the item type before the fetch. | plain | The type is in the listing (`mimeType`, `isCollection`, `size` on each child) and in `?as=stat`, never in the URI. | other form, by design: the URI is the identity, and type is a fact about the thing |
| **Attributes without the thing.** `TAB !` fetched an item's attribute block alone. | Gopher+ | `?as=stat` and `?as=links`: metadata and relations, no content. | other form |
| **Views.** `+VIEWS` listed an item's representations with their sizes. | Gopher+ | Facets (`?as=`) are the representations, and the templates name them. Sizes come from `?as=stat`, one facet at a time, not as one list. | partly: there is no one read that lists a thing's facets with their sizes |
| **An abstract.** `+ABSTRACT` carried a paragraph about the item. | Gopher+ | A link may carry a `title`; a child carries a `name`. No read describes a thing in a sentence. | not yet, and not asked for |
| **Who runs it.** `+ADMIN` named the administrator and the modification date. | Gopher+ | `?as=stat` gives a modified time on fs and the resolved commit on git. No read names a person, by decision: the namespace carries no address, no name and no log of callers (§10). | declined |
| **Forms.** ASK blocks took input and sent it to the server. | Gopher+ | tm:// is read-only. The family's rule is that only tinyhelper writes, and it is not a mount. | declined (`family.md`) |
| **An informational line.** Type `i`: text in a menu that is not a link. | plain, as an extension | A listing is children only. The root's `start_here` and a refusal's message are the nearest things to a line of text in a menu. | other form, thin |
| **Redundant servers.** Type `+`: the same item on another host. | plain | One host, one server. | declined with federation (§5) |
| **One line in, bytes out.** A client in a few hundred lines, no handshake, telnet as a debugger. | plain | tm:// rides MCP: JSON-RPC, `initialize`, and links in `_meta`. The live server does answer a bare `resources/read` with no `initialize` first, so a one-shot client is possible, but the answer is JSON, not bytes. | the cost of the transport, taken on purpose (§4) |
| **Thousands of servers.** The shape was proven at that scale by 1994. | plain | One. How two servers find each other is the open part of federation. | deferred (§5) |

Types 2, 8 and T (a phone book, telnet, tn3270) are not compared: they were doors to other protocols, not things in the hierarchy.

## What tm:// has that Gopher never did

So that the audit is honest in both directions:

- **Typed relations with inverses.** A Gopher menu knew one relation, "inside this folder". A tm:// read carries links by rel, from the IANA registry and from the `tm:` vocabulary, and every pair has its inverse, held true by a crawler at every deploy (§9, §12).
- **One identity, many representations.** `?as=stat`, `?as=log`, `?at=v1` are the same thing seen differently. Gopher had one selector per view and no way to say two selectors were the same thing.
- **Refusals that teach.** A Gopher error was type 3 and a line of text. A tm:// refusal is structured, names the nearest addresses that do resolve, and since v0.15 refuses a parameter the mount does not take rather than dropping it (§7).
- **A grammar the server publishes.** Templates and completions let a client compose an address it was never shown (§5). Gopher had no grammar beyond "a selector is opaque".
- **History as an axis.** `?at=` reads a repository at any ref. Gopher had no time.

## Not covered

This compares protocols, not deployments: Gopherspace at its height and one box today are not the same measurement, and the table does not pretend they are. Nothing here was run against a Gopher server; the Gopher column is from RFC 1436 and the Gopher+ draft, read, not measured. The tm:// column was checked against the live server on the date above.
