/* Empower Smart License Extension: ticked asset rows -> License Cleaner result -> files.
   All cleanup rules live in vendor/core.js (the License Cleaner's own engine);
   this file only shapes the rows into a grid it already understands. */
(function (root) {
  'use strict';
  const ESLC = (typeof module !== 'undefined' && module.exports) ? require('../vendor/core.js') : root.ESLC;
  const FIELD_ORDER = ['company', 'support_id', 'order_number', 'sold_to'];
  const FIELD_LABELS = { company: 'Company', support_id: 'Support ID', order_number: 'Order Number', sold_to: 'Sold To' };
  const licenseName = r => (r.productName || r.assetName || '').trim();
  const describe = r => `${licenseName(r) || '(no name)'} | ${String(r.serial || '').trim() || '(no serial)'}`;

  const HEADER = { r: 1, cells: [[1, 'License'], [2, 'Qty'], [3, 'Serial No']] };
  const ROW_OF_RAW = /^Assets!(?:[A-Z]+)?(\d+):/;

  // One sheet per row: core.js re-detects header rows as it goes, so a ticked row that
  // merely looks like a header ("Serial Port Option") must not re-map the rows after it.
  function rowsToSheets(rows) {
    return rows.map((row, i) => {
      const cells = [];
      const name = licenseName(row), qty = String(row.qty || '').trim(), serial = String(row.serial || '').trim();
      if (name) cells.push([1, name]);
      if (qty) cells.push([2, qty]);
      if (serial) cells.push([3, serial]);
      return { name: 'Assets', rows: [HEADER, { r: i + 2, cells }] };
    });
  }

  function cleanAssets(rows, opts = {}) {
    const withSerial = rows.filter(r => String(r.serial || '').trim());
    const res = ESLC.parseGrid(rowsToSheets(withSerial));
    // Anything the Cleaner neither kept nor explained must not vanish silently. Every
    // line core.js reports starts "Assets!<row>:" (or "Assets!A<row>:"), so account by row.
    const seen = new Set();
    for (const raw of [...res.licenses.map(l => l.raw), ...res.removed.map(x => x.raw), ...res.unparsed]) {
      const m = ROW_OF_RAW.exec(raw);
      if (m) seen.add(Number(m[1]));
    }
    withSerial.forEach((r, i) => {
      if (!seen.has(i + 2)) res.removed.push({ raw: describe(r), reason: 'Not recognized by the License Cleaner' });
    });
    for (const r of rows) if (!String(r.serial || '').trim()) res.removed.push({ raw: describe(r), reason: 'No serial number in Salesforce' });
    if (opts.removeSqt) ESLC.removeSqt(res);
    if (opts.removeZero) ESLC.removeZeroQty(res);
    return res;
  }

  const value = (fields, k) => String((fields || {})[k] || '').trim();
  const details = fields => FIELD_ORDER.filter(k => value(fields, k)).map(k => [FIELD_LABELS[k], value(fields, k)]);

  function fileNames(fields) {
    const base = ESLC.baseName(FIELD_ORDER.map(k => value(fields, k)), 'Salesforce_Assets');
    return { csv: `${base}_Simple_ESLC.csv`, xlsx: `${base}_Detailed_ESLC.xlsx` };
  }

  function buildFiles(res, fields) {
    const d = details(fields);
    return { csv: ESLC.buildCsv(res, d), xlsx: ESLC.buildWorkbook(res, d), names: fileNames(fields) };
  }

  const api = { rowsToSheets, cleanAssets, details, fileNames, buildFiles };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ESLE_engine = api;
})(typeof window !== 'undefined' ? window : globalThis);
