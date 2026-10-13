/* Empower Smart License Extension side panel. Reads the Assets list from the
   active Salesforce tab, lets the person confirm which rows are licenses, and
   builds the License Cleaner files locally. Nothing leaves the browser. */
'use strict';
const $ = id => document.getElementById(id);
const FIELDS = ['company', 'support_id', 'order_number', 'sold_to'];
const OPEN_ASSETS = "Open an order's Assets list (Related → Assets → View All) and try again.";
let rows = [], envs = [], results = new Map();
let lastOrder = null; // record id of the order the review currently shows
const decided = new Map(); // key -> environment id or null: the person's own choice, kept across re-reads
const labels = new Map(); // environment id -> the person's name for it (Prod, Dev...)

function el(tag, props = {}, ...kids) { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; }
function show(id, text) { const e = $(id); e.textContent = text || ''; e.hidden = !text; }
const fieldValues = () => Object.fromEntries(FIELDS.map(k => [k, $(k).value]));
const multi = () => envs.length > 1;
const colour = i => `env-${i % 5}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

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
  if (out.error === 'stale-page') return 'Salesforce is still showing the previous order. Wait for the Assets list to finish loading and try again.';
  return OPEN_ASSETS;
}

// Returns true once the review shows this tab's order.
async function read() {
  show('error'); show('warning');
  // Never leave an earlier order's results downloadable under a new Read's error.
  $('review').hidden = true;
  const btn = $('read');
  btn.disabled = true; btn.textContent = 'Reading…';
  try {
    const tab = await targetTab();
    // Chrome withholds the url of tabs this extension may not read: not Waters Salesforce.
    if (!tab || !tab.url) return show('error', `This tab isn't Waters Salesforce. ${OPEN_ASSETS}`);
    let out;
    try { out = await scrapeTab(tab.id); } catch (e) { return show('error', `Couldn't read this tab: ${e.message}`); }
    if (!out || out.error) return show('error', errorText(out || {}));
    const orderId = (out.recordId || '').slice(0, 15), newOrder = orderId !== lastOrder;
    if (newOrder) {
      // A different order: its details replace the last order's, typed ones included.
      lastOrder = orderId;
      decided.clear();
      labels.clear();
      $('company').value = out.accountName || '';
      $('order_number').value = out.orderNumber || '';
      $('support_id').value = '';
      $('sold_to').value = '';
    }
    envs = ESLE_review.environmentsOf(out.rows);
    rows = ESLE_review.reviewRows(out.rows);
    if (!multi() && envs[0].supportId && (newOrder || !$('support_id').value)) $('support_id').value = envs[0].supportId;
    $('support_id_row').hidden = multi();
    if (!out.complete) {
      show('warning', out.expected.plus
        ? `Read ${out.rows.length} assets, but Salesforce still shows ${out.expected.count}+. If the list has more, scroll to the bottom and click Read again.`
        : `Read ${out.rows.length} of ${out.expected.count} assets. Scroll the list to the bottom and click Read again.`);
    }
    $('review').hidden = false;
    renderEnvs();
    renderChecklist();
    render();
    return true;
  } finally {
    btn.disabled = false; btn.textContent = 'Read assets from this page';
  }
}

function renderEnvs() {
  $('envs').hidden = !multi();
  const box = $('envs').querySelector('.envs');
  box.replaceChildren();
  if (!multi()) return;
  $('envtitle').textContent = `${envs.length} environments on this order. Click a number on each license to put it in that environment.`;
  envs.forEach((e, i) => {
    const name = el('input', { value: labels.get(e.id) || '', placeholder: 'e.g. Prod', autocomplete: 'off' });
    name.setAttribute('aria-label', `Name for environment ${i + 1}`);
    name.addEventListener('input', () => { labels.set(e.id, name.value.trim()); render(); });
    const card = el('div', { className: `env ${colour(i)}` },
      el('span', { className: 'n', textContent: i + 1 }),
      el('div', {}, el('span', { className: 'sid', textContent: e.supportId }), ' ', el('span', { className: 'count muted small' })),
      name);
    card.dataset.env = e.id;
    box.append(card);
  });
}

