/* Empower Smart License Extension: which Salesforce asset rows look like licenses.
   It only sets the pre-tick in the review list; the person reviewing has the final say. */
(function (root) {
  'use strict';
  const LICENSE_RE = /licen[cs]e|\blics?\b/i;
  // Empower options ("Emp Enterprise Sys Suitability Opt 3 YR"), judged on the product
  // name only: software media rows carry the Asset Name "EMPOWER3 OPTION" too.
  const OPTION_RE = /\b(?:option|opt)\b/i, EMPOWER_RE = /\bemp(?:ower)?\b/i, MEDIA_RE = /^\s*S\/W\s*,/i;
  // Hardware and OS kits that ship with a (Windows) license: "Kit, ... w/ license",
  // "LTSC2024w/lic", "H/W LAC/E 17 LTSC2021". No word boundary on LTSC: "LTSC2024w".
  const NOT_LICENSE_RE = /w\/\s*lic|\bkit\b|\bh\/w\b|ltsc|\bdisk\b|operat\w*\s+sys/i;
  // One "S/W Benefits Info" row per environment; its serial is the Support Plan ID.
  const SUPPORT_ROW_RE = /s\/w\s+benefits?\s+info|benefit\s+sheet/i;

  function supportIdOf(row) {
    const text = `${row.assetName || ''} ${row.productName || ''}`;
    return SUPPORT_ROW_RE.test(text) ? String(row.serial || '').trim() : '';
  }

  function looksLikeLicense(row) {
    const text = `${row.assetName || ''} ${row.productName || ''}`, product = row.productName || '';
    if (SUPPORT_ROW_RE.test(text) || NOT_LICENSE_RE.test(text)) return false;
    return LICENSE_RE.test(text) || (OPTION_RE.test(product) && EMPOWER_RE.test(product) && !MEDIA_RE.test(product));
  }

  const api = { looksLikeLicense, supportIdOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ESLE_detect = api;
})(typeof window !== 'undefined' ? window : globalThis);
