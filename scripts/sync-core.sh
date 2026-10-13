#!/usr/bin/env bash
# Copy the License Cleaner engine in, byte for byte, and record where it came from.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
site="${ESLC_SITE:-$HOME/licenses-site}"
src="$site/offline/core.js"
[ -f "$src" ] || { echo "No License Cleaner checkout at $site" >&2; exit 1; }
if [ -n "$(git -C "$site" status --porcelain -- offline/core.js)" ]; then
  echo "$src has uncommitted changes; commit them in licenses-site first" >&2; exit 1
fi
mkdir -p "$here/vendor"
cp "$src" "$here/vendor/core.js"
{
  echo "source=licenses-site/offline/core.js"
  echo "source_commit=$(git -C "$site" rev-parse HEAD)"
  echo "sha256=$(sha256sum "$here/vendor/core.js" | cut -d' ' -f1)"
} > "$here/vendor/CORE_SOURCE"
echo "vendor/core.js <- licenses-site $(git -C "$site" rev-parse --short HEAD)"
