import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assetsPageHtml, EXAMPLE_ROWS } from './fixtures/build-fixture.mjs';

test('committed fixture is what the builder produces', () => {
  assert.equal(readFileSync(new URL('./fixtures/assets-page.html', import.meta.url), 'utf8'), assetsPageHtml());
});
test('example order shape: 23 assets, one license, unique keys', () => {
  assert.equal(EXAMPLE_ROWS.length, 23);
  assert.equal(new Set(EXAMPLE_ROWS.map(r => r.key)).size, 23);
  assert.equal(EXAMPLE_ROWS.filter(r => r.serial === 'DD0000000000123456').length, 1);
});
