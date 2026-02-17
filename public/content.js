// Content Script — Extracts structured data from the current page
// Injected by Gabriel to provide rich page context to the AI

// Use a version-based guard so that when the extension is reloaded/updated,
// the listener is re-registered (old listeners from previous extension context are dead)
const SCRIPT_VERSION = '1.2.4';
if (window.__gabrielContentScriptVersion !== SCRIPT_VERSION) {
    window.__gabrielContentScriptVersion = SCRIPT_VERSION;

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'ping') {
            // Simple connectivity check
            sendResponse({ success: true, version: SCRIPT_VERSION, url: window.location.href });
            return;
        } else if (message.action === 'get_visible_text') {
            const text = getVisibleText();
            const title = document.title;
            const url = window.location.href;
            sendResponse({ success: true, text, title, url });
        } else if (message.action === 'get_page_data') {
            const data = getFullPageData();
            sendResponse({ success: true, ...data });
        } else if (message.action === 'get_cro_data') {
            getCROData().then(data => {
                sendResponse({ success: true, data });
            }).catch(err => {
                console.error('CRO Data capture failed:', err);
                sendResponse({ success: false, error: err.toString() });
            });
            return true; // Keep channel open for async response
        } else {
            // Unknown action - respond immediately so the channel doesn't hang
            sendResponse({ success: false, error: 'Unknown action' });
        }
        return true;
    });

    console.log('✅ Gabriel content script loaded (v' + SCRIPT_VERSION + ')');
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

// ============================================
// CRO ANALYSIS FUNCTIONS
// ============================================

// Visual Labeling Helpers (Inspired by OpenClaw)
function showElementLabels(elements) {
    // Remove existing if any
    hideElementLabels();

    const root = document.createElement('div');
    root.id = 'ai-architect-labels';
    root.style.position = 'fixed';
    root.style.left = '0';
    root.style.top = '0';
    root.style.width = '100%';
    root.style.height = '100%';
    root.style.zIndex = '2147483647'; // Max z-index
    root.style.pointerEvents = 'none';
    root.style.fontFamily = 'monospace';

    let count = 0;
    const colors = {
        primaryCTA: '#22c55e', // Green
        hero: '#3b82f6', // Blue
        forms: '#f59e0b', // Amber
        trust: '#8b5cf6', // Purple
        navigation: '#64748b' // Slate
    };

    // Helper to add box
    const addBox = (el, label, color) => {
        if (!el || !el.getBoundingClientRect) return;
        const rect = el.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) return; // Skip tiny elements

        const box = document.createElement('div');
        box.style.position = 'absolute';
        box.style.left = `${rect.left}px`;
        box.style.top = `${rect.top}px`;
        box.style.width = `${rect.width}px`;
        box.style.height = `${rect.height}px`;
        box.style.border = `2px solid ${color}`;
        box.style.backgroundColor = `${color}10`; // 10% opacity fill
        box.style.boxSizing = 'border-box';

        const tag = document.createElement('div');
        tag.textContent = label;
        tag.style.position = 'absolute';
        tag.style.top = '-20px';
        tag.style.left = '0';
        tag.style.background = color;
        tag.style.color = 'white';
        tag.style.fontSize = '12px';
        tag.style.padding = '2px 6px';
        tag.style.borderRadius = '4px 4px 0 0';
        tag.style.whiteSpace = 'nowrap';
        tag.style.fontWeight = 'bold';

        box.appendChild(tag);
        root.appendChild(box);
        count++;
    };

    // Label Hero
    // Note: heroText returns text string, not element. Need element reference.
    // We will rely on re-querying simple selectors here for visual confirmation
    const heroEl = document.querySelector('h1') || document.querySelector('.hero');
    if (heroEl) addBox(heroEl, 'Hero Section', colors.hero);

    // Label CTA
    if (elements.primaryCTA?.position) {
        // Create a fake element-like object for the box if we have position
        // OR better: re-query. PrimaryCTA logic captures position but not element ref in final object.
        // Let's use the position data we already captured in detectPrimaryCTA if available.
    }
    // Actually, detect functions return objects. Let's adjust detectCROElements to return elements 
    // OR just duplicate simple detection here for the visual layer.
    // Simpler: Just re-run a lightweight detection for visualization to avoid breaking data structure.

    // 1. Hero
    document.querySelectorAll('h1, .hero, header').forEach(el => {
        if (el.offsetHeight > 50) addBox(el, 'Hero / Header', colors.hero);
    });

    // 2. CTAs
    document.querySelectorAll('button, a.btn, .cta, [class*="primary"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 20) addBox(el, 'CTA', colors.primaryCTA);
    });

    // 3. Forms
    document.querySelectorAll('form').forEach((el, i) => {
        addBox(el, `Form ${i + 1}`, colors.forms);
    });

    // 4. Nav
    document.querySelectorAll('nav').forEach(el => {
        addBox(el, 'Navigation', colors.navigation);
    });

    document.body.appendChild(root);
    return count;
}

