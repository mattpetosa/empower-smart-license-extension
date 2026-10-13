/* Empower Smart License Extension: read an order's Assets list from Salesforce.
   The side panel injects this into the Salesforce tab's isolated world, where
   Lightning's patched DOM methods (synthetic shadow) don't apply, then calls
   ESLE_scrape.readAssets(). Elements are found by role / aria-label / data-label,
   never by Lightning's generated class names. */
(function (root) {
  'use strict';
  const NEEDED = ['Asset Name', 'Serial Number', 'Product Name'];
  const ASSETS_URL_RE = /\/lightning\/r\/(?:[A-Za-z0-9_]+\/)?[A-Za-z0-9]{15,18}\/related\/Assets__r\/view/;
  const COUNT_RE = /(\d[\d,]*)(\+)?\s+items?\b/i;
  const SKIP_TAGS = new Set(['BUTTON', 'INPUT', 'LABEL', 'STYLE', 'SCRIPT', 'TEMPLATE']);

  // Parent, stepping out of shadow roots to their host.
  const up = n => n.parentElement || (n.parentNode && n.parentNode.host) || null;

  function deepQueryAll(start, selector) {
    const out = [];
    const visit = node => {
      out.push(...node.querySelectorAll(selector));
      for (const el of node.querySelectorAll('*')) if (el.shadowRoot) visit(el.shadowRoot);
    };
    visit(start);
    return out;
  }

  function isShown(el) {
    if (typeof el.checkVisibility === 'function') return el.checkVisibility();
    for (let n = el; n; n = up(n)) {
      if (n.hidden || n.getAttribute('aria-hidden') === 'true') return false;
      if ((n.getAttribute('style') || '').replace(/\s/g, '').includes('display:none')) return false;
      const c = n.classList;
      if (c.contains('windowViewMode-minimized') || c.contains('slds-hide')) return false;
      if (c.contains('tabContent') && !c.contains('active')) return false;
    }
    return true;
  }

  // Rendered text: skips buttons and assistive text ("Preview"), follows shadow roots and slots.
  function deepText(node) {
    if (node.nodeType === 3) return node.nodeValue;
    if (node.nodeType === 1) {
      if (SKIP_TAGS.has(node.tagName) || node.classList.contains('slds-assistive-text')) return '';
      if (node.tagName === 'SLOT') {
        const assigned = node.assignedNodes();
        return (assigned.length ? assigned : [...node.childNodes]).map(deepText).join('');
      }
      if (node.shadowRoot) return deepText(node.shadowRoot);
    } else if (node.nodeType !== 11) return '';
    return [...node.childNodes].map(deepText).join('');
  }
  const cellText = cell => deepText(cell).replace(/\s+/g, ' ').trim();

  const rowEls = table => [...table.querySelectorAll('tbody tr[data-row-key-value]')].filter(tr => tr.getAttribute('data-row-key-value') !== 'HEADER');
  const headerLabels = table => [...table.querySelectorAll('th[role="columnheader"][aria-label]')].map(th => th.getAttribute('aria-label').trim());

  function pickGrid(doc) {
    const shown = deepQueryAll(doc, 'table[role="grid"][aria-label="Assets"]').filter(isShown);
    if (!shown.length) return null;
    return shown.reduce((a, b) => (rowEls(b).length > rowEls(a).length ? b : a));
  }

  function readRow(tr) {
    const by = {};
    for (const cell of tr.children) {
      const label = cell.getAttribute('data-label');
      if (label) by[label] = cellText(cell);
    }
    return {
      key: tr.getAttribute('data-row-key-value'),
      assetName: by['Asset Name'] || '',
      serial: by['Serial Number'] || '',
      productName: by['Product Name'] || '',
      accountName: by['Account Name'] || '',
      qty: by['Quantity'] || '',
    };
  }

  // Nearest "N items" status line above the grid (the hidden preview has its own).
  function readItemCount(table) {
    for (let n = up(table); n; n = up(n)) {
      for (const el of n.querySelectorAll('.countSortedByFilteredBy, force-list-view-manager-status-info')) {
        const m = COUNT_RE.exec(el.textContent);
        if (m) return { count: parseInt(m[1].replace(/,/g, ''), 10), plus: !!m[2] };
      }
    }
    return null;
  }

  // Breadcrumb "Orders > 02000001" above the grid.
  function readOrderNumber(table) {
    for (let n = up(table); n; n = up(n)) {
      const crumbs = [...n.querySelectorAll('.slds-breadcrumb a')];
      if (!crumbs.length) continue;
      const i = crumbs.findIndex(a => a.textContent.trim() === 'Orders' || (a.getAttribute('href') || '').includes('/lightning/o/Order/'));
      return i >= 0 && crumbs[i + 1] ? crumbs[i + 1].textContent.trim() : '';
    }
    return '';
  }

  function mostCommon(values) {
    const counts = new Map();
    for (const v of values) if (v) counts.set(v, (counts.get(v) || 0) + 1);
    let best = '', n = 0;
    for (const [v, c] of counts) if (c > n) { best = v; n = c; }
    return best;
  }

  async function readAssets(opts = {}) {
    const doc = opts.doc || document;
    const url = opts.url || doc.location.href;
    const sleep = opts.sleep || (ms => new Promise(r => setTimeout(r, ms)));
    const waitMs = opts.waitMs ?? 1200, maxRounds = opts.maxRounds ?? 60;
    if (!ASSETS_URL_RE.test(url)) return { error: 'not-assets-page' };
    let table = pickGrid(doc);
    if (!table) return { error: 'no-grid' };
    const labels = headerLabels(table);
    const missingColumns = NEEDED.filter(l => !labels.includes(l));
    if (missingColumns.length) return { error: 'missing-columns', missingColumns };

    // Accumulate by row key: Lightning may drop earlier rows from the DOM while scrolling.
    const rows = new Map();
    const collect = () => { for (const tr of rowEls(table)) { const r = readRow(tr); if (r.key && !rows.has(r.key)) rows.set(r.key, r); } };
    collect();
    let stable = 0;
    for (let round = 0; round < maxRounds && stable < 2; round++) {
      const target = readItemCount(table);
      if (target && !target.plus && rows.size >= target.count) break;
      const before = rows.size;
      const scroller = table.closest('.slds-scrollable_y') || doc.scrollingElement || doc.documentElement;
      scroller.scrollTop = scroller.scrollHeight;
      scroller.dispatchEvent(new doc.defaultView.Event('scroll'));
      await sleep(waitMs);
      if (!table.isConnected) table = pickGrid(doc) || table;
      collect();
      stable = rows.size > before ? 0 : stable + 1;
    }
    const expected = readItemCount(table);
    const list = [...rows.values()];
    return {
      rows: list,
      expected,
      // "50+ items" still showing means Salesforce never confirmed the end of the list.
      complete: !expected || (!expected.plus && list.length >= expected.count),
      accountName: mostCommon(list.map(r => r.accountName)),
      orderNumber: readOrderNumber(table),
    };
  }

  const api = { readAssets, pickGrid, headerLabels, readRow, readItemCount, readOrderNumber, cellText, isShown, ASSETS_URL_RE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ESLE_scrape = api;
})(typeof window !== 'undefined' ? window : globalThis);
