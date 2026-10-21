# Release history

Newest first. Downloads are on the [Releases](https://github.com/mattpetosa/empower-smart-license-extension/releases) page.

## v0.3.3 (2026-10-21)

### Changed
- **New charcoal icon with a white logo.** The License Extension is the only Smart Tool that installs into Chrome, so it now has its own dark tile. The toolbar icon is charcoal on most pages and still turns **green** on an order's Assets list.

## v0.3.2 (2026-10-16)

First public release.

### Changed
- **Download all licenses on this page works in one click.** The **Simple CSV** and **Detailed XLSX** buttons at the bottom of the panel are always available. They read the Assets list themselves and download every likely license in one file, whatever is ticked. On an order with several environments, that file covers the whole order; use each environment's own buttons for per-environment files.

## v0.3.0 (2026-10-13)

### Added
- **The side panel's logo turns green with the toolbar icon** while the current tab is an order's Assets list.

## v0.2.0 (2026-10-13)

### Added
- **Orders with several environments** (Prod / Dev / Test). The Support Plan ID comes from the **S/W Benefits Info** row. With several of them, each environment gets a colour and a number. Nothing is pre-ticked, because Salesforce doesn't say which license belongs where: click **1**, **2** or **3** on each license. A warning counts the likely licenses not placed yet, and each environment has its own downloads. An optional environment name (e.g. Prod) goes in the file name.

### Changed
- **Empower options** ("… Option 3 YR") count as licenses. Software media, training and the benefit sheet rows don't.
- **Assets are listed by product name**, so an environment's copies sit together.

## v0.1.1 (2026-10-13)

### Added
- **The toolbar icon turns green on an order's Assets list** and stays grey everywhere else, with a hint naming the page to open.

## v0.1.0 (2026-10-12)

First version: reads an order's Assets list, pre-ticks the licenses for review, and downloads the License Cleaner's Simple CSV for Licensing Portal and Detailed XLSX, entirely in the browser.
