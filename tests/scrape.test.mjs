import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { assetsPageHtml, rowHtml, gridHtml, EXAMPLE_ROWS, VISIBLE_COLUMNS, ASSETS_URL } from './fixtures/build-fixture.mjs';
const S = createRequire(import.meta.url)('../src/scrape-core.js');

// jsdom has no layout, so force the ancestor-based visibility check.
function load(html, url = ASSETS_URL) {
  const dom = new JSDOM(html, { url });
  dom.window.Element.prototype.checkVisibility = undefined;
  return dom.window.document;
}
const fast = { waitMs: 0, sleep: () => new Promise(r => setTimeout(r, 0)) };
const visibleScroller = doc => doc.querySelector('.forceRelatedListDesktop .slds-scrollable_y');
const manyRows = n => Array.from({ length: n }, (_, i) => ({ ...EXAMPLE_ROWS[i % 23], key: `02iMANY${String(i).padStart(11, '0')}` }));

test('reads the visible 23-row grid, not the hidden 6-row preview', async () => {
  const out = await S.readAssets({ doc: load(assetsPageHtml()), ...fast });
  assert.equal(out.rows.length, 23);
  assert.equal(out.complete, true);
  assert.deepEqual(out.expected, { count: 23, plus: false });
});

test('cell text is clean: no "Preview" button text, account + order picked up', async () => {
  const out = await S.readAssets({ doc: load(assetsPageHtml()), ...fast });
  assert.deepEqual(out.rows[1], { key: EXAMPLE_ROWS[1].key, assetName: 'EMPOWER3 Q LICENSE', serial: 'DD0000000000123456', productName: 'License, Empower SQT for software 1 year', accountName: 'Contoso Labs Inc', qty: '' });
  assert.equal(out.accountName, 'Contoso Labs Inc');
  assert.equal(out.orderNumber, '02000001');
});

test('Quantity column is read when the list view shows it', async () => {
  const rows = EXAMPLE_ROWS.map((r, i) => ({ ...r, qty: i === 1 ? '5' : '1' }));
  const out = await S.readAssets({ doc: load(assetsPageHtml({ rows, columns: [...VISIBLE_COLUMNS, 'Quantity'] })), ...fast });
  assert.equal(out.rows[1].qty, '5');
});

test('Order record page (preview list) is refused, not read as 6 of 23', async () => {
  const out = await S.readAssets({ doc: load(assetsPageHtml(), 'https://waters.lightning.force.com/lightning/r/Order/801000000000001AAA/view'), ...fast });
  assert.deepEqual(out, { error: 'not-assets-page' });
});

test('Assets URL but no grid on the page', async () => {
  const out = await S.readAssets({ doc: load('<!doctype html><body><h1>Loading…</h1></body>'), ...fast });
  assert.deepEqual(out, { error: 'no-grid' });
});

test('missing Serial Number column is named', async () => {
  const cols = VISIBLE_COLUMNS.filter(c => c !== 'Serial Number');
  const out = await S.readAssets({ doc: load(assetsPageHtml({ columns: cols })), ...fast });
  assert.deepEqual(out, { error: 'missing-columns', missingColumns: ['Serial Number'] });
});

test('scrolls until every row the header promises has loaded', async () => {
  const doc = load(assetsPageHtml({ rendered: 10 }));
  const scroller = visibleScroller(doc), tbody = scroller.querySelector('tbody');
  let next = 10;
  scroller.addEventListener('scroll', () => {
    EXAMPLE_ROWS.slice(next, next + 10).forEach((r, i) => tbody.insertAdjacentHTML('beforeend', rowHtml(r, VISIBLE_COLUMNS, next + i + 1)));
    next = Math.min(next + 10, 23);
  });
  const out = await S.readAssets({ doc, ...fast });
  assert.equal(out.rows.length, 23);
  assert.equal(out.complete, true);
});

test('rows that leave the DOM while scrolling are still collected', async () => {
  const doc = load(assetsPageHtml({ rendered: 10 }));
  const scroller = visibleScroller(doc), tbody = scroller.querySelector('tbody');
  let next = 10;
  scroller.addEventListener('scroll', () => {
    tbody.innerHTML = EXAMPLE_ROWS.slice(next, next + 10).map((r, i) => rowHtml(r, VISIBLE_COLUMNS, next + i + 1)).join('');
    next = Math.min(next + 10, 23);
  });
  const out = await S.readAssets({ doc, ...fast });
  assert.deepEqual(out.rows.map(r => r.key), EXAMPLE_ROWS.map(r => r.key));
});

function lazyFifties(total, { exactWhenDone }) {
  const rows = manyRows(total);
  const doc = load(assetsPageHtml({ rows, rendered: 25, itemCount: '50+ items' }));
  const scroller = visibleScroller(doc), tbody = scroller.querySelector('tbody');
  let next = 25;
  scroller.addEventListener('scroll', () => {
    rows.slice(next, next + 25).forEach((r, i) => tbody.insertAdjacentHTML('beforeend', rowHtml(r, VISIBLE_COLUMNS, next + i + 1)));
    next = Math.min(next + 25, total);
    // Lightning swaps "50+ items" for the exact count once the last page has loaded.
    if (exactWhenDone && next === total) doc.querySelector('.forceRelatedListDesktop .countSortedByFilteredBy').textContent = `${total} items • Sorted by Product Name •`;
  });
  return doc;
}

test('"50+ items" keeps scrolling; exact count shown at the end means complete', async () => {
  const out = await S.readAssets({ doc: lazyFifties(55, { exactWhenDone: true }), ...fast });
  assert.equal(out.rows.length, 55);
  assert.deepEqual(out.expected, { count: 55, plus: false });
  assert.equal(out.complete, true);
});

test('"50+ items" still showing when loading stops is NOT complete', async () => {
  const out = await S.readAssets({ doc: lazyFifties(55, { exactWhenDone: false }), ...fast });
  assert.equal(out.rows.length, 55);
  assert.deepEqual(out.expected, { count: 50, plus: true });
  assert.equal(out.complete, false);
});

test('list stuck at exactly 50 under "50+ items" is NOT complete', async () => {
  const out = await S.readAssets({ doc: lazyFifties(50, { exactWhenDone: false }), ...fast });
  assert.equal(out.rows.length, 50);
  assert.equal(out.complete, false);
});

test('list that never finishes loading is reported incomplete', async () => {
  const out = await S.readAssets({ doc: load(assetsPageHtml({ rendered: 10 })), ...fast });
  assert.equal(out.rows.length, 10);
  assert.equal(out.complete, false);
  assert.deepEqual(out.expected, { count: 23, plus: false });
});

test('grid inside an open shadow root is found, with its item count', async () => {
  const html = assetsPageHtml().replace(/<div class="slds-table_header-fixed_container[\s\S]*?<\/table><\/div><\/div>/, '<div id="host"></div>');
  const doc = load(html);
  doc.getElementById('host').attachShadow({ mode: 'open' }).innerHTML = `<div class="slds-scrollable_y">${gridHtml(EXAMPLE_ROWS)}</div>`;
  const out = await S.readAssets({ doc, ...fast });
  assert.equal(out.rows.length, 23);
  assert.equal(out.complete, true);
  assert.equal(out.orderNumber, '02000001');
});
