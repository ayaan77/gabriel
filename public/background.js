// Gabriel Extension — Background Service Worker

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
