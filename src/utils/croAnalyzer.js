// CRO Analyzer Module - Hybrid RAG + Rules
// Orchestrates pattern matching with true RAG retrieval

import {
  matchPatterns,
  calculateConversionScore,
  ALL_PATTERNS,
  getCriticalPatterns,
  detectPageType,
  exportPatternsForRAG
} from './croKnowledgeBase';

import {
  analyzeWithRAG
} from './croRAG';

// Configuration
const USE_RAG = true; // Toggle RAG on/off
const RAG_TOP_K = 20; // Number of patterns to retrieve via RAG
const CACHE_VERSION = '1.1'; // Bump when patterns change

/**
 * Main analysis function - Hybrid RAG + Rules
 * @param {Object} pageData - Data from content script
 * @param {boolean} forceRuleBased - Force rule-based analysis (skip RAG)
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzePage(pageData, forceRuleBased = false) {
  console.log('🔍 Starting Hybrid CRO Analysis...');
  const startTime = performance.now();

  let matches = [];
  let missing = [];
  let notApplicable = [];
  let relevantPatterns = [];
  let usingRAG = false;

  try {
    if (USE_RAG && !forceRuleBased) {
      // Try RAG first
      console.log('🧠 Using RAG retrieval...');
      const ragResult = await analyzeWithRAG(
        pageData,
        exportPatternsForRAG(),
        {
          topK: RAG_TOP_K,
          detectPageType,
          useCache: true,
          cacheVersion: CACHE_VERSION
        }
      );

      relevantPatterns = ragResult.relevantPatterns;
      usingRAG = ragResult.usingEmbeddings;

      // Run rule checks only on retrieved patterns
      for (const pattern of relevantPatterns) {
        try {
          const result = pattern.check(pageData);

          if (result === true) {
            matches.push({
              ...pattern,
              status: 'matched',
              confidence: 0.9,
              retrievedByRAG: true
            });
          } else if (result === false) {
            missing.push({
              ...pattern,
              status: 'missing',
              confidence: 0.8,
              issue: pattern.antiPattern,
              retrievedByRAG: true
            });
          } else {
            notApplicable.push({
              ...pattern,
              status: 'needs_review',
              confidence: 0.5,
              issue: pattern.antiPattern,
              retrievedByRAG: true
            });
          }
        } catch (e) {
          console.warn(`Pattern check failed for ${pattern.id}:`, e);
        }
      }

      console.log(`✅ RAG retrieved ${relevantPatterns.length} patterns, ${matches.length} matched`);

    } else {
      // Fallback to rule-based
      console.log('📋 Using rule-based analysis...');
      const ruleResult = matchPatterns(pageData);
      matches = ruleResult.matches;
      missing = ruleResult.missing;
      notApplicable = ruleResult.notApplicable;
      relevantPatterns = [...matches, ...missing];
    }

  } catch (e) {
    console.error('RAG analysis failed, falling back to rules:', e);
    const ruleResult = matchPatterns(pageData);
    matches = ruleResult.matches;
    missing = ruleResult.missing;
    notApplicable = ruleResult.notApplicable;
    relevantPatterns = [...matches, ...missing];
    usingRAG = false;
  }

  // Calculate score
  const conversionScore = calculateConversionScore(matches, missing, notApplicable);

  // Categorize issues
  const categorizedIssues = categorizeIssues(missing);

  // Calculate severity
  const severityBreakdown = calculateSeverity(missing);

  // Identify quick wins
  const quickWins = identifyQuickWins(missing);

  // Generate summary
  const summary = generateSummary(matches, missing, conversionScore);

  // Get page type
  const pageType = detectPageType(pageData);

  const endTime = performance.now();
  console.log(`✅ Analysis complete in ${(endTime - startTime).toFixed(0)}ms`);

  return {
    score: conversionScore,
    matches: matches.length,
    totalPatterns: relevantPatterns.length,
    allPatternsCount: ALL_PATTERNS.length,
    matchedPatterns: matches,
    missingPatterns: missing,
    notApplicablePatterns: notApplicable,
    categorizedIssues,
    severityBreakdown,
    quickWins,
    summary,
    pageType,
    usingRAG,
    criticalPatterns: getCriticalPatterns().length,
    criticalMatched: matches.filter(m => m.weight >= 9).length,
    analysisTime: endTime - startTime
  };
}

/**
 * Categorize missing patterns by type
 */
