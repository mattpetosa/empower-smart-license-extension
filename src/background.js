// Clicking the toolbar icon opens the side panel.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

// The icon turns green on an order's Assets list (see status.js).
importScripts('scrape-core.js', 'status.js');

function showState(tab) {
  if (!tab || tab.id === undefined || tab.id < 0) return;
  const { icon, title } = self.ESLE_status.actionState(tab.url);
  // The tab can close between the event and these calls.
  chrome.action.setIcon({ tabId: tab.id, path: icon }).catch(() => {});
  chrome.action.setTitle({ tabId: tab.id, title }).catch(() => {});
}

// Salesforce changes the address without reloading; Chrome still reports it here.
chrome.tabs.onUpdated.addListener((tabId, change, tab) => showState(tab));
chrome.tabs.onActivated.addListener(({ tabId }) => chrome.tabs.get(tabId).then(showState, () => {}));
// Tabs that were already open when the extension started.
chrome.tabs.query({}).then(tabs => tabs.forEach(showState), () => {});
