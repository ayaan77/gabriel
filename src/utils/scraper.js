// Human-like scraping utilities
// Adds random delays, realistic user-agents, and rate limiting

const USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

// Random delay between min and max milliseconds
function randomDelay(min = 500, max = 2000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
}

// Get a random user agent
function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Fetch with human-like behavior
export async function humanLikeFetch(url, options = {}) {
    // Random delay before request (simulate human reading/clicking)
    await randomDelay(500, 1500);

    const headers = {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        ...options.headers
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'omit' // Don't send cookies
        });

        // Random delay after response (simulate human processing)
        await randomDelay(300, 800);

        return response;
    } catch (error) {
        throw new Error(`Fetch failed: ${error.message}`);
    }
}

// Exponential backoff for rate limiting
export async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await humanLikeFetch(url, options);

            if (response.status === 429) {
                // Rate limited - exponential backoff
                const backoffMs = Math.pow(2, i) * 1000 + Math.random() * 1000;
                console.warn(`Rate limited, retrying in ${backoffMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoffMs));
                continue;
            }

            if (!response.ok && response.status >= 500) {
                // Server error - retry
                const backoffMs = Math.pow(2, i) * 500;
                await new Promise(resolve => setTimeout(resolve, backoffMs));
                continue;
            }

            return response;
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                const backoffMs = Math.pow(2, i) * 1000;
                await new Promise(resolve => setTimeout(resolve, backoffMs));
            }
        }
    }

    throw lastError || new Error('Max retries exceeded');
}

// Extract domain from URL
export function extractDomain(url) {
    try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        return urlObj.hostname.replace(/^www\./, '');
    } catch {
        return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    }
}

// Check if URL is accessible
export async function isUrlAccessible(url) {
    try {
        const response = await humanLikeFetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}
