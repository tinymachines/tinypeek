#!/usr/bin/env bash
# The DNS record for tinypeek.tinymachines.ai on the box's BIND (both views: the public zone answers the world, the
# internal one the LAN). Run with sudo, on the owner's word. Safe to run twice: it refuses when the record is already
# there, and it checks each zone before reloading. It adds one line after the `www` record in each file, with the
# same address `www` has there (so no address is written in this repository), and bumps the serial (YYYYMMDDnn).
#   ./scripts/site-dns.sh
set -euo pipefail
NAME=tinypeek
ZONE=tinymachines.ai
FILES=(/etc/bind/zones/$ZONE.zone /etc/bind/zones/internal/$ZONE.zone)
for z in "${FILES[@]}"; do
  [[ -f "$z" ]] || { echo "refusing: $z is not there"; exit 1; }
  if grep -qE "^$NAME[[:space:]]" "$z"; then echo "refusing: $z already has a record for $NAME"; exit 1; fi
  grep -qE '^www[[:space:]]+IN[[:space:]]+A[[:space:]]+[0-9.]+' "$z" || { echo "refusing: $z has no www record to put $NAME beside"; exit 1; }
done
today=$(date +%Y%m%d)
for z in "${FILES[@]}"; do
  ip=$(grep -E '^www[[:space:]]+IN[[:space:]]+A[[:space:]]+' "$z" | awk '{print $4}' | head -1)
  old=$(grep -oE '[0-9]{10}[[:space:]]*$' "$z" | head -1 | tr -d '[:space:]')
  [[ -n "$old" ]] || { echo "refusing: no serial line found in $z"; exit 1; }
  if [[ "${old:0:8}" == "$today" ]]; then new=$((old + 1)); else new="${today}01"; fi
  sudo cp "$z" "$z.bak-$(date +%Y%m%d-%H%M%S)"
  sudo sed -i -E "s/^([[:space:]]*)$old([[:space:]]*)$/\1$new\2/; s/^(www[[:space:]]+IN[[:space:]]+A[[:space:]]+[0-9.]+)[[:space:]]*$/\1\n$NAME\t\tIN\tA\t$ip/" "$z"
  sudo named-checkzone "$ZONE" "$z" >/dev/null || { echo "FAIL: $z does not check; its .bak copy is beside it"; exit 1; }
  echo "$z: $NAME IN A $ip, serial $old -> $new"
done
sudo rndc reload
sleep 1
echo "this box answers: $(dig +short $NAME.$ZONE | tail -1)   (www: $(dig +short www.$ZONE | tail -1))"
echo "ok. Next: ./scripts/site-setup.sh"
