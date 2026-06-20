// background.js – Service Worker
// Handles screenshot capture and opens editor tab

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureScreen') {
    // Capture the visible tab
    chrome.tabs.captureVisibleTab(null, { format: 'png', quality: 100 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      // Store screenshot temporarily
      chrome.storage.session.set({ screenshot: dataUrl }, () => {
        // Open editor in a new tab
        chrome.tabs.create({ url: chrome.runtime.getURL('editor.html') }, (tab) => {
          sendResponse({ success: true, tabId: tab.id });
        });
      });
    });
    return true; // Keep message channel open for async response
  }
});
