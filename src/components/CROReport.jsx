// CRO Report Component
// Displays comprehensive CRO audit results with deep dive capabilities

import { useState } from 'react';
import jsPDF from 'jspdf';
import { marked } from 'marked';

// Severity badge colors
const SEVERITY_COLORS = {
  critical: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  high: { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
  medium: { bg: '#fefce8', text: '#ca8a04', border: '#fde047' },
  low: { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' }
};

// Category icons
const CATEGORY_ICONS = {
  firstImpression: '🎯',
  cta: '👆',
  form: '📝',
  trust: '🛡️',
  psychology: '🧠',
  copy: '✍️',
  mobile: '📱',
  performance: '⚡',
  ux: '🎨'
};

export default function CROReport({ analysis, aiResponse, onAskQuestion, isLoading }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedIssue, setExpandedIssue] = useState(null);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (isLoading) {
    return (
      <div className="cro-report-loading">
        <div className="cro-spinner"></div>
        <p>Analyzing conversion elements...</p>
        <div className="cro-progress">
          <div className="cro-progress-bar"></div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const metadata = analysis.metadata || {};
  const severity = analysis.severity || {};
  const categories = analysis.categories || {};

  // Export to PDF
  const exportPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    let y = 10;

    pdf.setFontSize(20);
    pdf.text('CRO Audit Report', 10, y);
    y += 10;

    pdf.setFontSize(12);
    pdf.text(`URL: ${analysis.url || 'Unknown'}`, 10, y);
    y += 10;
    pdf.text(`Conversion Score: ${analysis.score}/100`, 10, y);
    y += 10;

    if (aiResponse) {
      const lines = pdf.splitTextToSize(aiResponse.replace(/[#*]/g, ''), 180);
      pdf.text(lines, 10, y);
    }

    pdf.save('cro-audit-report.pdf');
  };

  // Export to Markdown
  const exportMarkdown = () => {
    const content = `# CRO Audit Report

**URL:** ${analysis.url || 'Unknown'}  
**Score:** ${analysis.score}/100  
**Grade:** ${metadata.grade}  
**Date:** ${new Date(analysis.timestamp).toLocaleDateString()}

${aiResponse || ''}
`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cro-audit-${Date.now()}.md`;
    a.click();
  };

  // Handle follow-up question
  const submitQuestion = (e) => {
    e.preventDefault();
    if (followUpQuestion.trim() && onAskQuestion) {
      onAskQuestion(followUpQuestion);
      setFollowUpQuestion('');
    }
  };

  // Get filtered issues
  const getFilteredIssues = () => {
    let issues = [];
    
    if (selectedCategory === 'all') {
      Object.values(categories).forEach(cat => {
        if (cat.issues) issues = [...issues, ...cat.issues];
      });
    } else {
      const cat = categories[selectedCategory];
      if (cat?.issues) issues = cat.issues;
    }
    
    return issues.sort((a, b) => b.weight - a.weight);
  };

  // Score ring component
  const ScoreRing = ({ score, size = 120 }) => {
    const radius = (size - 10) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (score / 100) * circumference;

    return (
      <div className="score-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={metadata.color || '#3b82f6'}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="score-text">
          <span className="score-number">{score}</span>
          <span className="score-label">/100</span>
        </div>
      </div>
    );
  };

  return (
    <div className="cro-report">
      {/* Header */}
      <div className="cro-header">
        <div className="cro-header-left">
          <h2>🎯 CRO Audit Report</h2>
          <p className="cro-url">{analysis.url}</p>
        </div>
        <div className="cro-header-actions">
          <button onClick={exportPDF} className="cro-btn cro-btn-secondary">
            📄 PDF
          </button>
          <button onClick={exportMarkdown} className="cro-btn cro-btn-secondary">
            📝 MD
          </button>
        </div>
      </div>

      {/* Score Overview */}
      <div className="cro-score-overview">
        <ScoreRing score={analysis.score} />
        <div className="cro-score-details">
          <div className="cro-grade" style={{ color: metadata.color }}>
            Grade: {metadata.grade}
          </div>
          <div className="cro-status">{metadata.status}</div>
          <div className="cro-summary">{analysis.summary?.text}</div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="cro-stats">
        <div className="cro-stat">
          <span className="cro-stat-number" style={{ color: SEVERITY_COLORS.critical.text }}>
            {severity.criticalCount || 0}
          </span>
          <span className="cro-stat-label">Critical</span>
        </div>
        <div className="cro-stat">
          <span className="cro-stat-number" style={{ color: SEVERITY_COLORS.high.text }}>
            {severity.highCount || 0}
          </span>
          <span className="cro-stat-label">High</span>
        </div>
        <div className="cro-stat">
          <span className="cro-stat-number" style={{ color: SEVERITY_COLORS.medium.text }}>
            {severity.mediumCount || 0}
          </span>
          <span className="cro-stat-label">Medium</span>
        </div>
        <div className="cro-stat">
          <span className="cro-stat-number" style={{ color: SEVERITY_COLORS.low.text }}>
            {severity.lowCount || 0}
          </span>
          <span className="cro-stat-label">Low</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="cro-tabs">
        <button
          className={`cro-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`cro-tab ${activeTab === 'issues' ? 'active' : ''}`}
          onClick={() => setActiveTab('issues')}
        >
          Issues ({severity.total || 0})
        </button>
        <button
          className={`cro-tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>
        <button
          className={`cro-tab ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          AI Analysis
        </button>
      </div>

      {/* Tab Content */}
      <div className="cro-tab-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="cro-overview">
            {analysis.quickWins?.length > 0 && (
              <div className="cro-section">
                <h3>🏆 Quick Wins ({analysis.quickWins.length})</h3>
                <div className="cro-quick-wins">
                  {analysis.quickWins.map((win, idx) => (
                    <div key={idx} className="cro-quick-win-item">
                      <span className="cro-quick-win-number">{idx + 1}</span>
                      <div className="cro-quick-win-content">
                        <strong>{win.name}</strong>
                        <p>{win.issue}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {metadata.estimatedLift && (
              <div className="cro-section">
                <h3>📈 Conversion Lift Potential</h3>
                <div className="cro-lift">
                  <div className="cro-lift-range">
                    <span className="cro-lift-min">+{metadata.estimatedLift.min}%</span>
                    <span className="cro-lift-separator">to</span>
                    <span className="cro-lift-max">+{metadata.estimatedLift.max}%</span>
                  </div>
                  <p>Estimated increase by implementing high-priority fixes</p>
                </div>
              </div>
            )}

            <div className="cro-section">
              <h3>✅ What's Working</h3>
              <div className="cro-matched">
                {analysis.matchedPatterns?.slice(0, 5).map((pattern, idx) => (
                  <span key={idx} className="cro-matched-tag">
                    ✓ {pattern.name}
                  </span>
                ))}
                {analysis.matchedPatterns?.length > 5 && (
                  <span className="cro-matched-more">
                    +{analysis.matchedPatterns.length - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Issues Tab */}
        {activeTab === 'issues' && (
          <div className="cro-issues">
            {/* Category Filter */}
            <div className="cro-filter">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {Object.entries(categories).map(([key, cat]) => (
                  <option key={key} value={key}>
                    {CATEGORY_ICONS[key]} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Issues List */}
            <div className="cro-issues-list">
              {getFilteredIssues().map((issue, idx) => {
                const severity = issue.weight >= 9 ? 'critical' :
                                issue.weight >= 7 ? 'high' :
                                issue.weight >= 5 ? 'medium' : 'low';
                const colors = SEVERITY_COLORS[severity];
                const isExpanded = expandedIssue === `${selectedCategory}-${idx}`;

                return (
                  <div
                    key={idx}
                    className={`cro-issue-card ${isExpanded ? 'expanded' : ''}`}
                    style={{ borderColor: colors.border }}
                  >
                    <div
                      className="cro-issue-header"
                      onClick={() => setExpandedIssue(isExpanded ? null : `${selectedCategory}-${idx}`)}
                    >
                      <div className="cro-issue-severity" style={{ background: colors.bg, color: colors.text }}>
                        {severity.toUpperCase()}
                      </div>
                      <div className="cro-issue-title">
                        {CATEGORY_ICONS[issue.category]} {issue.name}
                      </div>
                      <div className="cro-issue-expand">
                        {isExpanded ? '−' : '+'}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="cro-issue-details">
                        <div className="cro-issue-problem">
                          <strong>Problem:</strong> {issue.issue}
                        </div>
                        <div className="cro-issue-impact">
                          <strong>Impact:</strong> {issue.impact}
                        </div>
                        <div className="cro-issue-actions">
                          <button
                            className="cro-btn cro-btn-primary"
                            onClick={() => onAskQuestion?.(`How do I fix: ${issue.name}?`)}
                          >
                            💡 How to Fix
                          </button>
                          <button
                            className="cro-btn cro-btn-secondary"
                            onClick={() => onAskQuestion?.(`Show me examples of good ${issue.category} implementation`)}
                          >
                            📚 Examples
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="cro-categories">
            {Object.entries(categories)
              .filter(([_, cat]) => cat.totalWeight > 0)
              .sort((a, b) => b[1].score - a[1].score)
              .map(([key, cat]) => (
                <div key={key} className="cro-category-card">
                  <div className="cro-category-header">
                    <span className="cro-category-icon">{CATEGORY_ICONS[key]}</span>
                    <span className="cro-category-name">{cat.name}</span>
                    <span className="cro-category-score" style={{
                      color: cat.score >= 80 ? '#16a34a' : cat.score >= 60 ? '#ca8a04' : '#dc2626'
                    }}>
                      {cat.score}/100
                    </span>
                  </div>
                  <div className="cro-category-bar">
                    <div
                      className="cro-category-progress"
                      style={{
                        width: `${cat.score}%`,
                        background: cat.score >= 80 ? '#16a34a' : cat.score >= 60 ? '#ca8a04' : '#dc2626'
                      }}
                    />
                  </div>
                  <div className="cro-category-issues">
                    {cat.issues?.slice(0, 3).map((issue, idx) => (
                      <span key={idx} className="cro-category-issue">
                        • {issue.name}
                      </span>
                    ))}
                    {cat.issues?.length > 3 && (
                      <span className="cro-category-more">
                        +{cat.issues.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* AI Analysis Tab */}
        {activeTab === 'ai' && (
          <div className="cro-ai-analysis">
            {aiResponse ? (
              <div className="cro-ai-content">
                <div
                  className="cro-markdown"
                  dangerouslySetInnerHTML={{
                    __html: marked(aiResponse.replace('[CRO_AUDIT_COMPLETE]', ''))
                  }}
                />
              </div>
            ) : (
              <div className="cro-ai-empty">
                <p>AI analysis will appear here after processing...</p>
              </div>
            )}

            {/* Follow-up Question */}
            <form className="cro-follow-up" onSubmit={submitQuestion}>
              <input
                type="text"
                value={followUpQuestion}
                onChange={(e) => setFollowUpQuestion(e.target.value)}
                placeholder="Ask a follow-up question about any recommendation..."
                className="cro-follow-up-input"
              />
              <button type="submit" className="cro-btn cro-btn-primary">
                Ask
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