function categorizeIssues(missing) {
  const categories = {};

  const categoryNames = {
    firstImpression: 'First Impression',
    cta: 'Call-to-Action',
    form: 'Form Optimization',
    trust: 'Trust & Credibility',
    psychology: 'Psychological Triggers',
    copy: 'Content & Copy',
    mobile: 'Mobile Experience',
    performance: 'Performance',
    ux: 'User Experience'
  };

  // Initialize categories
  Object.keys(categoryNames).forEach(key => {
    categories[key] = {
      name: categoryNames[key],
      issues: [],
      score: 0,
      totalWeight: 0
    };
  });

  // Sort missing patterns into categories
  missing.forEach(pattern => {
    if (categories[pattern.category]) {
      categories[pattern.category].issues.push(pattern);
      categories[pattern.category].totalWeight += pattern.weight;
    }
  });

  // Calculate scores per category
  Object.keys(categories).forEach(key => {
    const cat = categories[key];
    const maxWeight = ALL_PATTERNS
      .filter(p => p.category === key)
      .reduce((sum, p) => sum + p.weight, 0);

    cat.score = maxWeight > 0
      ? Math.round(((maxWeight - cat.totalWeight) / maxWeight) * 100)
      : 100;
  });

  return categories;
}

/**
 * Calculate severity distribution
 */
function calculateSeverity(missing) {
  const severity = {
    critical: [],
    high: [],
    medium: [],
    low: []
  };

  missing.forEach(pattern => {
    if (pattern.weight >= 9) {
      severity.critical.push(pattern);
    } else if (pattern.weight >= 7) {
      severity.high.push(pattern);
    } else if (pattern.weight >= 5) {
      severity.medium.push(pattern);
    } else {
      severity.low.push(pattern);
    }
  });

  return {
    ...severity,
    total: missing.length,
    criticalCount: severity.critical.length,
    highCount: severity.high.length,
    mediumCount: severity.medium.length,
    lowCount: severity.low.length
  };
}

/**
 * Identify quick wins (high impact, low effort fixes)
 */
function identifyQuickWins(missing) {
  return missing
    .filter(pattern => {
      const simplePatterns = [
        'cta-action-copy',
        'specific-headlines',
        'form-labels',
        'contact-visible',
        'simple-navigation'
      ];

      return pattern.weight >= 7 && simplePatterns.includes(pattern.id);
    })
    .slice(0, 5);
}

/**
 * Generate human-readable summary
 */
function generateSummary(matches, missing, score) {
  const criticalMissing = missing.filter(m => m.weight >= 9);

  let summary = '';

  if (score >= 80) {
    summary = 'Strong conversion foundation with most best practices in place. Focus on optimization rather than fundamentals.';
  } else if (score >= 60) {
    summary = 'Good start but several important conversion elements are missing. Address critical issues first for maximum impact.';
  } else if (score >= 40) {
    summary = 'Significant gaps in conversion optimization. Multiple critical patterns missing that likely hurt performance.';
  } else {
    summary = 'Major conversion issues detected. Page lacks fundamental elements needed for effective lead/sale generation.';
  }

  return {
    text: summary,
    criticalCount: criticalMissing.length,
    recommendation: criticalMissing.length > 0
      ? `Priority: Fix ${criticalMissing.length} critical issue${criticalMissing.length > 1 ? 's' : ''} first`
      : 'Focus on A/B testing and incremental improvements'
  };
}

/**
 * Build context for AI analysis
 */
