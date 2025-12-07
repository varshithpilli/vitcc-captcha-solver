// Service worker for Lazy VITC extension
// Handles side panel registration


chrome.sidePanel
  .setPanelBehavior({
    openPanelOnActionClick: true,
  })
  .catch((error) => {});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle VTOP credentials messages and forward them to the sidebar
    if (request.type === 'VTOP_CREDENTIALS_FOUND') {
        // Forward the message to the sidebar
        chrome.runtime.sendMessage({
            type: 'VTOP_CREDENTIALS_FOUND',
            csrfToken: request.csrfToken,
            authorizedId: request.authorizedId
        });
        sendResponse({ status: 'forwarded' });
        return true;
    }
});

chrome.runtime.onInstalled.addListener(() => {
    // No need to initialize dashboard override setting anymore
});