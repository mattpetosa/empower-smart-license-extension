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
import { assetsPageHtml, ASSETS_PATH } from './fixtures/build-fixture.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(path.join(tmpdir(), 'esle-smoke-'));
const ext = path.join(work, 'ext');
for (const p of ['manifest.json', 'src', 'vendor', 'icons']) cpSync(path.join(root, p), path.join(ext, p), { recursive: true });
const manifest = JSON.parse(readFileSync(path.join(ext, 'manifest.json'), 'utf8'));
manifest.host_permissions.push('http://127.0.0.1/*');
writeFileSync(path.join(ext, 'manifest.json'), JSON.stringify(manifest, null, 2));

const html = assetsPageHtml();
const server = http.createServer((req, res) => {
  if (req.url === ASSETS_PATH) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); }
  else { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const pageUrl = `http://127.0.0.1:${server.address().port}${ASSETS_PATH}`;

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

  await panel.screenshot({ path: path.join(root, 'test-results', 'panel.png'), fullPage: true });
  console.log('SMOKE OK');
} finally {
  await context.close();
  server.close();
  rmSync(work, { recursive: true, force: true });
}
