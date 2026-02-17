import React from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Simple Icons
const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const CrossIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const ExternalIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>;

export function IntelligenceReport({ report, onClose }) {
    if (!report) return null;

    const { domain, techStack, traffic, conversionSignals, aiAnalysis, timestamp, fromCache } = report;
    const aiHtml = DOMPurify.sanitize(marked.parse(aiAnalysis));

    return (
        <div className="intelligence-report fade-in">
            <div className="report-header">
                <div className="report-title-row">
                    <h2><span className="emoji">🕵️</span> {domain}</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <div className="report-meta">
                    Analyzed {new Date(timestamp).toLocaleDateString()}
                    {fromCache && <span className="cache-badge">Cached</span>}
                </div>
            </div>

            <div className="report-grid">
                {/* Tech Stack */}
                <div className="report-card">
                    <h3>🛠️ Tech Stack</h3>
                    <div className="tech-tags">
                        {techStack.platform && <span className="tag platform">{techStack.platform}</span>}
                        {techStack.ecommerce && techStack.ecommerce !== techStack.platform && <span className="tag ecommerce">{techStack.ecommerce}</span>}
                        {techStack.frontend.map(t => <span key={t} className="tag frontend">{t}</span>)}
                        {techStack.analytics.map(t => <span key={t} className="tag analytics">{t}</span>)}
                        {techStack.hosting && <span className="tag hosting">{techStack.hosting}</span>}
                        {!techStack.platform && techStack.frontend.length === 0 && <span className="empty-text">No major frameworks detected</span>}
                    </div>
                </div>

                {/* Traffic & Signals */}
                <div className="report-card">
                    <h3>📊 Traffic & Signals</h3>
                    <div className="stat-row">
                        <span>Est. Traffic</span>
                        <strong>{traffic.estimate}</strong>
                    </div>
                    <div className="stat-row">
                        <span>Confidence</span>
                        <span className="text-muted">{traffic.confidence}</span>
                    </div>
                    <div className="separator"></div>
                    <div className="signals-list">
                        <div className={`signal ${conversionSignals.hasCheckout ? 'active' : ''}`}>
                            {conversionSignals.hasCheckout ? <CheckIcon /> : <CrossIcon />} Checkout
                        </div>
                        <div className={`signal ${conversionSignals.hasCart ? 'active' : ''}`}>
                            {conversionSignals.hasCart ? <CheckIcon /> : <CrossIcon />} Cart
                        </div>
                    </div>
                </div>
            </div>

            {/* Meta Ads Link */}
            <a href={`https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(domain)}`}
                target="_blank" rel="noopener noreferrer" className="meta-ads-banner">
                <div className="ads-icon">📢</div>
                <div className="ads-text">
                    <strong>View Active Meta Ads</strong>
                    <span>See all running campaigns for {domain}</span>
                </div>
                <ExternalIcon />
            </a>

            {/* AI Analysis */}
            <div className="report-card full-width">
                <h3>💡 AI Analysis</h3>
                <div className="markdown-body" dangerouslySetInnerHTML={{ __html: aiHtml }} />
            </div>
        </div>
    );
}

export function LoadingReport() {
    return (
        <div className="intelligence-loading">
            <div className="spy-scanner">
                <div className="scanner-line"></div>
            </div>
            <h3>Scanning Target...</h3>
            <p>Analyzing tech stack, traffic, and ads</p>
        </div>
    );
}