// Product name first: it says what the asset is, and many Asset Names are just "Undefined".
function rowText(r) {
  const asset = /^\s*undefined\s*$/i.test(r.assetName || '') || r.assetName === r.productName ? '' : r.assetName;
  return [el('span', { className: 'name', textContent: r.productName || r.assetName || '(no name)' }),
    el('span', { className: 'product', textContent: r.productName ? asset : '' }),
    el('span', { className: 'serial', textContent: r.serial || '(no serial)' })];
}

// One environment: a tick box. Several: a numbered, coloured button per environment.
function rowItem(r) {
  const li = el('li');
  li.dataset.key = r.key;
  if (!multi()) {
    const cb = el('input', { type: 'checkbox', checked: ESLE_review.envOf(r, envs, decided) === envs[0].id });
    cb.addEventListener('change', () => { decided.set(r.key, cb.checked ? envs[0].id : null); render(); });
    li.append(el('label', {}, cb, ...rowText(r)));
    return li;
  }
  const chips = envs.map((e, i) => {
    const b = el('button', { type: 'button', className: `chip ${colour(i)}`, textContent: i + 1, title: `Environment ${i + 1} · ${e.supportId}` });
    b.dataset.env = e.id;
    b.addEventListener('click', () => {
      decided.set(r.key, ESLE_review.envOf(r, envs, decided) === e.id ? null : e.id);
      paint(li, r);
      render();
    });
    return b;
  });
  li.append(el('div', { className: 'row' }, ...rowText(r)), el('div', { className: 'chips' }, ...chips));
  paint(li, r);
  return li;
}

function paint(li, r) {
  const id = ESLE_review.envOf(r, envs, decided), i = envs.findIndex(e => e.id === id);
  li.className = i < 0 ? 'pick' : `pick ${colour(i)}`;
  for (const b of li.querySelectorAll('button.chip')) b.setAttribute('aria-pressed', String(b.dataset.env === id));
}

function renderChecklist() {
  // Grouped by the rule, not by tick state, so rows don't jump when ticked.
  // Sorted by product, so an environment's copies of the same license sit together.
  const name = r => r.productName || r.assetName || '';
  const sorted = [...rows].sort((a, b) => name(a).localeCompare(name(b)) || String(a.serial).localeCompare(String(b.serial)));
  const likely = sorted.filter(r => ESLE_detect.looksLikeLicense(r)), other = sorted.filter(r => !ESLE_detect.looksLikeLicense(r));
  for (const [box, list] of [[$('likely'), likely], [$('otherbox'), other]]) box.querySelector('ul').replaceChildren(...list.map(rowItem));
  if (!likely.length) $('likely').querySelector('ul').append(el('li', { className: 'muted', textContent: 'None found. Look under Other assets.' }));
  $('likely').querySelector('h3').textContent = `Likely licenses (${likely.length})`;
  $('othercount').textContent = other.length;
  $('assetcount').textContent = `(${rows.length} read)`;
}

