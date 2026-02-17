// CRO Capture Module
// Handles screenshot capture and CRO-specific element detection

import html2canvas from 'html2canvas';

/**
 * Capture viewport screenshot (above the fold)
 * @returns {Promise<string>} Base64 image data
 */
export async function captureViewportScreenshot() {
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

/**
 * Capture full page screenshot
 * @returns {Promise<string>} Base64 image data
 */
export async function captureFullPageScreenshot() {
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

/**
 * Hybrid capture: viewport first, then full page async
 * @returns {Promise<Object>} {viewport, fullPage}
 */
export async function captureHybridScreenshots() {
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
    fullPage,
    timestamp: Date.now()
  };
}

/**
 * Detect CRO-specific elements from the page
 * @returns {Object} CRO element data
 */
export function detectCROElements() {
  const elements = {
    // Primary CTA detection
    primaryCTA: detectPrimaryCTA(),
    
    // All CTAs
    allCTAs: detectAllCTAs(),
    
    // Forms
    forms: detectForms(),
    
    // Hero section
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
    
    // Content sections
    hasFAQ: detectFAQ(),
    
    // Psychological triggers
    hasCountdownTimer: detectCountdownTimer(),
    hasAuthoritySignals: detectAuthoritySignals(),
    
    // Special elements
    hasGuestCheckout: detectGuestCheckout(),
    pricingTables: detectPricingTables()
  };
  
  return elements;
}

// Individual detection functions

function detectPrimaryCTA() {
  // Look for prominent buttons above the fold
  const viewportHeight = window.innerHeight;
  const buttons = Array.from(document.querySelectorAll('button, a[class*="btn"], a[class*="button"], [class*="cta"], [class*="primary"]'));
  
  for (const btn of buttons) {
    const rect = btn.getBoundingClientRect();
    const style = window.getComputedStyle(btn);
    
    // Check if visible and above fold
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
  
  // Fallback: look for any prominent link
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
    if (index < 10) { // Limit to first 10
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
  
  // Try to find hero section text
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
  // Look for text immediately after H1
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
  
  // Look for subtitle classes
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
  // Check for checkout-related text
  const checkoutText = document.body.textContent?.toLowerCase() || '';
  const hasCheckout = checkoutText.includes('checkout') || checkoutText.includes('cart');
  const hasGuest = checkoutText.includes('guest checkout') || checkoutText.includes('continue as guest');
  
  if (!hasCheckout) return null; // Not an e-commerce site
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

/**
 * Get complete CRO data package for analysis
 * @returns {Promise<Object>} Complete page data
 */
export async function getCROData() {
  const [screenshots, visibleText] = await Promise.all([
    captureHybridScreenshots(),
    getVisibleText()
  ]);
  
  const croElements = detectCROElements();
  
  return {
    screenshots,
    croElements,
    visibleText,
    url: window.location.href,
    title: document.title,
    timestamp: Date.now()
  };
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

export default {
  captureViewportScreenshot,
  captureFullPageScreenshot,
  captureHybridScreenshots,
  detectCROElements,
  getCROData
};