function hideElementLabels() {
    const existing = document.getElementById('ai-architect-labels');
    if (existing) existing.remove();
}

async function getCROData() {
    // Check if html2canvas is loaded with retries
    let hasHtml2Canvas = typeof html2canvas !== 'undefined';
    let attempts = 0;
    while (!hasHtml2Canvas && attempts < 10) {
        await new Promise(r => setTimeout(r, 100));
        hasHtml2Canvas = typeof html2canvas !== 'undefined';
        attempts++;
    }

    let screenshots = { viewport: null, fullPage: null };
    const elements = detectCROElements(); // Capture data first

    if (hasHtml2Canvas) {
        try {
            console.log('📸 Starting screenshot capture with visual labels...');

            // SHOW LABELS
            showElementLabels(elements);
            await new Promise(r => setTimeout(r, 100)); // Render frame

            // Wrap screenshot capture in a timeout so it never blocks CRO data return
            const screenshotWithTimeout = new Promise((resolve) => {
                const timer = setTimeout(() => {
                    console.warn('⚠️ Screenshot capture timed out after 10s, skipping...');
                    resolve({ viewport: null, fullPage: null });
                }, 10000);
                captureHybridScreenshots()
                    .then(result => { clearTimeout(timer); resolve(result); })
                    .catch(() => { clearTimeout(timer); resolve({ viewport: null, fullPage: null }); });
            });

            screenshots = await screenshotWithTimeout;

            // HIDE LABELS
            hideElementLabels();

            console.log('✅ Screenshots captured');
        } catch (e) {
            console.error('Screenshot capture failed:', e);
            hideElementLabels(); // Safety cleanup
        }
    } else {
        console.warn('html2canvas not found after waiting - skipping screenshot capture');
    }

    return {
        title: document.title,
        url: window.location.href,
        meta: getMetaInfo(),
        headings: getHeadings(),
        visibleText: getVisibleText(),
        croElements: elements,
        screenshots,
        timestamp: Date.now()
    };
}

// --- Screenshot Capture Logic ---

async function captureViewportScreenshot() {
    try {
        const canvas = await html2canvas(document.body, {
            x: window.scrollX,
            y: window.scrollY,
            width: window.innerWidth,
            height: window.innerHeight,
            scale: 1,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: null
        });

        return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
        console.error('Viewport capture failed:', error);
        return null;
    }
}

async function captureFullPageScreenshot() {
    try {
        // Get full page dimensions
        const fullHeight = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
        );
        const fullWidth = Math.max(
            document.body.scrollWidth,
            document.documentElement.scrollWidth
        );

        // Store current scroll position
        const originalScroll = window.scrollY;

        // Scroll to top first
        window.scrollTo(0, 0);
        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = await html2canvas(document.body, {
            x: 0,
            y: 0,
            width: fullWidth,
            height: fullHeight,
            scale: 0.5, // Reduced scale for performance
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: null,
            windowWidth: fullWidth,
            windowHeight: fullHeight
        });

        // Restore scroll position
        window.scrollTo(0, originalScroll);

        return canvas.toDataURL('image/jpeg', 0.7);
    } catch (error) {
        console.error('Full page capture failed:', error);
        return null;
    }
}

async function captureHybridScreenshots() {
    // Start with viewport (fast)
    const viewportPromise = captureViewportScreenshot();

    // Full page capture in parallel but slower
    const fullPagePromise = captureFullPageScreenshot();

    const [viewport, fullPage] = await Promise.all([
        viewportPromise,
        fullPagePromise
    ]);

    return {
        viewport,
        fullPage
    };
}

// --- Element Detection Logic ---

