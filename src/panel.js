/* Empower Smart License Extension side panel. Reads the Assets list from the
   active Salesforce tab, lets the person confirm which rows are licenses, and
   builds the License Cleaner files locally. Nothing leaves the browser. */
'use strict';
const $ = id => document.getElementById(id);
const FIELDS = ['company', 'support_id', 'order_number', 'sold_to'];
const OPEN_ASSETS = "Open an order's Assets list (Related → Assets → View All) and try again.";
let rows = [], ticked = new Set(), current = null;
const decided = new Map(); // key -> the person's own tick, kept across re-reads

function el(tag, props = {}, ...kids) { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; }
function show(id, text) { const e = $(id); e.textContent = text || ''; e.hidden = !text; }
const fieldValues = () => Object.fromEntries(FIELDS.map(k => [k, $(k).value]));

async function targetTab() {
  const forced = new URLSearchParams(location.search).get('tabId'); // smoke test opens the panel as a normal tab
  if (forced) return chrome.tabs.get(Number(forced));
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function scrapeTab(tabId) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['src/scrape-core.js'] });
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func: () => self.ESLE_scrape.readAssets() });
  return result;
}

function errorText(out) {
  if (out.error === 'missing-columns') {
    const cols = out.missingColumns;
    return `The Assets list doesn't show the ${cols.join(', ')} column${cols.length > 1 ? 's' : ''}, so it can't be read.`;
  }
  return OPEN_ASSETS;
}

async function read() {
  show('error'); show('warning');
  const btn = $('read');
  btn.disabled = true; btn.textContent = 'Reading…';
  try {
    const tab = await targetTab();
    // Chrome withholds the url of tabs this extension may not read: not Waters Salesforce.
    if (!tab || !tab.url) return show('error', `This tab isn't Waters Salesforce. ${OPEN_ASSETS}`);
    let out;
    try { out = await scrapeTab(tab.id); } catch (e) { return show('error', `Couldn't read this tab: ${e.message}`); }
    if (!out || out.error) return show('error', errorText(out || {}));
    rows = out.rows;
    ticked = new Set(rows.filter(r => (decided.has(r.key) ? decided.get(r.key) : ESLE_detect.looksLikeLicense(r))).map(r => r.key));
    if (out.accountName && !$('company').value.trim()) $('company').value = out.accountName;
    if (out.orderNumber && !$('order_number').value.trim()) $('order_number').value = out.orderNumber;
    if (!out.complete) show('warning', `Read ${rows.length} of ${out.expected.count}${out.expected.plus ? '+' : ''} assets. Scroll the list to the bottom and click Read again.`);
    $('review').hidden = false;
    renderChecklist();
    render();
  } finally {
    btn.disabled = false; btn.textContent = 'Read assets from this page';
  }
}

function renderChecklist() {
  // Grouped by the rule, not by tick state, so rows don't jump when ticked.
  const likely = rows.filter(r => ESLE_detect.looksLikeLicense(r)), other = rows.filter(r => !ESLE_detect.looksLikeLicense(r));
  for (const [box, list] of [[$('likely'), likely], [$('otherbox'), other]]) {
    const ul = box.querySelector('ul');
    ul.replaceChildren();
    for (const r of list) {
      const cb = el('input', { type: 'checkbox', checked: ticked.has(r.key) });
      cb.addEventListener('change', () => {
        if (cb.checked) ticked.add(r.key); else ticked.delete(r.key);
        decided.set(r.key, cb.checked);
        render();
      });
      ul.append(el('li', {}, el('label', {}, cb,
        el('span', { className: 'name', textContent: r.assetName || '(no name)' }),
        el('span', { className: 'product', textContent: r.productName }),
        el('span', { className: 'serial', textContent: r.serial || '(no serial)' }))));
    }
  }
  if (!likely.length) $('likely').querySelector('ul').append(el('li', { className: 'muted', textContent: 'None found. Tick them under Other assets.' }));
  $('likely').querySelector('h3').textContent = `Likely licenses (${likely.length})`;
  $('othercount').textContent = other.length;
  $('assetcount').textContent = `(${rows.length} read)`;
}

function render() {
  current = ESLE_engine.cleanAssets(rows.filter(r => ticked.has(r.key)), { removeSqt: $('remove_sqt').checked, removeZero: $('remove_zero').checked });
  const tb = $('licenses').querySelector('tbody');
  tb.replaceChildren();
  let last = null;
  for (const l of current.licenses) {
    const first = l.category !== last;
    tb.append(el('tr', { className: first ? 'first' : '' },
      el('td', { className: 'cat', textContent: first ? l.category : '' }),
      el('td', { textContent: l.name }),
      el('td', { className: 'qty', textContent: l.qty ?? '—' }),
      el('td', { className: 'serial', textContent: l.serial })));
    last = l.category;
  }
  if (!current.licenses.length) tb.append(el('tr', {}, el('td', { colSpan: 4, className: 'muted', textContent: 'No licenses ticked.' })));
  const removed = [...current.removed, ...current.unparsed.map(raw => ({ reason: 'Unrecognized line', raw }))];
  const rb = $('removed').querySelector('tbody');
  rb.replaceChildren(...removed.map(r => el('tr', {}, el('td', { textContent: r.reason }), el('td', { textContent: r.raw }))));
  $('removedcount').textContent = removed.length;
  $('removedbox').hidden = !removed.length;
  $('meta').textContent = `(${current.licenses.length} license${current.licenses.length === 1 ? '' : 's'})`;
  $('dl-csv').disabled = $('dl-xlsx').disabled = !current.licenses.length;
}

function download(kind) {
  if (!current) return;
  const f = ESLE_engine.buildFiles(current, fieldValues());
  const blob = kind === 'csv'
    ? new Blob([f.csv], { type: 'text/csv' })
    : new Blob([f.xlsx], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = el('a', { href: URL.createObjectURL(blob), download: kind === 'csv' ? f.names.csv : f.names.xlsx });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

$('read').addEventListener('click', read);
for (const id of ['remove_sqt', 'remove_zero']) $(id).addEventListener('change', () => { if (rows.length) render(); });
$('dl-csv').addEventListener('click', () => download('csv'));
$('dl-xlsx').addEventListener('click', () => download('xlsx'));
