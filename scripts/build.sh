#!/usr/bin/env bash
# Test, then package the extension as dist/EmpowerSmartLicenseExtension_vX.Y.Z.zip.
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(node -p "require('./manifest.json').version")
[ "$version" = "$(node -p "require('./package.json').version")" ] || { echo "manifest.json and package.json versions differ" >&2; exit 1; }
npm test
npm run smoke
name="EmpowerSmartLicenseExtension_v$version"
rm -rf "dist/$name" "dist/$name.zip"
mkdir -p "dist/$name"
cp -r manifest.json src vendor icons INSTALL.md "dist/$name/"
(cd dist && zip -qr "$name.zip" "$name")
echo "dist/$name.zip"
