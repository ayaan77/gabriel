// Main competitive intelligence engine
// Orchestrates tech detection, traffic estimation, and AI analysis

import { getIntelligence, saveIntelligence } from './cache';
import { extractDomain, humanLikeFetch } from './scraper';
import { detectTechStack, detectConversionSignals } from './techDetector';
import { chatWithAI } from './ai';

// Estimate traffic based on heuristics
function estimateTraffic(domain, techStack) {
    // This is a simplified heuristic-based estimation
    // In production, you'd use APIs like SimilarWeb, but those require paid plans

    const signals = {
        hasAnalytics: techStack.analytics.length > 0,
        hasFacebookPixel: techStack.analytics.includes('Facebook Pixel'),
        isEcommerce: !!techStack.ecommerce,
        platform: techStack.platform
    };

    let estimate = 'Unknown';
    let confidence = 'Low';

    if (signals.isEcommerce) {
        if (signals.hasFacebookPixel && techStack.analytics.length >= 2) {
            estimate = '10K-100K monthly visits';
            confidence = 'Medium';
        } else if (techStack.analytics.length >= 1) {
            estimate = '5K-50K monthly visits';
            confidence = 'Low-Medium';
        } else {
            estimate = '1K-10K monthly visits';
            confidence = 'Low';
        }
    } else if (techStack.analytics.length >= 2) {
        estimate = '5K-25K monthly visits';
        confidence = 'Low';
    } else if (techStack.platform) {
        // Platform detected but no analytics -> likely small but active
        estimate = '< 5K monthly visits';
        confidence = 'Low';
    }

    return { estimate, confidence, signals };
}

// Extract meaningful content from the page
function extractPageContent(doc, html) {
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

    // Extract key phrases from visible text (first 2000 chars)
    const bodyText = doc.body?.innerText || '';
    const cleanText = bodyText.replace(/\s+/g, ' ').trim();
    content.keyPhrases = cleanText.substring(0, 2000); // Increased from 500 to 2000

    return content;
}

// Build context for AI analysis
function buildAnalysisContext(domain, techStack, traffic, conversionSignals, pageContent) {
    let context = `Analyze this competitor: ${domain}\n\n`;

    // Page Content (NEW)
    context += `**Page Content:**\n`;
    if (pageContent.title) context += `- Title: ${pageContent.title}\n`;
    if (pageContent.description) context += `- Description: ${pageContent.description}\n`;
    if (pageContent.headings.length > 0) context += `- Key Headings: ${pageContent.headings.slice(0, 5).join(' | ')}\n`;
    if (pageContent.keyPhrases) context += `- Sample Text: "${pageContent.keyPhrases.substring(0, 800)}..."\n`;

    context += `\n**Tech Stack:**\n`;
    if (techStack.platform) context += `- Platform: ${techStack.platform}\n`;
    if (techStack.ecommerce) context += `- E-commerce: ${techStack.ecommerce}\n`;
    if (techStack.cms) context += `- CMS: ${techStack.cms}\n`;
    if (techStack.frontend.length > 0) context += `- Frontend: ${techStack.frontend.join(', ')}\n`;
    if (techStack.analytics.length > 0) context += `- Analytics: ${techStack.analytics.join(', ')}\n`;
    if (techStack.hosting) context += `- Hosting: ${techStack.hosting}\n`;

    context += `\n**Traffic Estimate:** ${traffic.estimate} (confidence: ${traffic.confidence})\n`;

    context += `\n**Conversion Signals:**\n`;
    context += `- Has Checkout: ${conversionSignals.hasCheckout ? 'Yes' : 'No'}\n`;
    context += `- Has Cart: ${conversionSignals.hasCart ? 'Yes' : 'No'}\n`;
    context += `- E-commerce Detected: ${conversionSignals.ecommerceDetected ? 'Yes' : 'No'}\n`;

    return context;
}

// Main intelligence function
export async function analyzeCompetitor(url, apiKey, modelTier = 'high') {
    const domain = extractDomain(url);

    // Check cache first
    const cached = await getIntelligence(domain);
    if (cached) {
        return { ...cached, fromCache: true };
    }

    try {
        // Fetch the page
        const response = await humanLikeFetch(url.startsWith('http') ? url : `https://${url}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }

        const html = await response.text();

        // Parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract page content (NEW)
        const pageContent = extractPageContent(doc, html);

        // Detect tech stack
        const techStack = detectTechStack(html);

        // Estimate traffic
        const traffic = estimateTraffic(domain, techStack);

        // Detect conversion signals
        const conversionSignals = {
            hasCheckout: html.toLowerCase().includes('checkout') || html.toLowerCase().includes('add to cart'),
            hasCart: html.toLowerCase().includes('cart') || html.toLowerCase().includes('bag'),
            hasOrderConfirmation: false,
            ecommerceDetected: !!techStack.ecommerce
        };

        // Build AI analysis context (with page content)
        const analysisPrompt = buildAnalysisContext(domain, techStack, traffic, conversionSignals, pageContent);

        // Simulate "thinking" delay (5-10 seconds)
        const thinkingTime = 5000 + Math.random() * 5000; // 5-10 seconds
        await new Promise(resolve => setTimeout(resolve, thinkingTime));

        // Get AI insights
        const aiAnalysis = await chatWithAI(
            [{ role: 'user', content: analysisPrompt }],
            apiKey,
            'spy',
            modelTier
        );

        // Build final report
        const report = {
            domain,
            url,
            techStack,
            traffic,
            conversionSignals,
            aiAnalysis,
            metaAdsNote: 'To check active Meta ads, visit: https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=' + encodeURIComponent(domain),
            timestamp: Date.now()
        };

        // Cache the report
        await saveIntelligence(domain, report);

        return { ...report, fromCache: false };
    } catch (error) {
        throw new Error(`Intelligence gathering failed: ${error.message}`);
    }
}

// Quick tech check (no AI, just tech stack)
export async function quickTechCheck(url) {
    const domain = extractDomain(url);

    try {
        const response = await humanLikeFetch(url.startsWith('http') ? url : `https://${url}`);
        const html = await response.text();
        const techStack = detectTechStack(html);

        return { domain, techStack };
    } catch (error) {
        throw new Error(`Tech check failed: ${error.message}`);
    }
}
