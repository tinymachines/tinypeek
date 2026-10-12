#!/usr/bin/env bash
# Build the site and publish it to the root nginx serves for tinypeek.tinymachines.ai. It refuses when the
# repository's tree is dirty or ./check.sh has not ended ALL OK on this commit (out/check-ok). A failed build
# leaves the live site untouched: rsync runs only after the build succeeds. Afterwards it fetches the live
# sw.js and compares it with the build before saying the site is live.
#   ./scripts/site-deploy.sh            build + sync
#   ./scripts/site-deploy.sh --dry-run  build, then show what would change
#   ./scripts/site-deploy.sh --force    this version takes over every installed copy as soon as it checks in
set -euo pipefail
cd "$(dirname "$0")/.."
HOST=tinypeek.tinymachines.ai
ROOT=/var/www/$HOST
RSYNC=()
for a in "$@"; do case $a in --force) export VITE_FORCE_UPDATE=1 ;; *) RSYNC+=("$a") ;; esac; done
[[ -d "$ROOT" ]] || { echo "refusing: $ROOT does not exist; run ./scripts/site-setup.sh first"; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo "refusing: the tree is dirty; commit first"; exit 1; }
head=$(git rev-parse --short HEAD)
[[ -f out/check-ok && "$(cat out/check-ok)" == "$head" ]] || { echo "refusing: ./check.sh has not ended ALL OK on $head (out/check-ok says '$(cat out/check-ok 2>/dev/null || echo nothing)')"; exit 1; }
bun install --silent
bun run build
rsync -a --delete "${RSYNC[@]}" dist/ "$ROOT"/
echo "published $head${VITE_FORCE_UPDATE:+ (forced update)} -> $ROOT ($(find "$ROOT" -type f | wc -l) files)"
if [[ " ${RSYNC[*]} " != *" --dry-run "* ]]; then
  live=$(curl -fsS "https://$HOST/sw.js" | sha256sum | cut -c1-16)
  built=$(sha256sum dist/sw.js | cut -c1-16)
  [[ "$live" == "$built" ]] && echo "live: https://$HOST serves this build (sw.js $built)" || { echo "FAIL: https://$HOST/sw.js is $live, the build is $built"; exit 1; }
fi
