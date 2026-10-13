// vendor/core.js must be the License Cleaner's engine, byte for byte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ESLC = createRequire(import.meta.url)('../vendor/core.js');
const vendored = readFileSync(path.join(root, 'vendor/core.js'));
const source = Object.fromEntries(readFileSync(path.join(root, 'vendor/CORE_SOURCE'), 'utf8').trim().split('\n').map(l => l.split('=')));

test('vendor/core.js matches the sha256 recorded at sync time', () => {
  assert.equal(createHash('sha256').update(vendored).digest('hex'), source.sha256);
  assert.match(source.source_commit, /^[0-9a-f]{40}$/);
});

test('vendor/core.js matches the License Cleaner checkout', t => {
  const site = path.join(process.env.ESLC_SITE || path.join(homedir(), 'licenses-site'), 'offline/core.js');
  if (!existsSync(site)) return t.skip('no licenses-site checkout');
  assert.ok(vendored.equals(readFileSync(site)), 'run scripts/sync-core.sh');
});

test('engine exposes what the extension uses', () => {
  for (const fn of ['parseGrid', 'removeSqt', 'removeZeroQty', 'buildCsv', 'buildWorkbook', 'baseName']) assert.equal(typeof ESLC[fn], 'function', fn);
});
