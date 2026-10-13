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
2. Click the extension's icon. A side panel opens.
3. Click **Read assets from this page**. Rows that look like licenses are ticked;
   hardware is listed under **Other assets**. Tick or untick anything that's wrong.
4. Check the Company / Order Number fields (filled in from the page) and add the
   Support Plan ID / Sold To if you want them in the file name.
5. Click **Download Simple CSV for Licensing Portal** and upload it to the Waters
   Licensing Portal. **Download Detailed XLSX** gives the categorized workbook.

## Update

Replace the folder's contents with the new zip's, then click the reload icon on
the extension's card in `chrome://extensions`.
