import { useState, useEffect, useRef } from 'react';
import { chatWithAI, generateSpec } from './utils/ai';
import { DEFAULT_API_KEY } from './config';
import jsPDF from 'jspdf';

// Inline SVG icons
const Icons = {
  Wand: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 4-1 1 4 4 1-1a2.83 2.83 0 1 0-4-4Z" /><path d="m13 6-8.5 8.5a2.12 2.12 0 1 0 3 3L16 9" /></svg>,
  Send: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>,
  Settings: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>,
  Download: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>,
  AlertCircle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
  Loader: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spinner"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>,
  Refresh: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>,
  Code: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
};

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [spec, setSpec] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [generatingSpec, setGeneratingSpec] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      if (chrome?.storage?.local) {
        chrome.storage.local.get(['groqApiKey'], (r) => setApiKey(r?.groqApiKey || DEFAULT_API_KEY));
      } else { setApiKey(DEFAULT_API_KEY); }
    } catch { setApiKey(DEFAULT_API_KEY); }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const startNew = () => {
    setMessages([]); setSpec(''); setInput(''); setError(''); setGeneratingSpec(false);
  };

  const saveApiKey = () => {
    if (!apiKey.startsWith('gsk_')) return setError('Invalid key');
    try { chrome?.storage?.local?.set({ groqApiKey: apiKey }); } catch { }
    setShowSettings(false); setError('');
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading || spec) return;
    const userMsg = { role: 'user', content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const response = await chatWithAI(updated, apiKey);

      // Check if AI is ready to generate
      if (response.includes('[READY_TO_GENERATE]')) {
        const cleanResponse = response.replace('[READY_TO_GENERATE]', '').trim();
        setMessages([...updated, { role: 'assistant', content: cleanResponse + '\n\n⚡ Generating your architecture spec...' }]);
        setGeneratingSpec(true);

        // Generate the full spec
        const fullSpec = await generateSpec(updated, apiKey);
        setSpec(fullSpec);
        setMessages(prev => [...prev, { role: 'assistant', content: '✅ Your architecture spec is ready! Scroll down to review it, or export as PDF.', isSpec: true }]);
        setGeneratingSpec(false);
      } else {
        setMessages([...updated, { role: 'assistant', content: response }]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickStart = (text) => sendMessage(text);

  // Multi-page PDF generation
  const downloadPDF = () => {
    if (!spec) return;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const usableWidth = pageWidth - margin * 2;
    let y = margin;

    // Colors
    const colors = {
      bg: [5, 5, 16],
      heading: [99, 102, 241],
      subheading: [6, 182, 212],
      text: [200, 200, 220],
      muted: [120, 120, 150],
      tableBorder: [40, 40, 70],
      tableHeader: [20, 20, 45],
      tableRow: [12, 12, 30],
    };

    const addPage = () => {
      pdf.addPage();
      pdf.setFillColor(...colors.bg);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      y = margin;
    };

    const checkSpace = (needed) => {
      if (y + needed > pageHeight - margin) addPage();
    };

    // First page background
    pdf.setFillColor(...colors.bg);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Title
    pdf.setTextColor(...colors.heading);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Architecture Specification', margin, y + 8);
    y += 16;
    pdf.setDrawColor(...colors.heading);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Footer on first page
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.muted);
    pdf.text('Generated by Gabriel', margin, pageHeight - 8);

    // Parse and render spec
    const lines = spec.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // ## Heading
      if (line.startsWith('## ')) {
        checkSpace(14);
        y += 6;
        pdf.setTextColor(...colors.subheading);
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.text(line.replace('## ', ''), margin, y);
        y += 2;
        pdf.setDrawColor(...colors.tableBorder);
        pdf.setLineWidth(0.3);
        pdf.line(margin, y + 1, pageWidth - margin, y + 1);
        y += 6;
        continue;
      }

      // ### Sub-heading
      if (line.startsWith('### ')) {
        checkSpace(12);
        y += 4;
        pdf.setTextColor(...colors.heading);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(line.replace('### ', ''), margin, y);
        y += 6;
        continue;
      }

      // Table row
      if (line.startsWith('|') && line.endsWith('|')) {
        const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());
        if (cells.every(c => /^[-:]+$/.test(c))) continue; // separator row

        checkSpace(8);
        const isHeader = i > 0 && lines[i + 1]?.includes('---');
        const colWidth = usableWidth / cells.length;

        if (isHeader) {
          pdf.setFillColor(...colors.tableHeader);
          pdf.setTextColor(255, 255, 255);
          pdf.setFont('helvetica', 'bold');
        } else {
          pdf.setFillColor(...colors.tableRow);
          pdf.setTextColor(...colors.text);
          pdf.setFont('helvetica', 'normal');
        }

        pdf.rect(margin, y - 4, usableWidth, 7, 'F');
        pdf.setFontSize(7);
        cells.forEach((cell, idx) => {
          const cellText = cell.length > 30 ? cell.substring(0, 28) + '...' : cell;
          pdf.text(cellText, margin + idx * colWidth + 2, y);
        });
        y += 7;
        continue;
      }

      // Bold text: **text**
      if (line.includes('**')) {
        checkSpace(6);
        pdf.setTextColor(...colors.text);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        const cleaned = line.replace(/\*\*/g, '').replace(/^- /, '• ');
        const splitLines = pdf.splitTextToSize(cleaned, usableWidth);
        splitLines.forEach(sl => {
          checkSpace(5);
          pdf.text(sl, margin, y);
          y += 4.5;
        });
        pdf.setFont('helvetica', 'normal');
        continue;
      }

      // Bullet points
      if (line.startsWith('- ') || line.startsWith('* ')) {
        checkSpace(6);
        pdf.setTextColor(...colors.text);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        const cleaned = '• ' + line.replace(/^[-*] /, '');
        const splitLines = pdf.splitTextToSize(cleaned, usableWidth - 4);
        splitLines.forEach(sl => {
          checkSpace(5);
          pdf.text(sl, margin + 3, y);
          y += 4.5;
        });
        continue;
      }

      // Empty line
      if (!line.trim()) {
        y += 3;
        continue;
      }

      // Normal text
      checkSpace(6);
      pdf.setTextColor(...colors.text);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const splitLines = pdf.splitTextToSize(line, usableWidth);
      splitLines.forEach(sl => {
        checkSpace(5);
        pdf.text(sl, margin, y);
        y += 4.5;
      });
    }

    // Add page numbers
    const totalPages = pdf.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);
      pdf.setFontSize(8);
      pdf.setTextColor(...colors.muted);
      pdf.text(`Page ${p} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 8);
      if (p > 1) pdf.text('Gabriel', margin, pageHeight - 8);
    }

    pdf.save('architecture-spec.pdf');
  };

  const msgCount = messages.filter(m => m.role === 'user').length;

  return (
    <div className="app-container">

      {/* Settings Overlay */}
      {showSettings && (
        <div className="settings-overlay">
          <div className="settings-panel">
            <div className="settings-title">⚙️ Groq API Key</div>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className="form-input" placeholder="gsk_..." />
            <div className="settings-actions">
              <button className="btn btn-ghost" onClick={() => setShowSettings(false)}>Cancel</button>
              <button className="btn btn-next" onClick={saveApiKey}>Save Key</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="header">
        <div className="header-left">
          <div className="header-logo"><Icons.Wand /></div>
          <div>
            <div className="header-title">Gabriel</div>
            <div className="header-subtitle">ONLINE</div>
          </div>
        </div>
        <div className="header-actions">
          {spec && (
            <button className="header-btn primary" onClick={downloadPDF}>
              <Icons.Download /> PDF
            </button>
          )}
          <button className="header-btn" onClick={startNew}><Icons.Refresh /></button>
          <button className="header-btn" onClick={() => setShowSettings(true)}><Icons.Settings /></button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="main-content">

        {/* Home — no messages yet */}
        {messages.length === 0 && !spec && (
          <div className="home-view fade-in">
            <div className="hero-icon"><Icons.Code /></div>
            <h2 className="hero-title">Your AI Architect</h2>
            <p className="hero-description">
              Describe what you're building. I'll ask the right technical questions, challenge your assumptions, then generate a battle-tested architecture spec.
            </p>

            <div className="cards-grid">
              <button className="quick-card" onClick={() => quickStart('I want to build a SaaS platform with multi-tenant architecture, user auth, and billing')}>
                <span className="card-emoji">🚀</span>
                <span className="card-text">SaaS Platform</span>
              </button>
              <button className="quick-card" onClick={() => quickStart('I need a real-time collaborative app like Figma or Google Docs with WebSocket support')}>
                <span className="card-emoji">⚡</span>
                <span className="card-text">Real-time App</span>
              </button>
              <button className="quick-card" onClick={() => quickStart("I'm building a REST API backend with auth, rate limiting, and a worker queue for background jobs")}>
                <span className="card-emoji">🔧</span>
                <span className="card-text">API Backend</span>
              </button>
              <button className="quick-card" onClick={() => quickStart("I'm building a mobile app with React Native, offline-first storage, and push notifications")}>
                <span className="card-emoji">📱</span>
                <span className="card-text">Mobile App</span>
              </button>
              <button className="quick-card" onClick={() => quickStart('I want to build a marketplace platform with escrow payments and a review system')}>
                <span className="card-emoji">🛒</span>
                <span className="card-text">Marketplace</span>
              </button>
              <button className="quick-card" onClick={() => quickStart('I want to build a developer tool / CLI / SDK with plugin architecture')}>
                <span className="card-emoji">🤖</span>
                <span className="card-text">Dev Tool / CLI</span>
              </button>
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="message-avatar">
                <Icons.Wand />
              </div>
            )}
            <div className={`message-bubble ${msg.role}`}>
              <div className="message-text">{msg.content}</div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="message assistant">
            <div className="message-avatar"><Icons.Wand /></div>
            <div className="message-bubble assistant">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}

        {/* Spec Output */}
        {spec && (
          <div className="spec-container fade-in">
            <div className="spec-header">
              <Icons.Code /> Architecture Specification
              <button className="header-btn primary" onClick={downloadPDF} style={{ marginLeft: 'auto', fontSize: '10px' }}>
                <Icons.Download /> Export PDF
              </button>
            </div>
            <div className="spec-content" id="spec-content">{spec}</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="error-banner">
          <Icons.AlertCircle /> {error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>✕</button>
        </div>
      )}

      {/* Footer Input */}
      <div className="footer">
        <div className="input-wrapper">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder={messages.length === 0 ? "Describe what you're building..." : "Answer the question..."}
            disabled={loading || !!spec}
          />
          <button
            className={`input-send-btn ${input.trim() && !loading ? '' : 'inactive'}`}
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim() || !!spec}
          >
            {loading ? <Icons.Loader /> : <Icons.Send />}
          </button>
        </div>
        <div className="input-hint">
          <span>Enter to send</span>
          <span>{msgCount} message{msgCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}
