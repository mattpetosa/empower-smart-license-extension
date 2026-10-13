# Empower Smart License Extension

Chrome (MV3) side-panel extension: on a Waters Salesforce order's Assets list
(`/lightning/r/Order/<id>/related/Assets__r/view`) it reads the asset rows,
pre-ticks the licenses for review, and runs the Empower Smart License Cleaner's
own engine (`vendor/core.js`, synced from `the License Cleaner's offline/core.js`) to
produce the Simple CSV for Licensing Portal and the Detailed XLSX. No network access;
permissions are `sidePanel`, `scripting` and `https://waters.lightning.force.com/*`.

- `npm test`: unit tests (jsdom) incl. vendor drift check
- `npm run smoke`: real Chromium + unpacked extension against the synthetic fixture
- `scripts/sync-core.sh`: pull the Cleaner engine in after a rule change there (then bump the version)
- `scripts/build.sh`: test + `dist/EmpowerSmartLicenseExtension_vX.Y.Z.zip`

Fixtures are synthetic. Never commit a real Salesforce page (`real-pages/` is gitignored).
