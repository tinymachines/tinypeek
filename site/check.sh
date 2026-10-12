#!/usr/bin/env bash
# The site's gate: the lens copied in, the app typechecked and built, the build served and driven in headless
# Chrome (scripts/check-site.ts). Must end in ALL OK; it then records the repository commit it passed on in
# out/check-ok, which the deploy refuses without.
#   ./check.sh
set -euo pipefail
cd "$(dirname "$0")"
PORT=${PORT:-4411}
python3 - "$PORT" <<'PY' || { echo "refusing: port $PORT is already held; set PORT to another" >&2; exit 1; }
import socket, sys
s = socket.socket(); s.bind(("127.0.0.1", int(sys.argv[1]))); s.close()
PY
rm -f out/check-ok
bun install --silent
bun run build
bun run scripts/serve.ts dist "$PORT" &
pid=$!
trap 'kill $pid 2>/dev/null || true' EXIT
sleep 1
bun run scripts/check-site.ts "http://127.0.0.1:$PORT"
mkdir -p out
git rev-parse --short HEAD > out/check-ok
echo "check: ALL OK on $(cat out/check-ok)"
