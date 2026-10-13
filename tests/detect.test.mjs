import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { looksLikeLicense } = createRequire(import.meta.url)('../src/detect.js');

const LICENSES = [
  ['EMPOWER3 Q LICENSE', 'License, Empower SQT for software 1 year'],
  ['EMPOWER3 BASE LICENSE', 'License, Empower 3 Enterprise Base'],
  ['EMPOWER NAMED USER LIC', 'Empower 3 Named User License 5-pack'],
  ['', 'License, Agilent LC Instrument Control'],
  ['EMPOWER LICENCE', ''],
  ['E3 SYS CTRL LIC', 'Empower 3 System Control License'],
];
// Every hardware row of the real example order (names only; serials don't matter here).
const HARDWARE = [
  ['LENOVO-MLYNX', 'P5 6core PC MassLynx Win10 LTSC 2021'],
  ['PC RESTORE DISK', 'Kit, P5 6core MassLynx W11 LTSC2024w/lic'],
  ['LAC32 OPERAT SYS UPG', 'Kit, LAC/E 17 Win11 LTSC 2024 w/ license'],
  ['LAC/E CONFIG 17', 'H/W LAC/E 17 LTSC2021'],
  ['', ''],
];

for (const [assetName, productName] of LICENSES)
  test(`license: ${assetName || productName}`, () => assert.equal(looksLikeLicense({ assetName, productName }), true));
for (const [assetName, productName] of HARDWARE)
  test(`not a license: ${assetName || '(blank)'}`, () => assert.equal(looksLikeLicense({ assetName, productName }), false));
test('missing fields are fine', () => assert.equal(looksLikeLicense({}), false));