function outputBlock(e, i, res) {
  const n = res.licenses.length;
  const title = multi()
    ? `${i + 1} · ${labels.get(e.id) ? `${labels.get(e.id)} · ` : ''}${e.supportId}`
    : 'Cleaned licenses';
  const tb = el('tbody');
  let last = null;
  for (const l of res.licenses) {
    const first = l.category !== last;
    tb.append(el('tr', { className: first ? 'first' : '' },
      el('td', { className: 'cat', textContent: first ? l.category : '' }),
      el('td', { textContent: l.name }),
      el('td', { className: 'qty', textContent: l.qty ?? '—' }),
      el('td', { className: 'serial', textContent: l.serial })));
    last = l.category;
  }
  if (!n) tb.append(el('tr', {}, el('td', { colSpan: 4, className: 'muted', textContent: multi() ? 'No licenses in this environment yet.' : 'No licenses ticked.' })));
  const removed = [...res.removed, ...res.unparsed.map(raw => ({ reason: 'Unrecognized line', raw }))];
  const csv = el('button', { className: 'primary dl-csv', disabled: !n, textContent: 'Download Simple CSV for Licensing Portal' });
  const xlsx = el('button', { className: 'dl-xlsx', disabled: !n, textContent: 'Download Detailed XLSX' });
  csv.addEventListener('click', () => download(e, 'csv'));
  xlsx.addEventListener('click', () => download(e, 'xlsx'));
  const table = el('table', { className: 'licenses' }, el('thead', {}, el('tr', {}, ...['Category', 'License', 'Qty', 'Serial No'].map(h => el('th', { textContent: h })))), tb);
  const block = el('section', { className: multi() ? `output ${colour(i)}` : 'output' },
    el('h2', {}, title, ' ', el('span', { className: 'muted', textContent: `(${plural(n, 'license')})` })),
    table);
  if (removed.length) block.append(el('details', {}, el('summary', { textContent: `Removed / skipped (${removed.length})` }),
    el('table', {}, el('tbody', {}, ...removed.map(r => el('tr', {}, el('td', { textContent: r.reason }), el('td', { textContent: r.raw })))))));
  block.append(el('div', { className: 'actions' }, csv, xlsx));
  block.dataset.env = e.id;
  return block;
}

function render() {
  results = new Map(envs.map(e => [e.id, ESLE_engine.cleanAssets(ESLE_review.rowsIn(rows, envs, decided, e.id), cleanOpts())]));
  $('outputs').replaceChildren(...envs.map((e, i) => outputBlock(e, i, results.get(e.id))));
  if (!multi()) return show('unassigned');
  for (const card of $('envs').querySelectorAll('.env')) card.querySelector('.count').textContent = `· ${plural(results.get(card.dataset.env).licenses.length, 'license')}`;
  const left = ESLE_review.unassignedLikely(rows, envs, decided);
  show('unassigned', left ? `${plural(left, 'likely license')} ${left === 1 ? "isn't" : "aren't"} in an environment yet.` : '');
}

const cleanOpts = () => ({ removeSqt: $('remove_sqt').checked, removeZero: $('remove_zero').checked });

function download(e, kind) {
  const res = results.get(e.id);
  if (!res || !res.licenses.length) return;
  save(res, multi() ? { ...fieldValues(), support_id: e.supportId, environment: labels.get(e.id) || '' } : fieldValues(), kind);
}

function save(res, fields, kind) {
  const f = ESLE_engine.buildFiles(res, fields);
  const blob = kind === 'csv'
    ? new Blob([f.csv], { type: 'text/csv' })
    : new Blob([f.xlsx], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = el('a', { href: URL.createObjectURL(blob), download: kind === 'csv' ? f.names.csv : f.names.xlsx });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

// Download all: read the page, then every likely license in one file, whatever is
// ticked or numbered above. Several environments: one file for the whole order.
async function downloadEverything(kind) {
  if (!(await read())) return;
  const res = ESLE_engine.cleanAssets(rows.filter(r => ESLE_detect.looksLikeLicense(r)), cleanOpts());
  if (!res.licenses.length) return show('error', 'No licenses found on this page.');
  save(res, multi() ? { ...fieldValues(), support_id: '' } : fieldValues(), kind);
}

// The logo goes green, like the toolbar icon, while the tab can be read.
async function showReady() {
  let tab = null;
  try { tab = await targetTab(); } catch { /* tab closed */ }
  const s = ESLE_status.actionState(tab && tab.url);
  $('logo').src = s.logo;
  $('logo').title = s.title;
  $('logo').dataset.ready = String(s.ready);
}

$('read').addEventListener('click', read);
$('all_csv').addEventListener('click', () => downloadEverything('csv'));
$('all_xlsx').addEventListener('click', () => downloadEverything('xlsx'));
chrome.tabs.onActivated.addListener(showReady);
// Salesforce changes the address without reloading; Chrome still reports it here.
chrome.tabs.onUpdated.addListener((tabId, change) => { if (change.url || change.status) showReady(); });
chrome.windows.onFocusChanged.addListener(showReady);
showReady();
for (const id of ['remove_sqt', 'remove_zero']) $(id).addEventListener('change', () => { if (rows.length) render(); });
