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

// From a three-environment order: options are licenses; software media, the Support ID
// row and training are not.
const MORE_LICENSES = [
  ['Undefined', 'Empower Enterprise GPC/SEC Option 3 YR'],
  ['Undefined', 'Emp Enterprise Sys Suitability Opt 3 YR'],
  ['Undefined', 'Emp Enterprise Dissolution Option 3 YR'],
  ['QUALIF. WORKBOOK', 'LICENSE, LC SYSTEM QUALIFICATION, ADD'],
  ['EMP3 1 USE QUAL LIC', 'SQT Option for Empower 3 S/W - 1 Use'],
  ['EMPOWER3 OPTION', 'Empower Sample Set Generator License'],
];
const NOT_LICENSES = [
  ['EMPOWER3 OPTION', 'S/W, Sample Set Generator 2.0.0'],
  ['Undefined', 'S/W, Empower 3.10.0'],
  ['ORACLE PATCH', 'S/W, Oracle 19.21 Patch Installer'],
  ['Empower3 Software', 'Empower 3 Default Projects DVD'],
  ['WAT_CON SW', 'waters_connect cloud Edge Software'],
  ['WES COURSES', '1 Day Custom Web based training'],
  ['S/W Benefits Info', 'Empower S/W Platform Benefit Sheet'],
  ['PEAK N2 HORIZEN 24', 'NITROGEN GENERATOR, HORIZEN 24 Ltr/min'],
];
for (const [assetName, productName] of MORE_LICENSES)
  test(`license: ${productName}`, () => assert.equal(looksLikeLicense({ assetName, productName }), true));
for (const [assetName, productName] of NOT_LICENSES)
  test(`not a license: ${productName}`, () => assert.equal(looksLikeLicense({ assetName, productName }), false));

test('Support Plan ID comes from the S/W Benefits Info row', () => {
  const { supportIdOf } = createRequire(import.meta.url)('../src/detect.js');
  assert.equal(supportIdOf({ assetName: 'S/W Benefits Info', serial: ' EM0TEST001 ', productName: 'Empower S/W Platform Benefit Sheet' }), 'EM0TEST001');
  assert.equal(supportIdOf({ assetName: 'Something', serial: 'EM0TEST001', productName: 'Empower S/W Platform Benefit Sheet' }), 'EM0TEST001');
  assert.equal(supportIdOf({ assetName: 'S/W Benefits Info', serial: '', productName: '' }), '');
  assert.equal(supportIdOf({ assetName: 'EMPOWER3 Q LICENSE', serial: 'DD0000000000123456', productName: 'License, Empower SQT' }), '');
});
