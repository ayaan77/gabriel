// CRO Knowledge Base - RAG Pattern Library
// Contains 60+ conversion optimization patterns based on industry best practices

export const CRO_PATTERNS = {
  // ============================================
  // SECTION 1: FIRST IMPRESSION & ABOVE-THE-FOLD
  // ============================================
  firstImpression: [
    {
      id: 'hero-clarity',
      name: 'Clear Value Proposition in Hero',
      pattern: 'Hero section contains clear headline stating value proposition within 5 seconds',
      weight: 10,
      category: 'firstImpression',
      check: (data) => {
        const hasH1 = data.headings?.some(h => h.level === 'H1');
        const heroText = data.croElements?.heroText || '';
        return hasH1 && heroText.length > 20;
      },
      antiPattern: 'Vague or missing headline above the fold',
      impact: 'Users bounce within 3 seconds without understanding value'
    },
    {
      id: 'visual-hierarchy',
      name: 'Visual Hierarchy Clarity',
      pattern: 'Clear visual hierarchy: H1 > Subheadline > Supporting text',
      weight: 9,
      category: 'firstImpression',
      check: (data) => {
        const h1 = data.headings?.filter(h => h.level === 'H1').length;
        const h2 = data.headings?.filter(h => h.level === 'H2').length;
        return h1 >= 1 && h2 >= 1;
      },
      antiPattern: 'All text same size, no clear hierarchy',
      impact: 'Cognitive overload, users cannot scan quickly'
    },
    {
      id: 'hero-image',
      name: 'Relevant Hero Visual',
      pattern: 'Hero contains relevant image/illustration supporting the value prop',
      weight: 8,
      category: 'firstImpression',
      check: (data) => {
        return data.croElements?.hasHeroImage || false;
      },
      antiPattern: 'Generic stock photos or no visual',
      impact: 'Lack of context and emotional connection'
    },
    {
      id: 'five-second-test',
      name: 'Five-Second Test Pass',
      pattern: 'User can understand what the page offers within 5 seconds',
      weight: 10,
      category: 'firstImpression',
      check: (data) => {
        const heroText = data.croElements?.heroText || '';
        const hasClearHeadline = heroText.length > 10 && heroText.length < 150;
        const hasSupportingText = data.croElements?.subheadline?.length > 20;
        return hasClearHeadline && hasSupportingText;
      },
      antiPattern: 'Confusing or cluttered above-fold content',
      impact: 'High bounce rate, poor ad performance'
    }
  ],

  // ============================================
  // SECTION 2: CTA OPTIMIZATION
  // ============================================
  ctaOptimization: [
    {
      id: 'cta-above-fold',
      name: 'Primary CTA Above the Fold',
      pattern: 'Clear primary call-to-action visible without scrolling',
      weight: 10,
      category: 'cta',
      check: (data) => {
        return data.croElements?.primaryCTA?.visibleAboveFold || false;
      },
      antiPattern: 'No clear action button visible on page load',
      impact: 'Users don\'t know what to do next'
    },
    {
      id: 'cta-contrast',
      name: 'CTA Visual Contrast',
      pattern: 'Primary CTA button contrasts strongly with background',
      weight: 9,
      category: 'cta',
      check: (data) => {
        const cta = data.croElements?.primaryCTA;
        return cta && (cta.hasBackgroundColor || cta.isButton);
      },
      antiPattern: 'CTA looks like regular text link',
      impact: 'Low click-through rate, conversion drop'
    },
    {
      id: 'cta-action-copy',
      name: 'Action-Oriented CTA Copy',
      pattern: 'CTA uses action verbs: "Get", "Start", "Try", "Claim"',
      weight: 8,
      category: 'cta',
      check: (data) => {
        const ctaText = data.croElements?.primaryCTA?.text || '';
        const actionWords = ['get', 'start', 'try', 'claim', 'download', 'buy', 'shop', 'join', 'create', 'build'];
        return actionWords.some(word => ctaText.toLowerCase().includes(word));
      },
      antiPattern: 'Generic "Submit" or "Click Here" text',
      impact: 'Low conversion rate, unclear user benefit'
    },
    {
      id: 'cta-benefit',
      name: 'CTA Communicates Benefit',
      pattern: 'CTA text explains what user gets: "Get My Free Guide"',
      weight: 8,
      category: 'cta',
      check: (data) => {
        const ctaText = data.croElements?.primaryCTA?.text || '';
        return ctaText.length > 8 && (ctaText.toLowerCase().includes('free') || ctaText.toLowerCase().includes('my') || ctaText.toLowerCase().includes('now'));
      },
      antiPattern: 'Vague action without benefit',
      impact: 'Lower motivation to click'
    },
    {
      id: 'multiple-ctas',
      name: 'Strategic Multiple CTAs',
      pattern: 'Multiple CTAs placed strategically throughout long pages',
      weight: 7,
      category: 'cta',
      check: (data) => {
        return (data.croElements?.allCTAs?.length || 0) >= 2;
      },
      antiPattern: 'Only one CTA at bottom of long page',
      impact: 'Users who don\'t scroll miss conversion opportunity'
    },
    {
      id: 'cta-white-space',
      name: 'CTA Surrounded by White Space',
      pattern: 'Primary CTA has breathing room, not crowded',
      weight: 7,
      category: 'cta',
      // eslint-disable-next-line no-unused-vars
      check: (_data) => {
        // This requires visual analysis, mark as needs AI review
        return null;
      },
      antiPattern: 'CTA buried in cluttered layout',
      impact: 'Visual noise reduces click rates'
    }
  ],

  // ============================================
  // SECTION 3: FORM OPTIMIZATION
  // ============================================
  formOptimization: [
    {
      id: 'form-field-count',
      name: 'Minimal Form Fields',
      pattern: 'Forms have 3-5 fields maximum for initial conversion',
      weight: 9,
      category: 'form',
      check: (data) => {
        const forms = data.croElements?.forms || [];
        return forms.every(form => form.fieldCount <= 5);
      },
      antiPattern: '10+ field forms requiring too much information upfront',
      impact: 'Form abandonment rate > 60%'
    },
    {
      id: 'form-labels',
      name: 'Clear Form Labels',
      pattern: 'Every form field has clear, descriptive label',
      weight: 8,
      category: 'form',
      check: (data) => {
        const forms = data.croElements?.forms || [];
        return forms.every(form => form.hasLabels);
      },
      antiPattern: 'Placeholder-only fields without labels',
      impact: 'User confusion, accessibility issues, lower completion'
    },
    {
      id: 'form-validation',
      name: 'Real-Time Validation',
      pattern: 'Form shows inline validation errors immediately',
      weight: 7,
      category: 'form',
      // eslint-disable-next-line no-unused-vars
      check: (_data) => {
        // Requires interaction testing, flag for AI review
        return null;
      },
      antiPattern: 'Errors only shown after submit',
      impact: 'Frustration, higher abandonment'
    },
    {
      id: 'form-progress',
      name: 'Multi-Step Form Indicators',
      pattern: 'Long forms show progress (Step 2 of 4)',
      weight: 7,
      category: 'form',
      check: (data) => {
        const forms = data.croElements?.forms || [];
        return forms.some(form => form.isMultiStep && form.hasProgressIndicator);
      },
      antiPattern: 'No indication of form length',
      impact: 'Users abandon long forms not knowing how much remains'
    },
    {
      id: 'form-security',
      name: 'Security Indicators',
      pattern: 'Forms show security badges/trust signals near submit',
      weight: 8,
      category: 'form',
      check: (data) => {
        return data.croElements?.hasSecurityBadges || false;
      },
      antiPattern: 'No security reassurance near sensitive fields',
      impact: 'Anxiety about data privacy, lower conversion'
    },
    {
      id: 'form-guest-checkout',
      name: 'Guest Checkout Option',
      pattern: 'E-commerce allows purchase without account creation',
      weight: 9,
      category: 'form',
      check: (data) => {
        return data.croElements?.hasGuestCheckout || null;
      },
      antiPattern: 'Forced account creation before purchase',
      impact: '25-30% cart abandonment increase'
    }
  ],

  // ============================================
  // SECTION 4: TRUST SIGNALS
  // ============================================
  trustSignals: [
    {
      id: 'testimonials',
      name: 'Social Proof - Testimonials',
      pattern: 'Customer testimonials visible on page',
      weight: 9,
      category: 'trust',
      check: (data) => {
        return (data.croElements?.testimonials?.length || 0) > 0;
      },
      antiPattern: 'No customer validation or reviews',
      impact: 'Lack of trust, perceived risk'
    },
    {
      id: 'testimonials-above-fold',
      name: 'Testimonials Above Fold',
      pattern: 'At least one testimonial visible without scrolling',
      weight: 8,
      category: 'trust',
      check: (data) => {
        return data.croElements?.hasTestimonialsAboveFold || false;
      },
      antiPattern: 'All social proof buried below fold',
      impact: 'Users leave before seeing validation'
    },
    {
      id: 'client-logos',
      name: 'Client/Partner Logos',
      pattern: 'Trusted brand logos displayed for social proof',
      weight: 7,
      category: 'trust',
      check: (data) => {
        return data.croElements?.hasClientLogos || false;
      },
      antiPattern: 'No indication of other customers',
      impact: 'Appears untested or unpopular'
    },
    {
      id: 'trust-badges',
      name: 'Trust Badges Near CTA',
      pattern: 'Security/verification badges near conversion point',
      weight: 8,
      category: 'trust',
      check: (data) => {
        return data.croElements?.hasTrustBadges || false;
      },
      antiPattern: 'No security or guarantee indicators',
      impact: 'Payment anxiety, cart abandonment'
    },
    {
      id: 'guarantee',
      name: 'Risk Reversal Guarantee',
      pattern: 'Money-back guarantee or risk-free trial mentioned',
      weight: 8,
      category: 'trust',
      check: (data) => {
        const text = (data.visibleText || '').toLowerCase();
        const guaranteeWords = ['money back', 'guarantee', 'risk-free', 'refund', 'trial', 'cancel anytime'];
        return guaranteeWords.some(word => text.includes(word));
      },
      antiPattern: 'No risk reversal offered',
      impact: 'Perceived high risk reduces conversion'
    },
    {
      id: 'contact-visible',
      name: 'Contact Information Visible',
      pattern: 'Phone, email, or chat easily accessible',
      weight: 7,
      category: 'trust',
      check: (data) => {
        return data.croElements?.hasVisibleContact || false;
      },
      antiPattern: 'No way to contact company visible',
      impact: 'Seems untrustworthy or fly-by-night'
    }
  ],

  // ============================================
  // SECTION 5: PSYCHOLOGICAL TRIGGERS
  // ============================================
  psychologicalTriggers: [
    {
      id: 'urgency',
      name: 'Urgency Elements',
      pattern: 'Time-limited offers or countdown timers',
      weight: 7,
      category: 'psychology',
      check: (data) => {
        const text = (data.visibleText || '').toLowerCase();
        const urgencyWords = ['limited time', 'expires', 'ending soon', 'last chance', 'hours left', 'today only'];
        return urgencyWords.some(word => text.includes(word)) || data.croElements?.hasCountdownTimer;
      },
      antiPattern: 'No urgency to act now',
      impact: 'Users defer decision, never return'
    },
    {
      id: 'scarcity',
      name: 'Scarcity Indicators',
      pattern: 'Limited quantity or availability messaging',
      weight: 7,
      category: 'psychology',
      check: (data) => {
        const text = (data.visibleText || '').toLowerCase();
        const scarcityWords = ['limited', 'only', 'left in stock', 'few remaining', 'selling fast', 'exclusive'];
        return scarcityWords.some(word => text.includes(word));
      },
      antiPattern: 'No indication of limited availability',
      impact: 'No motivation to act immediately'
    },
    {
      id: 'social-proof-numbers',
      name: 'Quantified Social Proof',
      pattern: 'Specific numbers: "Join 10,000+ customers"',
      weight: 8,
      category: 'psychology',
      check: (data) => {
        const text = data.visibleText || '';
        const numberPattern = /\d{3,}[\d,]*\s*(\+|customers|users|people|clients|members|students)/i;
        return numberPattern.test(text);
      },
      antiPattern: 'Vague "Join thousands" without specifics',
      impact: 'Less believable, weaker social proof'
    },
    {
      id: 'authority',
      name: 'Authority Signals',
      pattern: 'Expert endorsements, certifications, media mentions',
      weight: 7,
      category: 'psychology',
      check: (data) => {
        return data.croElements?.hasAuthoritySignals || false;
      },
      antiPattern: 'No third-party validation',
      impact: 'Harder to establish credibility'
    },
    {
      id: 'reciprocity',
      name: 'Reciprocity Offer',
      pattern: 'Free value offered before asking for conversion',
      weight: 8,
      category: 'psychology',
      check: (data) => {
        const text = (data.visibleText || '').toLowerCase();
        const freeOffers = ['free', 'bonus', 'gift', 'guide', 'template', 'checklist', 'download'];
        return freeOffers.some(word => text.includes(word));
      },
      antiPattern: 'Immediate ask without value exchange',
      impact: 'Higher resistance to conversion'
    }
  ],

  // ============================================
  // SECTION 6: CONTENT & COPY
  // ============================================
  contentCopy: [
    {
      id: 'benefit-focused',
      name: 'Benefit-Focused Copy',
      pattern: 'Headlines focus on benefits, not just features',
      weight: 9,
      category: 'copy',
      // eslint-disable-next-line no-unused-vars
      check: (_data) => {
        // Requires semantic analysis, flag for AI
        return null;
      },
      antiPattern: 'Feature-focused technical jargon',
      impact: 'Users don\'t understand "what\'s in it for me"'
    },
    {
      id: 'scan-friendly',
      name: 'Scannable Content',
      pattern: 'Short paragraphs, bullet points, clear headings',
      weight: 8,
      category: 'copy',
      check: (data) => {
        const text = data.visibleText || '';
        const avgParagraphLength = text.length / (text.split('\n\n').length || 1);
        return avgParagraphLength < 300; // Paragraphs under 300 chars
      },
      antiPattern: 'Wall of text, no visual breaks',
      impact: 'Users bounce without reading'
    },
    {
      id: 'specific-headlines',
      name: 'Specific vs Vague Headlines',
      pattern: 'Headlines contain specific outcomes or numbers',
      weight: 8,
      category: 'copy',
      check: (data) => {
        const headings = data.headings || [];
        const specificPattern = /\d+%|\d+\s*(days?|hours?|minutes?|x|times)|\$\d+/;
        return headings.some(h => specificPattern.test(h.text));
      },
      antiPattern: 'Generic "Best Solution" headlines',
      impact: 'Less believable, lower engagement'
    },
    {
      id: 'faq-present',
      name: 'FAQ Section',
      pattern: 'FAQ section addresses common objections',
      weight: 7,
      category: 'copy',
      check: (data) => {
        return data.croElements?.hasFAQ || false;
      },
      antiPattern: 'No objection handling',
      impact: 'Unanswered questions prevent conversion'
    }
  ],

  // ============================================
  // SECTION 7: MOBILE & PERFORMANCE
  // ============================================
  mobilePerformance: [
    {
      id: 'mobile-responsive',
      name: 'Mobile Responsiveness',
      pattern: 'Page adapts well to mobile viewport',
      weight: 10,
      category: 'mobile',
      check: (data) => {
        // Requires viewport meta check
        return data.meta?.viewport !== undefined;
      },
      antiPattern: 'Desktop-only layout on mobile',
      impact: '50%+ of traffic bounces on mobile'
    },
    {
      id: 'tap-targets',
      name: 'Large Tap Targets',
      pattern: 'Buttons and links large enough for mobile tapping (44px+)',
      weight: 8,
      category: 'mobile',
      // eslint-disable-next-line no-unused-vars
      check: (_data) => {
        // Requires visual analysis
        return null;
      },
      antiPattern: 'Tiny buttons causing mis-taps',
      impact: 'Frustration, accidental clicks, lower conversion'
    },
    {
      id: 'load-speed',
      name: 'Fast Load Time',
      pattern: 'Page loads critical content under 3 seconds',
      weight: 9,
      category: 'performance',
      check: (data) => {
        // Based on tech stack indicators
        const stack = data.stack || {};
        const hasPerformanceTools = stack.analytics?.some(a =>
          ['cloudflare', 'fastly', 'akamai'].includes(a.toLowerCase())
        );
        return hasPerformanceTools;
      },
      antiPattern: 'Slow loading, heavy assets',
      impact: '53% mobile users abandon after 3 seconds'
    }
  ],

  // ============================================
  // SECTION 8: NAVIGATION & UX
  // ============================================
  navigationUX: [
    {
      id: 'simple-navigation',
      name: 'Simple Navigation',
      pattern: 'Navigation has 5-7 items maximum',
      weight: 7,
      category: 'ux',
      check: (data) => {
        const navItems = data.croElements?.navigationItems?.length || 0;
        return navItems <= 7 && navItems >= 2;
      },
      antiPattern: 'Navigation overload with 15+ items',
      impact: 'Decision paralysis, analysis paralysis'
    },
    {
      id: 'sticky-cta',
      name: 'Sticky Header with CTA',
      pattern: 'Header remains visible with CTA on scroll',
      weight: 7,
      category: 'ux',
      check: (data) => {
        return data.croElements?.hasStickyHeader || false;
      },
      antiPattern: 'No persistent CTA on long pages',
      impact: 'Users scroll past CTA, lose conversion opportunity'
    },
    {
      id: 'exit-intent',
      name: 'Exit Intent Strategy',
      pattern: 'Exit popup or offer when user tries to leave',
      weight: 6,
      category: 'ux',
      // eslint-disable-next-line no-unused-vars
      check: (_data) => {
        // Hard to detect without interaction, flag for AI
        return null;
      },
      antiPattern: 'No attempt to save abandoning visitors',
      impact: 'Lost conversion opportunities'
    }
  ]
};

