# A browser for tm://, and what it asks of layer 2

Ideas, written down on 2026-10-12. Nothing here is built and nothing here changes the spec. Each idea is marked with what is true on the live server today, measured, and what would have to change.

## Where this came from

The namespace grew one need at a time. The NES lessons gave us entities: a pattern, a game, a routine and a lesson as things of their own. Matching code to pages gave us typed links: a page knows its source, the source knows its page, and the crawler checks that every link has its way back. Both were built for a client reading one address at a time.

A browser is what you get when you stop reading the links one at a time and start looking at them.

## Why web browsers feel one-dimensional

A URL names a document. A link is an `href` that says "go there" and nothing about why. A page is one long scroll, and history is a line you walk back and forward along. Because a link carries no meaning, following it is the only thing a browser can do with it.

tm:// already has more than that, and it got each one for its own reasons:

| Axis | In the address | What it gives |
|---|---|---|
| The thing | the path | one identity per real thing |
| The view | `?as=` | the same thing as a page, its text, its log, its blame, its stat |
| Time | `?at=` | the same thing at another ref (git only, today) |
| Relations | typed links | found-in, instance, demonstrated-by, source, renders-as, pins, each with its inverse |

That is four dimensions before anyone draws a screen.

## The lens

A tm browser is less a page viewer than a lens:

- **The thing sits in the middle**, with its links grouped by rel around it. Clicking one moves the lens there.
- **The view is a dial** and **time is a scrubber**. Turning either keeps you on the same thing.
- **History is a tree, not a line.** Each step is labelled with the rel you took, so "back" can mean back along this rel or back to where you branched.
- **Pages are constructed, not fetched.** Read `entity/pattern/pad-poll` and the lens can lay out the 19 games it was found in, each with its routine beside it and the 23 lessons that use it, as one page nobody wrote. Every line on that page is a read, and every read has an address you can check.

Two old ideas fit here. Vannevar Bush's memex (1945) had **trails**: a named path through documents you could hand to someone else. Ted Nelson's Xanadu had **two-way links** and **transclusion**, quoting a piece of something with the quote still attached to where it came from. Our crawler already refuses a link without its inverse, which is the two-way link Xanadu wanted and the web never had. Transclusion is the missing half, and it needs an address for a piece of a thing (candidate 2 below).

## Search over a typed graph

Keyword search matches text. A typed graph allows a different question: "every routine that is an instance of pad-poll, in a game that also has some other pattern" is a walk along rels, not a match. Ranking has signal the web never had:

- **How sure a link is:** exact or inferred.
- **How often it occurs:** `count`.
- **Whether its inverse checks out:** the crawler already does that check.

The crawler is most of an indexer already.

## Out into the world

`tm://` already stopped meaning "a website": the second server on the box answers for a private host of agents, read through the same grammar. The next hosts could be physical: a fleet of small devices, a sensor, an object with a tag on it.

The idea of matching code to pages carries straight over to matching code to devices:

- **What a device runs.** "This device runs commit X" is a link, the same fact the 6502 engine gate already records for the site.
- **Reading a thing.** Point a phone at a tag, read its address, and the lens shows the firmware's repository, its log and its agent.

Two boundaries come with it:

