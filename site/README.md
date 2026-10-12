# The tinypeek site

The public site of the `tm://` protocol, at `https://tinypeek.tinymachines.ai`. It serves the protocol (the spec and its explainer, rendered from the Markdown in this repository at build time, so the site can never show a version the repository does not have), the browser for it (tinylens, at `/lens/`), and a showcase of the three projects built on it. `docs/family.md` says who does what.

It is an app on the tinymachines kit (`@tinymachines/kit`, pinned to a tag in `package.json`): the kiosk look, themes checked for contrast, install and offline, sharing. The kit ships as TypeScript source and is compiled with the app.

## Run it

```bash
cd site
bun install
bun run dev          # http://localhost:4410
```

`bun` only: no npm, yarn or npx. Nothing is fetched from another host at runtime; fonts are system stacks.

## The lens

tinylens is a submodule at `extern/tinylens`. `scripts/lens.ts` copies what it serves (its page, its source and the recorded walk) into `public/lens/`, which the build ships as it is at `/lens/`; the build runs it first, and it refuses when the submodule is empty. The lens reads the live namespace from the visitor's browser and the app's service worker never answers for it.

```bash
git submodule update --init         # once, after a clone
```

To move the lens forward: `git -C extern/tinylens fetch && git -C extern/tinylens checkout <commit>`, then commit `extern/tinylens`, so this repository never points at a commit the lens's repository does not have.

## The check

```bash
./check.sh           # must end in ALL OK
```

It builds the site, serves the build the way nginx will (`scripts/serve.ts`) and drives it in headless Chrome (`scripts/check-site.ts`): every page opens with no error and fits a phone, each document shows its own first heading with anchors on its sections and no link left at a Markdown file, the lens is served beside the app as files, the Menu lists the doors, a theme pick survives a reload under the app's own prefix, the share panel draws a QR code, and the spec opens offline. When it passes it writes the commit to `out/check-ok`; the deploy refuses without it. When you change what it guards, break it on purpose and watch it fail.

## Deploy

Deploying is the owner's word. `scripts/site-setup.sh` makes the nginx site and its certificate, once the name resolves (the DNS record is in the `tinymachines.ai` zone, which this repository does not describe). `scripts/site-deploy.sh` builds and publishes, and refuses on a dirty tree or a commit the check has not passed on.

## What is here

| | |
|---|---|
| `src/app.config.ts` | who the app is: the pages, the doors, the shortcuts |
| `src/App.tsx` | the router |
| `src/docs.ts` | the documents the site serves, read from the repository at build time |
| `src/pages/Doc.tsx` | a document, rendered as it is, with anchors and its links resolved |
| `src/pages/Home.tsx`, `src/pages/Showcase.tsx` | the front door and the showcase |
| `src/styles/tinypeek.css` | the site's own styles, over the kit's |
| `scripts/lens.ts` | the lens copied in from the submodule |
| `scripts/serve.ts`, `scripts/check-site.ts`, `check.sh` | the check |
| `scripts/site-setup.sh`, `scripts/site-deploy.sh` | the host |

## Not covered

- The design beyond the kit's look: the family look is the owner's.
- How a helper's findings are made public, if any ever are. The showcase shows none.
- The DNS record for the name.
