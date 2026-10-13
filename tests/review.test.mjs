import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { EXAMPLE_ROWS, MULTI_ENV_ROWS } from './fixtures/build-fixture.mjs';
const R = createRequire(import.meta.url)('../src/review.js');

const byProduct = (rows, p) => rows.filter(r => r.productName === p);

test('one environment per Support ID, numbered in Support ID order', () => {
  assert.deepEqual(R.environmentsOf(MULTI_ENV_ROWS).map(e => e.supportId), ['EM0TEST001', 'EM0TEST002', 'EM0TEST003']);
});

test('no S/W Benefits Info row: a single environment with no Support ID', () => {
  assert.deepEqual(R.environmentsOf(EXAMPLE_ROWS).map(e => e.supportId), ['']);
});

test('the Support ID rows are not offered as assets', () => {
  const shown = R.reviewRows(MULTI_ENV_ROWS);
  assert.equal(shown.length, MULTI_ENV_ROWS.length - 3);
  assert.ok(shown.every(r => r.assetName !== 'S/W Benefits Info'));
});

test('single environment: likely licenses start in it', () => {
  const envs = R.environmentsOf(EXAMPLE_ROWS);
  const inEnv = EXAMPLE_ROWS.filter(r => R.envOf(r, envs, new Map()) === envs[0].id);
  assert.deepEqual(inEnv.map(r => r.serial), ['DD0000000000123456']);
});

test('several environments: nothing starts assigned, and all likely licenses count as unassigned', () => {
  const envs = R.environmentsOf(MULTI_ENV_ROWS), shown = R.reviewRows(MULTI_ENV_ROWS);
  assert.ok(shown.every(r => R.envOf(r, envs, new Map()) === null));
  assert.equal(R.unassignedLikely(shown, envs, new Map()), 8); // 3 base + 2 named user + 3 options
});

test("the person's choice wins, and a row sits in one environment only", () => {
  const envs = R.environmentsOf(MULTI_ENV_ROWS), shown = R.reviewRows(MULTI_ENV_ROWS);
  const [base1, base2] = byProduct(shown, 'Empower Enterprise Base License 3 YR');
  const decided = new Map([[base1.key, 'EM0TEST001'], [base2.key, 'EM0TEST002']]);
  assert.equal(R.envOf(base1, envs, decided), 'EM0TEST001');
  assert.equal(R.envOf(base2, envs, decided), 'EM0TEST002');
  assert.equal(R.unassignedLikely(shown, envs, decided), 6);
  decided.set(base1.key, 'EM0TEST003'); // moving it takes it out of 1
  assert.equal(R.envOf(base1, envs, decided), 'EM0TEST003');
});

test('single environment: unticking a likely license sticks', () => {
  const envs = R.environmentsOf(EXAMPLE_ROWS), lic = EXAMPLE_ROWS[1];
  assert.equal(R.envOf(lic, envs, new Map([[lic.key, null]])), null);
});

test('a choice for an environment that is no longer on the page is dropped', () => {
  const envs = R.environmentsOf(EXAMPLE_ROWS), lic = EXAMPLE_ROWS[1];
  assert.equal(R.envOf(lic, envs, new Map([[lic.key, 'EM0TEST002']])), null);
});

test('rowsIn: the rows of one environment', () => {
  const envs = R.environmentsOf(MULTI_ENV_ROWS), shown = R.reviewRows(MULTI_ENV_ROWS);
  const opts = byProduct(shown, 'Emp Enterprise Dissolution Option 3 YR');
  const decided = new Map(opts.map((r, i) => [r.key, envs[i].id]));
  assert.deepEqual(R.rowsIn(shown, envs, decided, 'EM0TEST002').map(r => r.serial), ['DD0000000000900202']);
});
