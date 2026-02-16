// Gabriel Extension — Offscreen Speech Recognition
// This runs in an invisible document with full web API access

let recognition = null;
let micStream = null;
let finalTranscript = '';

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'OFFSCREEN_START') {
        startRecognition();
    }
    if (msg.type === 'OFFSCREEN_STOP') {
        stopRecognition();
    }
});

async function startRecognition() {
    // Stop any existing session first
    stopRecognition();
    finalTranscript = '';

    // Step 1: Request mic access
    try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        chrome.runtime.sendMessage({
            type: 'VOICE_ERROR',
            error: err.name === 'NotAllowedError' ? 'not-allowed' : err.message
        }).catch(() => { });
        return;
    }

    // Step 2: Start speech recognition
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        chrome.runtime.sendMessage({
            type: 'VOICE_ERROR',
            error: 'Speech recognition not available in this browser'
        }).catch(() => { });
        cleanup();
        return;
    }

    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) {
                finalTranscript += (finalTranscript ? ' ' : '') + e.results[i][0].transcript;
            } else {
                interim += e.results[i][0].transcript;
            }
        }
        chrome.runtime.sendMessage({
            type: 'VOICE_RESULT',
            final: finalTranscript,
            interim: interim
        }).catch(() => { });
    };

    recognition.onerror = (e) => {
        chrome.runtime.sendMessage({
            type: 'VOICE_ERROR',
            error: e.error
        }).catch(() => { });
        cleanup();
    };

    recognition.onend = () => {
        chrome.runtime.sendMessage({ type: 'VOICE_END' }).catch(() => { });
        cleanup();
    };

    try {
        recognition.start();
        chrome.runtime.sendMessage({ type: 'VOICE_STARTED' }).catch(() => { });
    } catch (err) {
        chrome.runtime.sendMessage({
            type: 'VOICE_ERROR',
            error: err.message
        }).catch(() => { });
        cleanup();
    }
}

function stopRecognition() {
    if (recognition) {
        try { recognition.stop(); } catch (e) { /* ignore */ }
        recognition = null;
    }
    cleanup();
}

function cleanup() {
    if (micStream) {
        micStream.getTracks().forEach(t => t.stop());
        micStream = null;
    }
}