- **Read-only stays read-only.** Acting on the world is an application's job, under its own grants, never the protocol's verb.
- **A physical address tells where and when.** The first private physical mount is what schedules tokens (#5), as the spec already says a non-public mount would.

## What it asks of layer 2

Layer 2 is addressing: `tm://<host>/<mount>/<path>?<facets>`. These are five candidates for it, plus one finding from the first walk.

### Finding: a parameter a mount does not take is dropped, not refused

On the live server, `tm://tinymachines/http/tinymachines.ai/autopsy/lessons/jump?at=2026-10-01` answers with today's page. `tm://tinymachines/git/tinypeek/README.md?lines=1-5` answers with the whole file. In both cases the answer's `uri` leaves the parameter out, so a careful client can notice, but nothing says so. An unknown value of `as` is refused (`bad-facet`), and the spec's rule for collections is "refused rather than dropped" (TM-11), so this is the one place the namespace still drops something quietly.

The parser keeps every parameter (`parse()` in `api/tm.py`) and each mount reads the ones it knows.

This matters for a browser before anything else. A time scrubber built today would label today's page as last week's. It also has to be settled before candidate 1, because without it a client cannot tell a mount that honours `?at=` from one that ignores it.

The likely fix: refuse a parameter the mount does not take with `bad-facet`, listing the ones it does, as an unknown `as` is refused today. The cost: any client that sends a harmless extra parameter starts getting refusals. None is known.

**Settled in spec v0.15 (tinypeek#13).** The server refuses the parameter and names the ones the mount takes, the answer's `uri` carries every parameter the read used, and the templates name every parameter, so the lens can drop the list it carried of its own (`SPEC_EXTRAS`). Candidate 1 is no longer blocked on this.

### 1. One time axis on every mount

**Today:** `?at=` is git only (§6), and means a ref.

**The idea:** `?at=` on every mount, each saying what time means for it:

- **An agent:** what it said then (the inbox keeps the history).
- **A page:** a snapshot, if one is kept.
- **A sensor:** the reading at that time.
- **A git file:** as today.

A mount with no past refuses it.

**Open:** whether a time and a ref share one parameter, and how a client learns what times a thing has (a `?as=log` for every mount?).

**Settled in spec v0.16 (tinypeek#15).** One parameter, two spellings told apart by shape: a ref names a commit, a time names the newest commit on the main line made at or before it. `fs` takes it as the repository behind the file. A thing's times are at its `version-history` link, so no new facet. A mount with no past refuses it and says where the past is; an entity at a time is tinypeek#21.

### 2. A piece of a thing you can read

**Today:** an `href` may end in a fragment, which names a place inside the thing; an entity's `tm:data` carries a JSON pointer. The server ignores the fragment and reads the whole thing (§9). `?range=` reads bytes.

**The idea:** a readable span, meaning lines of a file or a pointer into a record, so a constructed page can quote a piece and keep its address. This is transclusion.

**Open:** a fragment is not part of identity by the spec's own rule, so the readable span is probably a facet (`?lines=10-20`, `?pointer=/games/3`) and the fragment stays a hint.

**Settled in spec v0.17 (tinypeek#16).** The span is a facet, and there are three: `range` (bytes), `lines` (of a file or a page's text) and `pointer` (into a JSON file), one a read. The echo keeps the span, so a quote keeps its address. An entity's `tm:data` now carries its pointer as the facet and reads the piece; the fragment rule stays for clients. Not covered: a span by heading or selector.

### 3. An address for a set

**Today:** a collection is a directory, a listing or an entity kind. There is no address for "the result of this walk".

**The idea:** a walk or a query gets an address, for example the found-in links of a pattern filtered by count. A saved search could then be linked to, carry its own links and answer `?as=stat` with a version. A client would know it changed by reading the stat again, which is how subscriptions were settled (#11).

**Open:** the line between an address and a query language. This is where a search engine meets the grammar, and it is the candidate most likely to turn layer 2 into something else.

### 4. A trail as an address

**The idea:** a named, ordered list of addresses, the memex trail, read like anything else, with links to each step and from each step back to the trails it is on.

**Open:** where a trail lives. The protocol is read-only, so a trail is written somewhere else (a file in a repository is enough) and read through a mount. That may make it no grammar change at all, which would be the best answer.

### 5. Hosts that are not machines

**Today:** a host is a name a server answers for, and how a client finds another server waits for a second box (#10).

**The idea:** a device, a place or an object as a host or a mount. The grammar may already take it, as it took the entity mount. The pressure is on federation: physical hosts multiply, and "how do I find the server for this name" stops being hypothetical.

## The test

The spec holds every layer to one rule: a layer is done when the layer above it can be built without changing it. A browser is a layer-5 application, so building one is a test of layer 2.

The method:

1. Build the smallest lens over the live server, changing nothing below it.
2. Every time it has to bend the addressing, or fake something the addressing cannot say, write the bend down. That list is the real layer-2 work.
3. Candidates the lens never needed stay ideas.

The first walk already logged one bend (the finding above).

## Not covered

- **Where the browser lives** and what it is built in. It is not this repository's, which holds the protocol only.
- **How a search engine would be run**, and over whose hosts.
- **Anything that writes.** Trails and saved searches are written outside the protocol.
- **Privacy for physical hosts**, beyond saying that they schedule tokens.