function detectCROElements() {
    return {
        // Primary CTA
        primaryCTA: detectPrimaryCTA(),

        // All CTAs
        allCTAs: detectAllCTAs(),

        // Forms
        forms: detectForms(),

        // Hero content
        heroText: detectHeroText(),
        subheadline: detectSubheadline(),
        hasHeroImage: detectHeroImage(),

        // Trust signals
        testimonials: detectTestimonials(),
        hasTestimonialsAboveFold: detectTestimonialsAboveFold(),
        hasClientLogos: detectClientLogos(),
        hasTrustBadges: detectTrustBadges(),
        hasSecurityBadges: detectSecurityBadges(),
        hasVisibleContact: detectVisibleContact(),

        // Navigation
        navigationItems: detectNavigationItems(),
        hasStickyHeader: detectStickyHeader(),

        // Content
        hasFAQ: detectFAQ(),

        // Psychology triggers
        hasCountdownTimer: detectCountdownTimer(),
        hasAuthoritySignals: detectAuthoritySignals(),

        // E-commerce
        hasGuestCheckout: detectGuestCheckout(),
        pricingTables: detectPricingTables()
    };
}

function detectPrimaryCTA() {
    const viewportHeight = window.innerHeight;
    const buttons = Array.from(document.querySelectorAll('button, a[class*="btn"], a[class*="button"], [class*="cta"], [class*="primary"]'));

    for (const btn of buttons) {
        const rect = btn.getBoundingClientRect();
        const style = window.getComputedStyle(btn);

        if (rect.top < viewportHeight && rect.height > 30 && style.display !== 'none') {
            return {
                text: btn.textContent?.trim() || '',
                visibleAboveFold: true,
                isButton: btn.tagName === 'BUTTON' || style.display === 'inline-block',
                hasBackgroundColor: style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent',
                position: { top: rect.top, left: rect.left }
            };
        }
    }

    const heroLinks = document.querySelectorAll('h1 + a, h2 + a, .hero a, [class*="hero"] a');
    if (heroLinks.length > 0) {
        const link = heroLinks[0];
        const rect = link.getBoundingClientRect();
        return {
            text: link.textContent?.trim() || '',
            visibleAboveFold: rect.top < viewportHeight,
            isButton: false,
            hasBackgroundColor: false,
            position: { top: rect.top, left: rect.left }
        };
    }

    return null;
}

function detectAllCTAs() {
    const ctas = [];
    const ctaSelectors = [
        'button',
        'a[class*="btn"]',
        'a[class*="button"]',
        '[class*="cta"]',
        '[class*="primary"]',
        '[class*="action"]'
    ];

    const elements = document.querySelectorAll(ctaSelectors.join(', '));

    elements.forEach((el, index) => {
        if (index < 10) {
            ctas.push({
                text: el.textContent?.trim()?.substring(0, 50) || '',
                tag: el.tagName.toLowerCase(),
                href: el.href || null
            });
        }
    });

    return ctas;
}

function detectForms() {
    const forms = [];
    const formElements = document.querySelectorAll('form');

    formElements.forEach(form => {
        const inputs = form.querySelectorAll('input, select, textarea');
        const visibleInputs = Array.from(inputs).filter(input => {
            const style = window.getComputedStyle(input);
            return style.display !== 'none' && style.visibility !== 'hidden';
        });

        forms.push({
            fieldCount: visibleInputs.length,
            hasLabels: visibleInputs.some(input => {
                const id = input.id;
                const ariaLabel = input.getAttribute('aria-label');
                const hasLabel = id && document.querySelector(`label[for="${id}"]`);
                return hasLabel || ariaLabel || input.placeholder;
            }),
            isMultiStep: form.querySelector('[class*="step"], [class*="progress"]') !== null,
            hasProgressIndicator: form.querySelector('[class*="progress"], [class*="step-indicator"]') !== null,
            action: form.action || null
        });
    });

    return forms;
}

function detectHeroText() {
    const h1 = document.querySelector('h1');
    if (h1) {
        return h1.textContent?.trim()?.substring(0, 200) || '';
    }

    const heroSelectors = ['.hero', '[class*="hero"]', '[class*="banner"]', 'header'];
    for (const selector of heroSelectors) {
        const hero = document.querySelector(selector);
        if (hero) {
            const heading = hero.querySelector('h1, h2');
            if (heading) {
                return heading.textContent?.trim()?.substring(0, 200) || '';
            }
        }
    }

    return '';
}

function detectSubheadline() {
    const h1 = document.querySelector('h1');
    if (h1) {
        let nextEl = h1.nextElementSibling;
        while (nextEl) {
            const text = nextEl.textContent?.trim();
            if (text && text.length > 20 && text.length < 300) {
                return text.substring(0, 300);
            }
            nextEl = nextEl.nextElementSibling;
        }
    }

    const subSelectors = ['.subtitle', '[class*="subhead"]', '[class*="subtitle"]', 'h2'];
    for (const selector of subSelectors) {
        const el = document.querySelector(selector);
        if (el) {
            const text = el.textContent?.trim();
            if (text && text.length > 10) {
                return text.substring(0, 300);
            }
        }
    }

    return '';
}

