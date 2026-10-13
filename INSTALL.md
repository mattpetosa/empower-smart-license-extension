# Empower Smart License Extension

Turns a Waters Salesforce order's **Assets** list into the License Cleaner's
**Simple CSV for Licensing Portal** (and the Detailed XLSX). Everything happens in
your browser. The extension makes no network requests, so serials never leave your PC.

## Install (one time)

1. Unzip `EmpowerSmartLicenseExtension_vX.Y.Z.zip` somewhere permanent, e.g.
   `Documents\EmpowerSmartLicenseExtension`. Chrome loads it from that folder
   every time, so don't delete it.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right). If the switch is greyed out, your Chrome
   is managed and blocks this; ask your IT admin.
4. Click **Load unpacked** and pick the unzipped folder (the one with `manifest.json` in it).
5. Pin it: puzzle-piece icon in the toolbar → pin **Empower Smart License Extension**.

## Use

1. In Salesforce, open the order → **Related** → **Assets** → **View All**.
2. The extension's icon turns green when you're on an Assets list (grey everywhere else). Click it. A side panel opens;
   its logo is green too while the current tab can be read.
3. Click **Read assets from this page**. Rows that look like licenses are ticked;
   hardware is listed under **Other assets**. Tick or untick anything that's wrong.
4. Check Company / Order Number / Support Plan ID (filled in from the page; the Support
   Plan ID is the serial of the **S/W Benefits Info** row) and add Sold To if you want it
   in the file name.
5. Click **Download Simple CSV for Licensing Portal** and upload it to the Waters
   Licensing Portal. **Download Detailed XLSX** gives the categorized workbook.

**Orders with several environments** (several S/W Benefits Info rows, e.g. Prod/Dev/Test):
each environment gets a colour and a number. Nothing is pre-ticked, because Salesforce
doesn't say which license belongs where: click **1**, **2** or **3** on each license to
put it in that environment (click again to take it out). A yellow line counts the likely
licenses not placed yet. Optionally name each environment (e.g. Prod); the name goes in
the file name. Each environment has its own download buttons.

**Download all** (bottom of the panel): **Select all licenses** ticks every likely license
(click again to clear them). **All Simple CSV** / **All Detailed XLSX** download that format
for every environment that has licenses. Select all only shows on single-environment orders:
with several, each license still needs its environment number. Chrome may ask once to allow
this extension to download multiple files; click Allow.

## Update

Replace the folder's contents with the new zip's, then click the reload icon on
the extension's card in `chrome://extensions`.
