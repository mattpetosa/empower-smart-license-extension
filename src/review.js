/* Empower Smart License Extension: which environment each asset row goes in.
   An order can cover several environments (e.g. Prod/Dev/Test), one per Support Plan
   ID. With one environment, likely licenses start in it; with several, nothing does,
   because the Assets list doesn't say which license belongs where. */
(function (root) {
  'use strict';
  const { looksLikeLicense, supportIdOf } = root.ESLE_detect || require('./detect.js');

  // [{ id, supportId }], sorted by Support ID; one environment with no Support ID if none.
  function environmentsOf(rows) {
    const ids = [...new Set(rows.map(supportIdOf).filter(Boolean))].sort();
    return ids.length ? ids.map(id => ({ id, supportId: id })) : [{ id: '', supportId: '' }];
  }

  // The rows the person reviews: everything except the Support ID rows.
  const reviewRows = rows => rows.filter(r => !supportIdOf(r));

  // decided: key -> environment id, or null for "in none". Returns an id or null.
  function envOf(row, envs, decided) {
    if (decided.has(row.key)) {
      const id = decided.get(row.key);
      return envs.some(e => e.id === id) ? id : null;
    }
    return envs.length === 1 && looksLikeLicense(row) ? envs[0].id : null;
  }

  const rowsIn = (rows, envs, decided, id) => rows.filter(r => envOf(r, envs, decided) === id);
  const unassignedLikely = (rows, envs, decided) => rows.filter(r => looksLikeLicense(r) && envOf(r, envs, decided) === null).length;

  const api = { environmentsOf, reviewRows, envOf, rowsIn, unassignedLikely };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ESLE_review = api;
})(typeof window !== 'undefined' ? window : globalThis);
