/* Empower Smart License Extension: what the toolbar icon shows for a tab.
   Green on an order's Assets list (the page Read works on), grey everywhere else.
   Chrome only shows this extension the address of Waters Salesforce tabs, so any
   other tab arrives with no url and stays grey. */
(function (root) {
  'use strict';
  const { ASSETS_URL_RE } = root.ESLE_scrape || require('./scrape-core.js');
  const icons = name => ({ 16: `/icons/${name}-16.png`, 32: `/icons/${name}-32.png` });
  const READY = { ready: true, icon: icons('icon-ready'), title: "Empower Smart License Extension: ready. Click to read this order's licenses." };
  const NOT_READY = { ready: false, icon: icons('icon'), title: "Empower Smart License Extension: open an order's Assets list (Related → Assets → View All)." };

  function actionState(url) {
    return url && ASSETS_URL_RE.test(url) ? READY : NOT_READY;
  }

  const api = { actionState };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ESLE_status = api;
})(typeof window !== 'undefined' ? window : globalThis);
