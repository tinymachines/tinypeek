#!/usr/bin/env bash
# tinypeek.tinymachines.ai on the box that serves it: the nginx site and its certificate. Run with sudo. Safe to
# run twice. It refuses until the name resolves to the same address as tinymachines.ai: the DNS record is in the
# tinymachines.ai zone, which this repository does not describe; whoever runs the zone adds the A record first.
# Set CERTBOT_EMAIL to the address the certificate's notices go to.
#   CERTBOT_EMAIL=... ./scripts/site-setup.sh
set -euo pipefail
HOST=tinypeek.tinymachines.ai
ROOT=/var/www/$HOST
HERE=$(cd "$(dirname "$0")/.." && pwd)
want=$(dig +short tinymachines.ai | tail -1)
have=$(dig +short "$HOST" | tail -1)
if [[ -z "$have" ]]; then echo "refusing: $HOST does not resolve yet. It needs an A record in the tinymachines.ai zone, the same address as tinymachines.ai."; exit 1; fi
if [[ "$have" != "$want" ]]; then echo "refusing: $HOST resolves to $have, not where tinymachines.ai is ($want)."; exit 1; fi
[[ -n "${CERTBOT_EMAIL:-}" ]] || { echo "refusing: set CERTBOT_EMAIL to the address the certificate's notices go to"; exit 1; }
if [[ ! -d "$ROOT" ]]; then sudo mkdir -p "$ROOT"; sudo chown "$USER":"$USER" "$ROOT"; echo "made $ROOT (owned by $USER, so ./scripts/site-deploy.sh needs no sudo)"; fi
CONF=/etc/nginx/sites-available/$HOST.conf
if [[ ! -f "$CONF" ]]; then
  sudo tee "$CONF" >/dev/null <<NGINX
# tinypeek.tinymachines.ai: the tm:// protocol's site (repository tinymachines/tinypeek, site/). Static files; the
# app's shell for any path without a file (the app routes); the lens at /lens/ as files only; nothing proxied.
server {
    server_name $HOST;
    access_log /var/log/nginx/$HOST.access.log;
    error_log  /var/log/nginx/$HOST.error.log;
    root $ROOT;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    # (no types{} block here: one at server level replaces the whole mime table)
    # the shell, the worker and the manifest change with every deploy: never cached by the browser
    location = /index.html { add_header Cache-Control "no-cache" always; }
    location = /sw.js { add_header Cache-Control "no-cache" always; }
    location = /manifest.webmanifest { types { application/manifest+json webmanifest; } add_header Cache-Control "no-cache" always; }
    location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable" always; }
    # the lens reads the namespace itself and is served as it is; a missing file there is a miss, never the shell
    location /lens/ { try_files \$uri \$uri/ =404; add_header Cache-Control "no-cache" always; }
    location / { try_files \$uri \$uri/ /index.html; }
    listen 80;
    listen [::]:80;
}
NGINX
  echo "wrote $CONF"
fi
if [[ -L /etc/nginx/sites-enabled/$HOST.conf || ! -e /etc/nginx/sites-enabled/$HOST.conf ]]; then sudo ln -sfn "$CONF" /etc/nginx/sites-enabled/$HOST.conf; else sudo cp "$CONF" /etc/nginx/sites-enabled/$HOST.conf; fi
sudo nginx -t
sudo systemctl reload nginx
if [[ ! -d /etc/letsencrypt/live/$HOST ]]; then sudo certbot --nginx -d "$HOST" --non-interactive --agree-tos --redirect -m "$CERTBOT_EMAIL"; fi
if [[ ! -L /etc/nginx/sites-enabled/$HOST.conf ]]; then diff -q "$CONF" /etc/nginx/sites-enabled/$HOST.conf >/dev/null || sudo cp /etc/nginx/sites-enabled/$HOST.conf "$CONF"; fi
echo "ok: https://$HOST serves $ROOT. Next: $HERE/scripts/site-deploy.sh"
