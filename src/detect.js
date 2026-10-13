/* Empower Smart License Extension: which Salesforce asset rows look like licenses.
   It only sets the pre-tick in the review list; the person reviewing has the final say. */
(function (root) {
  'use strict';
  const LICENSE_RE = /licen[cs]e|\blics?\b/i;
  // Hardware and OS kits that ship with a (Windows) license: "Kit, ... w/ license",
  // "LTSC2024w/lic", "H/W LAC/E 17 LTSC2021". No word boundary on LTSC: "LTSC2024w".
  const NOT_LICENSE_RE = /w\/\s*lic|\bkit\b|\bh\/w\b|ltsc|\bdisk\b|operat\w*\s+sys/i;

  function looksLikeLicense(row) {
    const text = `${row.assetName || ''} ${row.productName || ''}`;
    return LICENSE_RE.test(text) && !NOT_LICENSE_RE.test(text);
  }

  const api = { looksLikeLicense };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ESLE_detect = api;
})(typeof window !== 'undefined' ? window : globalThis);
