#!/usr/bin/env bash
# Render the Empower Smart Tools mark (icons/logo.svg) to the PNG sizes Chrome wants:
# charcoal icon-N.png (default) and green icon-ready-N.png (on an order's Assets list),
# plus logo-ready.svg, the green mark the side panel shows on an Assets list,
# and assets/app-logo-256.png for the README.
set -euo pipefail
cd "$(dirname "$0")/.."
green=icons/logo-ready.svg
# The green tile is today's: black mark, no edge (the charcoal tile's edge is only there so it shows on black).
sed -e 's/#52525B/#86EFAC/' -e 's/#18181B/#16A34A/' \
    -e 's/fill="#FFFFFF"/fill="#000000"/g' \
    -e 's#<rect x="3" y="3" width="250" height="250" rx="53" fill="url(\#g)" stroke="\#71717A" stroke-width="6"/>#<rect width="256" height="256" rx="56" fill="url(\#g)"/>#' \
    -e 's/on a charcoal tile with a white mark (thin edge so it shows on black)/on a green tile/' icons/logo.svg > "$green"
{ grep -q '#16A34A' "$green" && ! grep -q 'FFFFFF\|stroke="#71717A"' "$green"; } \
  || { echo "logo.svg colours or tile changed; update make-icons.sh" >&2; exit 1; }
for n in 16 32 48 128; do rsvg-convert -w "$n" -h "$n" icons/logo.svg -o "icons/icon-$n.png"; done
for n in 16 32; do rsvg-convert -w "$n" -h "$n" "$green" -o "icons/icon-ready-$n.png"; done
rsvg-convert -w 256 -h 256 icons/logo.svg -o assets/app-logo-256.png
echo "icons/icon-{16,32,48,128}.png icons/icon-ready-{16,32}.png icons/logo-ready.svg assets/app-logo-256.png"