// Flatten all patterns for easy iteration
export const ALL_PATTERNS = Object.values(CRO_PATTERNS).flat();

// Pattern matching function - simulates RAG retrieval
export function matchPatterns(pageData) {
  const matches = [];
  const missing = [];

  for (const pattern of ALL_PATTERNS) {
    try {
      const result = pattern.check(pageData);

      if (result === true) {
        matches.push({
          ...pattern,
          status: 'matched',
          confidence: 0.9
        });
      } else if (result === false) {
        missing.push({
          ...pattern,
          status: 'missing',
          confidence: 0.8,
          issue: pattern.antiPattern
        });
      } else {
        // null/undefined = needs AI review
        missing.push({
          ...pattern,
          status: 'needs_review',
          confidence: 0.5,
          issue: pattern.antiPattern
        });
      }
    } catch (e) {
      console.warn(`Pattern check failed for ${pattern.id}:`, e);
    }
  }

  return { matches, missing };
}

// Calculate conversion score based on pattern matches vs missing
export function calculateConversionScore(matches, missing = [], notApplicable = []) {
  // Only score against patterns that were actually evaluated (matched + missing)
  // Ignore notApplicable patterns — they don't count for or against the score
  const evaluatedPatterns = [...matches, ...missing];

  if (evaluatedPatterns.length === 0) {
    // No patterns evaluated — can't determine score
    return 50; // Neutral baseline
  }

  const totalWeight = evaluatedPatterns.reduce((sum, p) => sum + (p.weight || 1), 0);
  const matchedWeight = matches.reduce((sum, m) => sum + (m.weight || 1), 0);

  // Base score from pattern matching ratio
  let score = Math.round((matchedWeight / totalWeight) * 100);

  // Bonus for having critical patterns
  const hasHeroCTA = matches.some(m => m.id === 'cta-above-fold');
  const hasTrustSignals = matches.some(m => m.category === 'trust');
  const hasSocialProof = matches.some(m => m.id === 'testimonials' || m.id === 'social-proof-numbers');
  const hasValueProp = matches.some(m => m.id === 'hero-clarity' || m.id === 'five-second-test');

  if (hasHeroCTA) score += 5;
  if (hasTrustSignals) score += 3;
  if (hasSocialProof) score += 2;
  if (hasValueProp) score += 5;

  // Give a baseline if any patterns match
  if (matches.length > 0 && score < 15) score = 15;

  return Math.min(score, 100);
}

