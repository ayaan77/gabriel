// Content Script — Extracts structured data from the current page
// Injected by Gabriel to provide rich page context to the AI

// Prevent duplicate listener registration when script is re-injected
if (!window.__gabrielContentScriptLoaded) {
    window.__gabrielContentScriptLoaded = true;

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'get_visible_text') {
            const text = getVisibleText();
            const title = document.title;
            const url = window.location.href;
            sendResponse({ success: true, text, title, url });
        } else if (message.action === 'get_page_data') {
            const data = getFullPageData();
            sendResponse({ success: true, ...data });
        } else {
            // Unknown action - respond immediately so the channel doesn't hang
            sendResponse({ success: false, error: 'Unknown action' });
        }
        return true;
    });
}

function getFullPageData() {
    return {
        title: document.title,
        url: window.location.href,
        meta: getMetaInfo(),
        headings: getHeadings(),
        mainContent: getMainContent(),
        links: getKeyLinks(),
        text: getVisibleText()
    };
}

function getMetaInfo() {
    const meta = {};
    const desc = document.querySelector('meta[name="description"]');
    if (desc) meta.description = desc.content;

    const author = document.querySelector('meta[name="author"]');
    if (author) meta.author = author.content;

    const keywords = document.querySelector('meta[name="keywords"]');
    if (keywords) meta.keywords = keywords.content;

    // Open Graph
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) meta.ogTitle = ogTitle.content;

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) meta.ogDescription = ogDesc.content;

    const ogType = document.querySelector('meta[property="og:type"]');
    if (ogType) meta.ogType = ogType.content;

    const ogSite = document.querySelector('meta[property="og:site_name"]');
    if (ogSite) meta.siteName = ogSite.content;

    // Twitter/social
    const twitterCreator = document.querySelector('meta[name="twitter:creator"]');
    if (twitterCreator) meta.twitterCreator = twitterCreator.content;

    // Schema.org structured data
    const ldJson = document.querySelector('script[type="application/ld+json"]');
    if (ldJson) {
        try {
            const parsed = JSON.parse(ldJson.textContent);
            meta.structuredData = JSON.stringify(parsed).substring(0, 2000);
        } catch (e) { /* ignore */ }
    }

    return meta;
}

function getHeadings() {
    const headings = [];
    document.querySelectorAll('h1, h2, h3').forEach(h => {
        const text = h.textContent?.trim();
        if (text && text.length > 0 && text.length < 200) {
            headings.push({ level: h.tagName, text });
        }
    });
    return headings.slice(0, 30);
}

function getMainContent() {
    const selectors = ['main', 'article', '[role="main"]', '#content', '.content', '.post', '.article'];
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim().length > 100) {
            return el.textContent.trim().substring(0, 6000);
        }
    }
    return '';
}

function getKeyLinks() {
    const links = [];
    const seen = new Set();
    document.querySelectorAll('a[href]').forEach(a => {
        const href = a.href;
        const text = a.textContent?.trim();
        if (!text || text.length < 2 || text.length > 100) return;
        if (seen.has(href)) return;
        if (href.startsWith('javascript:') || href === '#') return;
        seen.add(href);
        links.push({ text, href });
    });
    return links.slice(0, 25);
}

function getVisibleText() {
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

    return parts.join(' ').substring(0, 8000);
}
