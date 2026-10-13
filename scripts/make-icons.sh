#!/usr/bin/env bash
# Render the Empower Smart Tools mark (icons/logo.svg) to the PNG sizes Chrome wants:
# grey icon-N.png (default) and green icon-ready-N.png (on an order's Assets list),
# plus logo-ready.svg, the green mark the side panel shows on an Assets list.
set -euo pipefail
cd "$(dirname "$0")/.."
green=icons/logo-ready.svg
sed -e 's/#E4E4E7/#86EFAC/' -e 's/#9CA3AF/#16A34A/' -e 's/on a grey tile/on a green tile/' icons/logo.svg > "$green"
grep -q '#16A34A' "$green" || { echo "logo.svg tile colours changed; update make-icons.sh" >&2; exit 1; }
for n in 16 32 48 128; do rsvg-convert -w "$n" -h "$n" icons/logo.svg -o "icons/icon-$n.png"; done
for n in 16 32; do rsvg-convert -w "$n" -h "$n" "$green" -o "icons/icon-ready-$n.png"; done
echo "icons/icon-{16,32,48,128}.png icons/icon-ready-{16,32}.png icons/logo-ready.svg"
