#!/usr/bin/env bash
# Render the grey Empower Smart Tools mark (icons/logo.svg) to the PNG sizes Chrome wants.
set -euo pipefail
cd "$(dirname "$0")/.."
for n in 16 32 48 128; do rsvg-convert -w "$n" -h "$n" icons/logo.svg -o "icons/icon-$n.png"; done
echo "icons/icon-{16,32,48,128}.png"
