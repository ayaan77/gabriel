// Gabriel Extension — Background Service Worker

// Side Panel: Open when user clicks the extension icon
chrome.sidePanel?.setOptions?.({ path: 'index.html', enabled: true }).catch(() => { });

chrome.action.onClicked.addListener(async (tab) => {
    try {
        await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch {
        // Falls back to popup if sidePanel isn't supported
    }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'START_RECORDING') {
        handleStartRecording();
    }
    if (msg.type === 'STOP_RECORDING') {
        chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP' }).catch(() => { });
    }
});

async function handleStartRecording() {
    // Create offscreen document if it doesn't exist
    try {
        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['USER_MEDIA'],
            justification: 'Speech recognition requires microphone access'
        });
    } catch (e) {
        // Document already exists — that's fine
        if (!e.message?.includes('already exists')) {
            console.error('Offscreen creation error:', e);
            return;
        }
    }

    // Give the offscreen document time to load its scripts, then start
    setTimeout(() => {
        chrome.runtime.sendMessage({ type: 'OFFSCREEN_START' }).catch(() => { });
    }, 200);
}
