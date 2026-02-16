// Content Script — Reads visible text from the current page
// Injected by Gabriel to provide page context to the AI

class GabrielContentScript {
    init() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'get_visible_text') {
                const text = this.getVisibleText();
                const title = document.title;
                const url = window.location.href;
                sendResponse({ success: true, text, title, url });
            }
            return true;
        });
    }

    getVisibleText() {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;

                const style = window.getComputedStyle(parent);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                    return NodeFilter.FILTER_REJECT;
                }

                if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' || parent.tagName === 'NOSCRIPT') {
                    return NodeFilter.FILTER_REJECT;
                }

                const text = node.textContent?.trim() || '';
                return text.length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            },
        });

        const parts = [];
        let node;
        while ((node = walker.nextNode())) {
            parts.push(node.textContent.trim());
        }

        // Limit to ~8KB to avoid token bloat
        return parts.join(' ').substring(0, 8000);
    }
}

const gabriel = new GabrielContentScript();
gabriel.init();
