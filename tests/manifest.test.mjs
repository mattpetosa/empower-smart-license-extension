import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const m = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

test('identity and version', () => {
  assert.equal(m.manifest_version, 3);
  assert.equal(m.name, 'Empower Smart License Extension');
  assert.equal(m.version, pkg.version);
  assert.ok(m.description.length <= 132, 'Chrome caps descriptions at 132 chars');
  assert.equal(m.minimum_chrome_version, '116');
});

test('least privilege: exactly these permissions', () => {
  assert.deepEqual(m.permissions, ['sidePanel', 'scripting']);
  assert.deepEqual(m.host_permissions, ['https://waters.lightning.force.com/*']);
  assert.equal(m.content_scripts, undefined);
});

test('every file the manifest names exists', () => {
  const files = [m.background.service_worker, m.side_panel.default_path, ...Object.values(m.icons), ...Object.values(m.action.default_icon)];
  for (const f of files) assert.ok(existsSync(path.join(root, f)), f);
});

test('panel loads only local scripts, engine first', () => {
  const html = readFileSync(path.join(root, 'src/panel.html'), 'utf8');
  assert.deepEqual([...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(x => x[1]), ['../vendor/core.js', 'detect.js', 'engine.js', 'panel.js']);
  assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/, 'no inline scripts');
});

test('no network calls anywhere in shipped code', () => {
  for (const dir of ['src', 'vendor']) for (const f of readdirSync(path.join(root, dir)).filter(f => /\.(js|html)$/.test(f))) {
    assert.doesNotMatch(readFileSync(path.join(root, dir, f), 'utf8'), /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|importScripts/, `${dir}/${f}`);
  }
});
