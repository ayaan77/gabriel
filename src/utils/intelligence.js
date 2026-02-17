export async function analyzeWebsite(url) {
    try {
        // 1. Fetch Page (Handle CORS)
        const html = await fetchPage(url);

        // 2. Tech Stack Detection
        const stack = detectTechStack(html);

        // 3. Meta Ads Link
        // Handle invalid URL via try-catch or regex before this
        const hostname = new URL(url).hostname.replace('www.', '');
        const metaAdsUrl = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${hostname}`;

        // 4. Google Transparency Link
        const googleAdsUrl = `https://adstransparency.google.com/?region=anywhere&domain=${hostname}`;

        // 5. Extract Page Content
        const pageContent = extractPageContent(html);

        return {
            domain: hostname,
            stack,
            metaAdsUrl,
            googleAdsUrl,
            pageContent,
            estimatedTraffic: 'Traffic data requires paid API (SimilarWeb)',
        };
    } catch (error) {
        console.error('Analysis failed:', error);
        throw new Error('Analysis failed: ' + error.message);
    }
}

async function fetchPage(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased to 15s

    try {
        // Try direct fetch first
        // credentials: 'omit' prevents sending cookies, which avoids some CORS issues and unnecessary data transfer
        const response = await fetch(url, {
            signal: controller.signal,
            credentials: 'omit',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (compatible; GabrielBot/1.0; +http://gabriel.ai)'
            }
        });
        clearTimeout(timeoutId);
        if (response.ok) return await response.text();
        throw new Error(`Direct fetch failed: ${response.status}`);
    } catch (e) {
        if (e.name === 'AbortError') {
            clearTimeout(timeoutId);
            throw new Error('Timeout: Site took too long to respond');
        }
        console.log('Direct fetch failed, trying proxy...', e.message);

        // Fallback to CORS proxy
        // We use a fresh controller for the retry
        const proxyController = new AbortController();
        const proxyTimeoutId = setTimeout(() => proxyController.abort(), 15000);

        try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl, {
                signal: proxyController.signal,
                credentials: 'omit'
            });
            clearTimeout(proxyTimeoutId);
            if (!response.ok) throw new Error(`Proxy HTTP ${response.status}`);
            return await response.text();
        } catch (proxyErr) {
            clearTimeout(proxyTimeoutId);
            throw new Error(`Analysis failed. The site might be blocking bots. (${proxyErr.message})`);
        }
    }
}

function detectTechStack(html) {
    try {
        const lowerHtml = html.toLowerCase();

        const stack = {
            frontend: [],
            backend: [], // Hard to detect backend from frontend only, but can guess
            analytics: [],
            cms: []
        };

        // Simple heuristic detection
        if (lowerHtml.includes('react') || lowerHtml.includes('_next')) stack.frontend.push('React / Next.js');
        if (lowerHtml.includes('vue')) stack.frontend.push('Vue.js');
        if (lowerHtml.includes('angular')) stack.frontend.push('Angular');
        if (lowerHtml.includes('svelte')) stack.frontend.push('Svelte');
        if (lowerHtml.includes('tailwind')) stack.frontend.push('Tailwind CSS');
        if (lowerHtml.includes('bootstrap')) stack.frontend.push('Bootstrap');
        if (lowerHtml.includes('jquery')) stack.frontend.push('jQuery');

        if (lowerHtml.includes('shopify')) stack.cms.push('Shopify');
        if (lowerHtml.includes('wp-content')) stack.cms.push('WordPress');
        if (lowerHtml.includes('wix')) stack.cms.push('Wix');
        if (lowerHtml.includes('squarespace')) stack.cms.push('Squarespace');

        if (lowerHtml.includes('googletagmanager') || lowerHtml.includes('ua-')) stack.analytics.push('Google Analytics');
        if (lowerHtml.includes('hotjar')) stack.analytics.push('Hotjar');
        if (lowerHtml.includes('segment')) stack.analytics.push('Segment');
        if (lowerHtml.includes('mixpanel')) stack.analytics.push('Mixpanel');
        if (lowerHtml.includes('fbevents.js')) stack.analytics.push('Facebook Pixel');

        return stack;
    } catch (err) {
        return { error: 'Tech detection failed: ' + err.message };
    }
}

// RESTORED: Extract meaningful content from HTML
function extractPageContent(html) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const content = {
            title: '',
            description: '',
            headings: [],
            keyPhrases: []
        };

        // Title
        const titleTag = doc.querySelector('title');
        if (titleTag) content.title = titleTag.textContent.trim();

        // Meta description
        const metaDesc = doc.querySelector('meta[name="description"], meta[property="og:description"]');
        if (metaDesc) content.description = metaDesc.getAttribute('content') || '';

        // Headings (H1, H2)
        const h1s = Array.from(doc.querySelectorAll('h1')).map(h => h.textContent.trim()).filter(t => t.length > 0);
        const h2s = Array.from(doc.querySelectorAll('h2')).map(h => h.textContent.trim()).filter(t => t.length > 0).slice(0, 5);
        content.headings = [...h1s, ...h2s];

        // Extract visible text (first 2000 chars)
        const bodyText = doc.body?.innerText || '';
        const cleanText = bodyText.replace(/\s+/g, ' ').trim();
        content.keyPhrases = cleanText.substring(0, 2000);

        return content;
    } catch (e) {
        console.error('Content extraction failed:', e);
        return { title: 'Error extracting content', description: '', headings: [], keyPhrases: '' };
    }
}