function detectHeroImage() {
    const viewportHeight = window.innerHeight;
    const images = document.querySelectorAll('img, [class*="hero"] img, [class*="banner"] img');

    for (const img of images) {
        const rect = img.getBoundingClientRect();
        if (rect.top < viewportHeight && rect.height > 100) {
            return true;
        }
    }

    return false;
}

function detectTestimonials() {
    const testimonials = [];
    const testimonialSelectors = [
        '[class*="testimonial"]',
        '[class*="review"]',
        '[class*="quote"]'
    ];

    const elements = document.querySelectorAll(testimonialSelectors.join(', '));

    elements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length > 30) {
            testimonials.push(text.substring(0, 200));
        }
    });

    return testimonials.slice(0, 5);
}

function detectTestimonialsAboveFold() {
    const viewportHeight = window.innerHeight;
    const testimonialSelectors = [
        '[class*="testimonial"]',
        '[class*="review"]',
        '[class*="social-proof"]'
    ];

    const elements = document.querySelectorAll(testimonialSelectors.join(', '));

    for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (rect.top < viewportHeight) {
            return true;
        }
    }

    return false;
}

function detectClientLogos() {
    const logoSelectors = [
        '[class*="logo"]',
        '[class*="client"]',
        '[class*="partner"]'
    ];

    const logoSection = document.querySelector(logoSelectors.join(', '));
    return logoSection !== null;
}

function detectTrustBadges() {
    const badgeKeywords = ['secure', 'guarantee', 'verified', 'trusted', 'protected', 'ssl', ' Norton', 'McAfee'];
    const text = document.body.textContent?.toLowerCase() || '';

    return badgeKeywords.some(keyword => text.includes(keyword.toLowerCase()));
}

function detectSecurityBadges() {
    const securitySelectors = [
        '[class*="secure"]',
        '[class*="ssl"]',
        '[class*="lock"]',
        'img[alt*="secure" i]',
        'img[alt*=" Norton" i]',
        'img[alt*="McAfee" i]'
    ];

    return document.querySelector(securitySelectors.join(', ')) !== null;
}

function detectVisibleContact() {
    const contactSelectors = [
        'a[href^="tel:"]',
        'a[href^="mailto:"]',
        '[class*="contact"]',
        '[class*="phone"]',
        '[class*="chat"]'
    ];

    const contactEl = document.querySelector(contactSelectors.join(', '));
    return contactEl !== null;
}

function detectNavigationItems() {
    const nav = document.querySelector('nav, [class*="nav"], [class*="menu"]');
    if (!nav) return [];

    const links = nav.querySelectorAll('a');
    return Array.from(links).map(a => a.textContent?.trim()).filter(Boolean);
}

function detectStickyHeader() {
    const header = document.querySelector('header, [class*="header"]');
    if (!header) return false;

    const style = window.getComputedStyle(header);
    return style.position === 'fixed' || style.position === 'sticky';
}

function detectFAQ() {
    const faqSelectors = [
        '[class*="faq"]',
        '[id*="faq"]',
        '[class*="question"]',
        'details',
        '[class*="accordion"]'
    ];

    return document.querySelector(faqSelectors.join(', ')) !== null;
}

function detectCountdownTimer() {
    const timerSelectors = [
        '[class*="countdown"]',
        '[class*="timer"]',
        '[class*="clock"]'
    ];

    return document.querySelector(timerSelectors.join(', ')) !== null;
}

function detectAuthoritySignals() {
    const authorityKeywords = ['as seen on', 'featured in', 'award', 'certified', 'verified by'];
    const text = document.body.textContent?.toLowerCase() || '';

    return authorityKeywords.some(keyword => text.includes(keyword));
}

function detectGuestCheckout() {
    const checkoutText = document.body.textContent?.toLowerCase() || '';
    const hasCheckout = checkoutText.includes('checkout') || checkoutText.includes('cart');
    const hasGuest = checkoutText.includes('guest checkout') || checkoutText.includes('continue as guest');

    if (!hasCheckout) return null;
    return hasGuest;
}

function detectPricingTables() {
    const pricingSelectors = [
        '[class*="pricing"]',
        '[class*="price"]',
        '[class*="plan"]'
    ];

    const pricingElements = document.querySelectorAll(pricingSelectors.join(', '));
    return pricingElements.length;
}