export function buildAIContext(analysis, pageData) {
  const ctx = [];

  ctx.push(`=== LANDING PAGE CRO ANALYSIS ===`);
  ctx.push(`**Page Title:** ${pageData.title || 'Unknown'}`);
  ctx.push(`**URL:** ${pageData.url || 'Unknown'}`);
  ctx.push(`**Page Type:** ${analysis.pageType}`);
  ctx.push(`**Conversion Score:** ${analysis.score}/100`);
  ctx.push(`**Analysis Method:** ${analysis.usingRAG ? 'RAG + Rules (Semantic Retrieval)' : 'Rule-Based'}`);
  ctx.push(`**Patterns Analyzed:** ${analysis.totalPatterns} (of ${analysis.allPatternsCount} total)`);
  ctx.push('');

  if (analysis.severityBreakdown.criticalCount > 0) {
    ctx.push(`## Critical Issues (${analysis.severityBreakdown.criticalCount})`);
    analysis.severityBreakdown.critical.forEach(issue => {
      ctx.push(`- **${issue.name}** (Weight: ${issue.weight})`);
      ctx.push(`  - Problem: ${issue.issue}`);
      ctx.push(`  - Impact: ${issue.impact}`);
    });
    ctx.push('');
  }

  if (analysis.severityBreakdown.highCount > 0) {
    ctx.push(`## High Priority Issues (${analysis.severityBreakdown.highCount})`);
    analysis.severityBreakdown.high.slice(0, 8).forEach(issue => {
      ctx.push(`- **${issue.name}**: ${issue.issue}`);
    });
    ctx.push('');
  }

  ctx.push(`## Category Scores`);
  Object.entries(analysis.categorizedIssues)
    // eslint-disable-next-line no-unused-vars
    .map(([_key, cat]) => cat)
    .filter(cat => cat.totalWeight > 0)
    .sort((a, b) => b.score - a.score)
    .forEach(cat => {
      const emoji = cat.score >= 80 ? '✅' : cat.score >= 60 ? '⚠️' : '❌';
      ctx.push(`${emoji} **${cat.name}**: ${cat.score}/100 (${cat.issues.length} issues)`);
    });
  ctx.push('');

  if (analysis.quickWins.length > 0) {
    ctx.push(`## Quick Wins (${analysis.quickWins.length})`);
    analysis.quickWins.forEach(win => {
      ctx.push(`- ${win.name}: ${win.issue}`);
    });
    ctx.push('');
  }

  ctx.push(`## Detected Elements`);
  const elements = pageData.croElements || {};
  if (elements.primaryCTA) {
    ctx.push(`- **Primary CTA**: "${elements.primaryCTA.text}" (Above fold: ${elements.primaryCTA.visibleAboveFold ? 'Yes' : 'No'})`);
  }
  if (elements.testimonials?.length > 0) {
    ctx.push(`- **Testimonials**: ${elements.testimonials.length} found`);
  }
  if (elements.forms?.length > 0) {
    ctx.push(`- **Forms**: ${elements.forms.length} form(s) detected`);
  }
  ctx.push('');

  ctx.push(`## Page Content Sample`);
  ctx.push(pageData.visibleText?.substring(0, 2000) || 'No content extracted');
  ctx.push('');

  ctx.push(`## Analysis Instructions`);
  ctx.push(`This analysis used ${analysis.usingRAG ? 'RAG (Retrieval Augmented Generation)' : 'rule-based pattern matching'} to identify relevant CRO patterns.`);
  ctx.push(`Please provide specific, actionable recommendations for each issue.`);
  ctx.push(`=== END LANDING PAGE DATA ===`);

  return ctx.join('\n');
}

/**
 * Generate report metadata
 */
export function generateReportMetadata(analysis) {
  const grade = analysis.score >= 90 ? 'A' :
    analysis.score >= 80 ? 'B' :
      analysis.score >= 70 ? 'C' :
        analysis.score >= 60 ? 'D' : 'F';

  const status = analysis.score >= 80 ? 'Excellent' :
    analysis.score >= 60 ? 'Good' :
      analysis.score >= 40 ? 'Needs Work' : 'Critical';

  return {
    grade,
    status,
    color: analysis.score >= 80 ? '#22c55e' :
      analysis.score >= 60 ? '#f59e0b' :
        analysis.score >= 40 ? '#f97316' : '#ef4444',
    totalIssues: analysis.severityBreakdown.total,
    estimatedLift: calculateEstimatedLift(analysis),
    usingRAG: analysis.usingRAG
  };
}

function calculateEstimatedLift(analysis) {
  const criticalWeight = analysis.severityBreakdown.critical.reduce((sum, i) => sum + i.weight, 0);
  const highWeight = analysis.severityBreakdown.high.reduce((sum, i) => sum + i.weight, 0);

  const potentialLift = (criticalWeight * 1.2) + (highWeight * 0.6);

  return {
    min: Math.round(potentialLift * 0.3),
    max: Math.round(potentialLift * 0.8),
    unit: '%'
  };
}

export function exportAnalysis(analysis, pageData) {
  return {
    timestamp: Date.now(),
    url: pageData.url,
    score: analysis.score,
    metadata: generateReportMetadata(analysis),
    summary: analysis.summary,
    categories: analysis.categorizedIssues,
    severity: analysis.severityBreakdown,
    quickWins: analysis.quickWins,
    matchedPatterns: analysis.matchedPatterns,
    missingPatterns: analysis.missingPatterns,
    allIssues: analysis.missingPatterns,
    matched: analysis.matchedPatterns,
    pageType: analysis.pageType,
    usingRAG: analysis.usingRAG,
    totalPatterns: analysis.totalPatterns,
    allPatternsCount: analysis.allPatternsCount,
    aiContext: buildAIContext(analysis, pageData)
  };
}

export default {
  analyzePage,
  buildAIContext,
  generateReportMetadata,
  exportAnalysis,
  USE_RAG,
  RAG_TOP_K
};