// Get patterns by category
export function getPatternsByCategory(category) {
  return ALL_PATTERNS.filter(p => p.category === category);
}

// Get critical patterns (weight >= 9)
export function getCriticalPatterns() {
  return ALL_PATTERNS.filter(p => p.weight >= 9);
}

// Detect page type based on content
export function detectPageType(data) {
  const text = (data.visibleText || '').toLowerCase();
  const title = (data.title || '').toLowerCase();
  const url = (data.url || '').toLowerCase();

  if (url.includes('cart') || url.includes('checkout')) return 'checkout';
  if (url.includes('product') || document.querySelector('.product-price')) return 'product';
  if (url.includes('blog') || url.includes('article')) return 'article';
  if (text.includes('sign up') || text.includes('register') || text.includes('pricing')) return 'landing';

  return 'general';
}

// Filter patterns by page type
export function filterPatternsByPageType(patterns, pageType) {
  // Logic to prioritize patterns based on page type
  // For now return all, can be specialized later
  return patterns;
}

// Export patterns for RAG embedding
export function exportPatternsForRAG() {
  return ALL_PATTERNS.map(p => ({
    id: p.id,
    text: `${p.name} ${p.pattern} ${p.antiPattern} ${p.category}`,
    metadata: {
      id: p.id,
      name: p.name,
      category: p.category,
      weight: p.weight
    }
  }));
}

export default {
  CRO_PATTERNS,
  ALL_PATTERNS,
  matchPatterns,
  calculateConversionScore,
  getPatternsByCategory,
  getCriticalPatterns,
  detectPageType,
  filterPatternsByPageType,
  exportPatternsForRAG
};