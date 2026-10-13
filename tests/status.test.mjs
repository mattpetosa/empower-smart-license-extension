import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { ASSETS_URL } from './fixtures/build-fixture.mjs';
const { actionState } = createRequire(import.meta.url)('../src/status.js');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SF = 'https://waters.lightning.force.com';

test('green on an order Assets list', () => {
  const s = actionState(ASSETS_URL);
  assert.equal(s.ready, true);
  assert.match(s.icon[16], /ready/);
  assert.match(s.logo, /logo-ready\.svg$/);
  assert.match(s.title, /ready/i);
});

test('green with a 15-character record id', () => {
  assert.equal(actionState(`${SF}/lightning/r/Order/801000000000001/related/Assets__r/view`).ready, true);
});

for (const [why, url] of [
  ['the order record page', `${SF}/lightning/r/Order/801000000000001AAA/view`],
  ['another related list', `${SF}/lightning/r/Order/801000000000001AAA/related/OrderItems/view`],
  ['Salesforce home', `${SF}/lightning/page/home`],
  ['a tab Chrome hides the address of', undefined],
]) test(`grey on ${why}`, () => {
  const s = actionState(url);
  assert.equal(s.ready, false);
  assert.match(s.title, /Assets list/);
});

test('grey icons are the manifest defaults; every icon exists', () => {
  const m = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const grey = actionState(undefined).icon, green = actionState(ASSETS_URL).icon;
  assert.deepEqual(Object.fromEntries(Object.entries(grey).map(([k, v]) => [k, v.replace(/^\//, '')])), m.action.default_icon);
  assert.deepEqual(Object.keys(green), Object.keys(grey));
  for (const p of [...Object.values(grey), ...Object.values(green), actionState(undefined).logo, actionState(ASSETS_URL).logo]) assert.ok(existsSync(path.join(root, p)), p);
});
