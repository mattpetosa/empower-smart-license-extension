// Synthetic copy of a Waters Salesforce order's Assets page. Same DOM shape as a
// real saved page: two Assets grids (the related-list preview sits in an inactive
// console tab), "Preview" button text inside Asset Name, the "N items" status
// line and the Orders breadcrumb. Account, contact and serials are made up.
// Never replace this with a real page: real pages carry customer data.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ASSETS_PATH = '/lightning/r/Order/801000000000001AAA/related/Assets__r/view';
export const ASSETS_URL = 'https://waters.lightning.force.com' + ASSETS_PATH;
export const VISIBLE_COLUMNS = ['Row Number', 'Asset Name', 'Serial Number', 'Install Date', 'Account Name', 'Contact Name', 'Product Name', 'Action'];
export const PREVIEW_COLUMNS = ['Asset Name', 'Serial Number', 'Install Date', 'Account Name', 'Action'];
const ACCOUNT = 'Contoso Labs Inc';

const asset = (assetName, serial, productName) => ({ assetName, serial, productName });
export const EXAMPLE_ROWS = [
  asset('LENOVO-MLYNX', 'XM0001TEST', 'P5 6core PC MassLynx Win10 LTSC 2021'),
  asset('EMPOWER3 Q LICENSE', 'DD0000000000123456', 'License, Empower SQT for software 1 year'),
  asset('PC RESTORE DISK', 'X6TEST0001', 'Kit, P5 6core MassLynx W11 LTSC2024w/lic'),
  ...Array.from({ length: 10 }, (_, i) => asset('LAC32 OPERAT SYS UPG', `X6TESTA${String(i).padStart(3, '0')}`, 'Kit, LAC/E 17 Win11 LTSC 2024 w/ license')),
  ...Array.from({ length: 10 }, (_, i) => asset('LAC/E CONFIG 17', `K00TEST${String(i).padStart(2, '0')}W`, 'H/W LAC/E 17 LTSC2021')),
].map((r, i) => ({ key: `02i000000000${String(i + 1).padStart(3, '0')}AAA`, ...r }));

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const link = (text, withTitle = true) =>
  `<a class="slds-truncate" href="https://waters.lightning.force.com/lightning/r/02i000000000000AAA/view"${withTitle ? ` title="${esc(text)}"` : ''}><slot><span>${esc(text)}</span></slot></a>`;

function cell(col, row, n) {
  const wrap = (inner, tag = 'td', extra = '') =>
    `<${tag} role="${tag === 'th' ? 'rowheader' : 'gridcell'}" data-label="${col}"${extra}><lightning-primitive-cell-factory data-label="${col}"><span class="slds-grid"><div class="slds-truncate">${inner}</div></span></lightning-primitive-cell-factory></${tag}>`;
  switch (col) {
    case 'Row Number': return `<td role="gridcell"><span class="slds-row-number">${n}</span></td>`;
    case 'Asset Name': return wrap(`${link(row.assetName, false)}<button class="slds-button" title="Preview" type="button"><span class="slds-assistive-text">Preview</span></button>`, 'th', ' scope="row"');
    case 'Serial Number': return wrap(row.serial ? link(row.serial) : '');
    case 'Install Date': return wrap('<lightning-formatted-date-time></lightning-formatted-date-time>');
    case 'Account Name': return wrap(link(row.accountName ?? ACCOUNT));
    case 'Contact Name': return wrap('');
    case 'Product Name': return wrap(row.productName ? link(row.productName) : '');
    case 'Quantity': return wrap(`<lightning-formatted-number>${esc(row.qty ?? '')}</lightning-formatted-number>`);
    case 'Action': return '<td role="gridcell"><button class="slds-button" title="Show Actions"><span class="slds-assistive-text">Show Actions</span></button></td>';
    default: return wrap(esc(row[col] ?? ''));
  }
}

export function rowHtml(row, columns = VISIBLE_COLUMNS, n = 1) {
  return `<tr class="slds-hint-parent" role="row" data-row-key-value="${esc(row.key)}" data-row-number="${n}">${columns.map(c => cell(c, row, n)).join('')}</tr>`;
}

export function gridHtml(rows, columns = VISIBLE_COLUMNS) {
  const head = columns.map(c => `<th role="columnheader" scope="col" aria-label="${c}"><span class="slds-truncate">${c}</span></th>`).join('');
  return `<table class="slds-table slds-table_header-fixed" role="grid" aria-label="Assets"><thead><tr class="slds-line-height_reset" role="row" data-row-key-value="HEADER">${head}</tr></thead><tbody>${rows.map((r, i) => rowHtml(r, columns, i + 1)).join('')}</tbody></table>`;
}

const status = text => `<p class="slds-text-body--small"><force-list-view-manager-status-info><span><span class="countSortedByFilteredBy">${esc(text)}</span></span></force-list-view-manager-status-info></p>`;

export function assetsPageHtml({ rows = EXAMPLE_ROWS, rendered = rows.length, previewRows = rows.slice(0, 6), itemCount = `${rows.length} items`, orderNumber = '02000001', columns = VISIBLE_COLUMNS } = {}) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Assets | Salesforce</title>
<style>.tabContent:not(.active),.windowViewMode-minimized{display:none}.slds-scrollable_y{overflow-y:auto;height:420px}.slds-assistive-text{position:absolute;clip:rect(0 0 0 0)}</style></head>
<body><div class="oneWorkspace active navexWorkspace">
<section class="tabContent oneConsoleTab"><div class="windowViewMode-minimized lafPageHost"><div class="forceRelatedListPreviewAdvancedGrid">
${status(`${previewRows.length} items • Sorted by Last Modified •`)}
<div class="slds-scrollable_y">${gridHtml(previewRows, PREVIEW_COLUMNS)}</div>
</div></div></section>
<section class="tabContent active oneConsoleTab"><div class="windowViewMode-maximized active lafPageHost"><div class="forceRelatedListDesktop">
<ol class="slds-breadcrumb slds-list_horizontal slds-wrap"><li class="slds-breadcrumb__item"><a title="Orders" href="https://waters.lightning.force.com/lightning/o/Order/home">Orders</a></li><li class="slds-breadcrumb__item"><a title="${esc(orderNumber)}" href="https://waters.lightning.force.com/lightning/r/801000000000001AAA/view">${esc(orderNumber)}</a></li></ol>
<h1>Assets</h1>
${status(`${itemCount} • Sorted by Product Name •`)}
<div class="slds-table_header-fixed_container slds-scrollable_x"><div class="slds-scrollable_y">${gridHtml(rows.slice(0, rendered), columns)}</div></div>
</div></div></section>
</div></body></html>
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(new URL('./assets-page.html', import.meta.url), assetsPageHtml());
  console.log('wrote tests/fixtures/assets-page.html');
}
