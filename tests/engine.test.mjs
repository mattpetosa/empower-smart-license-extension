import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { assetsPageHtml } from './fixtures/build-fixture.mjs';
const require = createRequire(import.meta.url);
const E = require('../src/engine.js');
const ESLC = require('../vendor/core.js');
const { readAssets } = require('../src/scrape-core.js');
const { looksLikeLicense } = require('../src/detect.js');

const row = (productName, serial, extra = {}) => ({ key: `k-${serial}-${productName}`, assetName: '', productName, serial, accountName: '', qty: '', ...extra });
const SQT = row('License, Empower SQT for software 1 year', 'DD0000000000123456');
const reasons = res => res.removed.map(r => r.reason);

test('rows become a License | Qty | Serial No sheet', () => {
  assert.deepEqual(E.rowsToSheets([SQT, row('Empower 3 Named User License', 'AB12345678', { qty: '5' })]), [{ name: 'Assets', rows: [
    { r: 1, cells: [[1, 'License'], [2, 'Qty'], [3, 'Serial No']] },
    { r: 2, cells: [[1, 'License, Empower SQT for software 1 year'], [3, 'DD0000000000123456']] },
    { r: 3, cells: [[1, 'Empower 3 Named User License'], [2, '5'], [3, 'AB12345678']] },
  ] }]);
});

test('Asset Name is the fallback license name', () => {
  assert.equal(E.rowsToSheets([{ ...SQT, productName: '', assetName: 'EMPOWER3 Q LICENSE' }])[0].rows[1].cells[0][1], 'EMPOWER3 Q LICENSE');
});

test('files are byte-identical to the License Cleaner run on the same grid', () => {
  const fields = { company: 'Contoso Labs Inc', support_id: '', order_number: '02000001', sold_to: '' };
  const grid = [{ name: 'Assets', rows: [{ r: 1, cells: [[1, 'License'], [2, 'Qty'], [3, 'Serial No']] }, { r: 2, cells: [[1, 'License, Empower SQT for software 1 year'], [3, 'DD0000000000123456']] }] }];
  const d = [['Company', 'Contoso Labs Inc'], ['Order Number', '02000001']];
  const ours = E.buildFiles(E.cleanAssets([SQT]), fields);
  assert.equal(ours.csv, ESLC.buildCsv(ESLC.parseGrid(grid), d));
  assert.deepEqual(ours.xlsx, ESLC.buildWorkbook(ESLC.parseGrid(grid), d));
  assert.deepEqual(ours.names, { csv: 'Contoso_Labs_Inc_02000001_Simple_ESLC.csv', xlsx: 'Contoso_Labs_Inc_02000001_Detailed_ESLC.xlsx' });
});

test('blank fields fall back to Salesforce_Assets', () => {
  assert.deepEqual(E.fileNames({}), { csv: 'Salesforce_Assets_Simple_ESLC.csv', xlsx: 'Salesforce_Assets_Detailed_ESLC.xlsx' });
});

test('Cleaner rules apply: categories, pack folded into base, -001 stripped, duplicate dropped', () => {
  const res = E.cleanAssets([
    row('Empower 3 Base License', 'AB12345678'),
    row('Empower 3 Named User License', 'AB12345678-001', { qty: '5' }),
    row('Agilent LC Instrument Control License', 'AG12345678'),
    row('Agilent LC Instrument Control License', 'AG12345678-002'),
    SQT,
  ]);
  assert.deepEqual(res.licenses.map(l => [l.category, l.serial, l.qty]), [
    ['Base License', 'AB12345678', 5],
    ['Instrument Control (3rd Party)', 'AG12345678', null],
    ['Options', 'DD0000000000123456', null],
  ]);
  assert.deepEqual(reasons(res).sort(), ['Duplicate serial', 'Included with base license (same serial)']);
});

test('ticked row with no serial is listed as skipped', () => {
  const res = E.cleanAssets([SQT, row('Empower 3 Base License', '')]);
  assert.equal(res.licenses.length, 1);
  assert.deepEqual(res.removed, [{ raw: 'Empower 3 Base License | (no serial)', reason: 'No serial number in Salesforce' }]);
});

test('a row the Cleaner swallows silently is reported, not lost', () => {
  // "Serial Port Option" + a non-Waters-shaped serial reads as a header row to parseGrid.
  const res = E.cleanAssets([row('Serial Port Option', 'ABC123'), SQT]);
  assert.deepEqual(res.licenses.map(l => l.serial), ['DD0000000000123456']);
  assert.ok(res.removed.some(r => r.reason === 'Not recognized by the License Cleaner' && r.raw === 'Serial Port Option | ABC123'));
});

test('Remove SQT and Remove 0 qty options', () => {
  assert.equal(E.cleanAssets([SQT], { removeSqt: true }).licenses.length, 0);
  assert.equal(E.cleanAssets([row('Empower 3 Named User License', 'AB12345678', { qty: '0' })], { removeZero: true }).licenses.length, 0);
});

test('end to end: synthetic Assets page -> pre-ticked rows -> portal CSV', async () => {
  const dom = new JSDOM(assetsPageHtml(), { url: 'https://waters.lightning.force.com/lightning/r/Order/801000000000001AAA/related/Assets__r/view' });
  dom.window.Element.prototype.checkVisibility = undefined;
  const out = await readAssets({ doc: dom.window.document, waitMs: 0 });
  const files = E.buildFiles(E.cleanAssets(out.rows.filter(looksLikeLicense)), { company: out.accountName, order_number: out.orderNumber });
  assert.equal(files.csv, 'Serial_Numbers\r\nDD0000000000123456\r\n');
  assert.equal(files.names.csv, 'Contoso_Labs_Inc_02000001_Simple_ESLC.csv');
});
