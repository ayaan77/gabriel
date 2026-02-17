export async function analyzeWebsite(url) {
    try {
        // 1. Tech Stack Detection
        const stack = await detectTechStack(url);

        // 2. Meta Ads Link
        // Handle invalid URL via try-catch or regex before this
        const hostname = new URL(url).hostname.replace('www.', '');
        const metaAdsUrl = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${hostname}`;

        // 3. Google Transparency Link
        const googleAdsUrl = `https://adstransparency.google.com/?region=anywhere&domain=${hostname}`;

        return {
            domain: hostname,
            stack,
            metaAdsUrl,
            googleAdsUrl,
            estimatedTraffic: 'Traffic data requires paid API (SimilarWeb)',
        };
    } catch (error) {
        console.error('Analysis failed:', error);
        throw new Error('Analysis failed: ' + error.message);
    }
}

async function detectTechStack(url) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
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

        // Check headers if allowed (often restricted in simple fetch)
        // In extension context, we could use webRequest API but fetch is simpler for MVP

        return stack;
    } catch (err) {
        if (err.name === 'AbortError') return { error: 'Timeout: Site took too long to respond' };
        return { error: 'Could not fetch site: ' + err.message };
    }
}
