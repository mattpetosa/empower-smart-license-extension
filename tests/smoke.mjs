// Load the unpacked extension in Chromium against the synthetic Assets page and
// download both files the way a person would. Run: npm run smoke
// The test copy of the extension also gets http://127.0.0.1/* host access; the
// shipped manifest never does.
import { chromium } from 'playwright';
import http from 'node:http';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assetsPageHtml, ASSETS_PATH, EXAMPLE_ROWS } from './fixtures/build-fixture.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(path.join(tmpdir(), 'esle-smoke-'));
const ext = path.join(work, 'ext');
for (const p of ['manifest.json', 'src', 'vendor', 'icons']) cpSync(path.join(root, p), path.join(ext, p), { recursive: true });
const manifest = JSON.parse(readFileSync(path.join(ext, 'manifest.json'), 'utf8'));
manifest.host_permissions.push('http://127.0.0.1/*');
writeFileSync(path.join(ext, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Order B: another account, another license, so carried-over details would show.
const B_ID = '801000000000002AAA';
const B_PATH = `/lightning/r/Order/${B_ID}/related/Assets__r/view`, B_RECORD = `/lightning/r/Order/${B_ID}/view`;
const bRows = EXAMPLE_ROWS.map((r, i) => ({ ...r, key: r.key.replace('AAA', 'BBB'), accountName: 'Fabrikam Inc', serial: i === 1 ? 'DD0000000000654321' : r.serial }));
const pages = {
  [ASSETS_PATH]: assetsPageHtml(),
  [B_PATH]: assetsPageHtml({ rows: bRows, orderNumber: '02000002', crumbRecordId: B_ID }),
  [B_RECORD]: '<!doctype html><title>Order | Salesforce</title><h1>Order 02000002</h1>',
};
const server = http.createServer((req, res) => {
  if (pages[req.url]) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(pages[req.url]); }
  else { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`, pageUrl = origin + ASSETS_PATH;

const context = await chromium.launchPersistentContext(path.join(work, 'profile'), {
  channel: 'chromium', headless: true, acceptDownloads: true,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});
try {
  const sw = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const extId = new URL(sw.url()).host;
  const sf = await context.newPage();
  await sf.goto(pageUrl);
  const tabId = await sw.evaluate(async url => (await chrome.tabs.query({})).find(t => t.url === url).id, pageUrl);
  // Toolbar icon: green (title says ready) only on an order's Assets list.
  const titleIs = async ready => {
    for (let i = 0; i < 50; i++) {
      const t = await sw.evaluate(id => chrome.action.getTitle({ tabId: id }), tabId);
      if (/ready/i.test(t) === ready) return;
      await new Promise(r => setTimeout(r, 100));
    }
    assert.fail(`toolbar title never became ${ready ? 'ready' : 'not ready'}`);
  };
  await titleIs(true);

  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extId}/src/panel.html?tabId=${tabId}`);
  await panel.click('#read');
  await panel.waitForSelector('#licenses tbody td.serial');
  assert.equal(await panel.textContent('#licenses tbody td.serial'), 'DD0000000000123456');
  assert.equal(await panel.inputValue('#company'), 'Contoso Labs Inc');
  assert.equal(await panel.inputValue('#order_number'), '02000001');
  assert.equal(await panel.isHidden('#warning'), true);

  const [csv] = await Promise.all([panel.waitForEvent('download'), panel.click('#dl-csv')]);
  assert.equal(csv.suggestedFilename(), 'Contoso_Labs_Inc_02000001_Simple_ESLC.csv');
  assert.equal(readFileSync(await csv.path(), 'utf8'), 'Serial_Numbers\r\nDD0000000000123456\r\n');

  const [xlsx] = await Promise.all([panel.waitForEvent('download'), panel.click('#dl-xlsx')]);
  assert.equal(xlsx.suggestedFilename(), 'Contoso_Labs_Inc_02000001_Detailed_ESLC.xlsx');
  assert.equal(readFileSync(await xlsx.path()).subarray(0, 2).toString(), 'PK');

  // Next order in the same panel: details and file names must follow the new order.
  await panel.fill('#support_id', 'SP-A');
  await sf.goto(origin + B_PATH);
  await panel.click('#read');
  await panel.waitForFunction(() => document.querySelector('#licenses tbody td.serial')?.textContent === 'DD0000000000654321');
  assert.equal(await panel.inputValue('#company'), 'Fabrikam Inc');
  assert.equal(await panel.inputValue('#order_number'), '02000002');
  assert.equal(await panel.inputValue('#support_id'), '');
  const [csvB] = await Promise.all([panel.waitForEvent('download'), panel.click('#dl-csv')]);
  assert.equal(csvB.suggestedFilename(), 'Fabrikam_Inc_02000002_Simple_ESLC.csv');
  assert.equal(readFileSync(await csvB.path(), 'utf8'), 'Serial_Numbers\r\nDD0000000000654321\r\n');

  // A failed Read must not leave the previous order's results downloadable.
  await sf.goto(origin + B_RECORD);
  await titleIs(false);
  await panel.click('#read');
  await panel.waitForSelector('#error:not([hidden])');
  assert.equal(await panel.isHidden('#review'), true);
  // Salesforce moves between pages without reloading; the icon must follow.
  await sf.evaluate(p => history.pushState(null, '', p), B_PATH);
  await titleIs(true);

  await panel.goto(`chrome-extension://${extId}/src/panel.html?tabId=${tabId}`);
  await sf.goto(pageUrl);
  await panel.click('#read');
  await panel.waitForSelector('#licenses tbody td.serial');
  await panel.screenshot({ path: path.join(root, 'test-results', 'panel.png'), fullPage: true });
  console.log('SMOKE OK');
} finally {
  await context.close();
  server.close();
  rmSync(work, { recursive: true, force: true });
}
