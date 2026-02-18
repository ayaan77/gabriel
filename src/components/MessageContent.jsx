import { useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Icons } from './Icons';

// Render Markdown content with mermaid block support
export function MessageContent({ text }) {
    const mermaidBlocks = [];
    const textWithPlaceholders = text.replace(/```mermaid\n([\s\S]*?)```/g, (match, code) => {
        const idx = mermaidBlocks.length;
        mermaidBlocks.push(code.trim());
        return `<!--MERMAID_PLACEHOLDER_${idx}-->`;
    });

    const rawHtml = marked.parse(textWithPlaceholders);
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
        ADD_ATTR: ['target', 'rel'],
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
    });

    if (mermaidBlocks.length === 0) {
        return <div className="message-text" dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
    }

    const parts = [];
    const segments = cleanHtml.split(/<!--MERMAID_PLACEHOLDER_(\d+)-->/);
    for (let i = 0; i < segments.length; i++) {
        if (i % 2 === 0) {
            if (segments[i].trim()) {
                parts.push(<div key={`html-${i}`} dangerouslySetInnerHTML={{ __html: segments[i] }} />);
            }
        } else {
            const idx = parseInt(segments[i], 10);
            parts.push(<MermaidBlock key={`mermaid-${idx}`} code={mermaidBlocks[idx]} />);
        }
    }

    return <div className="message-text">{parts}</div>;
}

export function MermaidBlock({ code }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText('```mermaid\n' + code + '\n```');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="mermaid-block">
            <div className="mermaid-header">
                <span>📊 Mermaid Diagram</span>
                <button className="copy-btn" onClick={copy} title="Copy diagram code">
                    {copied ? <><Icons.Check /> Copied!</> : <><Icons.Copy /> Copy</>}
                </button>
            </div>
            <pre className="mermaid-code">{code}</pre>
            <div className="mermaid-hint">Paste into mermaid.live or any Markdown editor to render</div>
        </div>
    );
}

// Thinking Block — expandable reasoning panel
export function ThinkingBlock({ content }) {
    const [expanded, setExpanded] = useState(false);

    if (!content) return null;

    return (
        <div className="thinking-block">
            <div
                className="thinking-header"
                onClick={() => setExpanded(!expanded)}
                title="Toggle reasoning"
            >
                <span className="thinking-icon">🧠</span>
                <span className="thinking-label">Reasoning Process</span>
                <span className={`thinking-chevron ${expanded ? 'expanded' : ''}`}>▼</span>
            </div>
            {expanded && (
                <div className="thinking-content">
                    {content}
                </div>
            )}
        </div>
    );
}
