// Optimized tech stack detection from DOM
// Detects frameworks, platforms, analytics, and tools

export function detectTechStack(dom) {
    const tech = {
        platform: null,
        frontend: [],
        backend: [],
        analytics: [],
        ecommerce: null,
        cms: null,
        hosting: null
    };

    const html = dom || document.documentElement.outerHTML;
    const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
    const metas = Array.from(document.querySelectorAll('meta')).reduce((acc, m) => {
        const name = m.getAttribute('name') || m.getAttribute('property');
        if (name) acc[name] = m.getAttribute('content');
        return acc;
    }, {});

    // E-commerce platforms
    if (html.includes('Shopify.theme') || html.includes('cdn.shopify.com')) {
        tech.platform = 'Shopify';
        tech.ecommerce = 'Shopify';
    } else if (html.includes('woocommerce') || html.includes('WooCommerce')) {
        tech.platform = 'WooCommerce';
        tech.ecommerce = 'WooCommerce';
    } else if (html.includes('bigcommerce')) {
        tech.platform = 'BigCommerce';
        tech.ecommerce = 'BigCommerce';
    } else if (html.includes('magento') || html.includes('Mage.')) {
        tech.platform = 'Magento';
        tech.ecommerce = 'Magento';
    }

    // CMS
    if (html.includes('wp-content') || html.includes('wordpress')) {
        tech.cms = 'WordPress';
    } else if (html.includes('drupal')) {
        tech.cms = 'Drupal';
    } else if (html.includes('joomla')) {
        tech.cms = 'Joomla';
    } else if (metas.generator?.includes('Wix')) {
        tech.cms = 'Wix';
        tech.platform = 'Wix';
    } else if (html.includes('squarespace')) {
        tech.cms = 'Squarespace';
        tech.platform = 'Squarespace';
    } else if (html.includes('webflow')) {
        tech.cms = 'Webflow';
        tech.platform = 'Webflow';
    }

    // Frontend frameworks
    if (window.React || html.includes('react') || scripts.some(s => s.includes('react'))) {
        tech.frontend.push('React');
    }
    if (window.Vue || html.includes('vue.js') || scripts.some(s => s.includes('vue'))) {
        tech.frontend.push('Vue.js');
    }
    if (window.angular || html.includes('ng-app') || html.includes('angular')) {
        tech.frontend.push('Angular');
    }
    if (window.Svelte || scripts.some(s => s.includes('svelte'))) {
        tech.frontend.push('Svelte');
    }
    if (window.jQuery || window.$ || scripts.some(s => s.includes('jquery'))) {
        tech.frontend.push('jQuery');
    }
    if (html.includes('next.js') || html.includes('__NEXT_DATA__')) {
        tech.frontend.push('Next.js');
    }
    if (html.includes('nuxt') || html.includes('__NUXT__')) {
        tech.frontend.push('Nuxt.js');
    }

    // Analytics & Tracking
    if (scripts.some(s => s.includes('google-analytics') || s.includes('gtag'))) {
        tech.analytics.push('Google Analytics');
    }
    if (scripts.some(s => s.includes('googletagmanager'))) {
        tech.analytics.push('Google Tag Manager');
    }
    if (scripts.some(s => s.includes('facebook') || s.includes('fbevents'))) {
        tech.analytics.push('Facebook Pixel');
    }
    if (scripts.some(s => s.includes('hotjar'))) {
        tech.analytics.push('Hotjar');
    }
    if (scripts.some(s => s.includes('segment'))) {
        tech.analytics.push('Segment');
    }
    if (scripts.some(s => s.includes('mixpanel'))) {
        tech.analytics.push('Mixpanel');
    }

    // Hosting/CDN
    if (scripts.some(s => s.includes('cloudflare'))) {
        tech.hosting = 'Cloudflare';
    } else if (scripts.some(s => s.includes('amazonaws'))) {
        tech.hosting = 'AWS';
    } else if (scripts.some(s => s.includes('vercel'))) {
        tech.hosting = 'Vercel';
    } else if (scripts.some(s => s.includes('netlify'))) {
        tech.hosting = 'Netlify';
    }

    return tech;
}

// Detect conversion signals (orders, checkouts)
export function detectConversionSignals() {
    const signals = {
        hasCheckout: false,
        hasCart: false,
        hasOrderConfirmation: false,
        ecommerceDetected: false
    };

    const bodyText = document.body.innerText.toLowerCase();
    const buttons = Array.from(document.querySelectorAll('button, a')).map(el => el.textContent.toLowerCase());

    // Check for checkout/cart buttons
    signals.hasCheckout = buttons.some(text =>
        text.includes('checkout') ||
        text.includes('proceed to') ||
        text.includes('complete order')
    );

    signals.hasCart = buttons.some(text =>
        text.includes('add to cart') ||
        text.includes('add to bag') ||
        text.includes('buy now')
    );

    // Check for order confirmation
    signals.hasOrderConfirmation =
        bodyText.includes('order confirmed') ||
        bodyText.includes('thank you for your order') ||
        bodyText.includes('order number') ||
        bodyText.includes('order complete');

    // E-commerce platform detection
    signals.ecommerceDetected =
        document.querySelector('[data-shopify]') !== null ||
        document.querySelector('.woocommerce') !== null ||
        document.querySelector('[data-cart]') !== null;

    return signals;
}
