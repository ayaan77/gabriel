import { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import { marked } from 'marked';
import { DEFAULT_API_KEY, MODEL_TIERS } from './config';
import { useGabriel } from './hooks/useGabriel';
import { isCouncilAvailable } from './utils/council';
import { analyzeWebsite } from './utils/intelligence';
import CROReport from './components/CROReport';

// Extracted components
import { Icons } from './components/Icons';
import { MessageContent, ThinkingBlock } from './components/MessageContent';
import { CouncilPanel } from './components/CouncilPanel';
import { SettingsModal } from './components/SettingsModal';
import { HomeView } from './components/HomeView';

// Configure marked for clean output
marked.setOptions({
  breaks: true,
  gfm: true,
});

export default function App() {
  const {
    mode, setMode,
    theme, setTheme,
    messages, setMessages,
    filteredMessages,
    input, setInput,
    apiKey, setApiKey,
    loading,
    error, setError,
    spec,
    startNew,
    startMode,
    sendMessage,
    clearHistory,
    searchQuery, setSearchQuery,
    showBookmarksOnly, setShowBookmarksOnly,
    toggleBookmark,
    modelTier, setModelTier,
    intelligenceReport, setIntelligenceReport,
    intelligenceLoading,
    runIntelligence,
    croAnalysis,
    croLoading,
    runCROAnalysis,
    councilEnabled, setCouncilEnabled,
    councilResults
  } = useGabriel();

  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const copyMessage = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const openSidePanel = async () => {
    try {
      if (chrome.sidePanel?.open) {
        const windowId = (await chrome.windows.getCurrent()).id;
        await chrome.sidePanel.open({ windowId });
        window.close();
      } else {
        await chrome.windows.create({
          url: chrome.runtime.getURL('index.html'),
          type: 'popup',
          width: 400,
          height: 700
        });
        window.close();
      }
    } catch (e) {
      try {
        await chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
        window.close();
      } catch {
        setError('Side panel not supported in this browser.');
      }
    }
  };

  const readPage = async () => {
    if (pageLoading) return;
    setPageLoading(true);
    setError('');

    const sendWithTimeout = (tabId, message, ms = 3000) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(null), ms);
        chrome.tabs.sendMessage(tabId, message)
          .then(resp => { clearTimeout(timer); resolve(resp); })
          .catch(err => { clearTimeout(timer); reject(err); });
      });
    };

    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

      if (!tab?.id) { setError('No active tab found.'); setPageLoading(false); return; }
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('about:')) {
        setError('Cannot read browser internal pages.');
        setPageLoading(false);
        return;
      }

      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
      } catch (injectErr) {
        console.warn('Script injection note:', injectErr);
      }
      await new Promise(r => setTimeout(r, 200));

      let context = '';

      try {
        const response = await sendWithTimeout(tab.id, { action: 'get_page_data' });
        if (response?.success && (response.text || response.mainContent)) {
          const { title, url, meta, headings, mainContent, links, text } = response;
          context = `📄 **Analyze this page:**\n\n`;
          context += `**Title:** ${title || 'Unknown'}\n`;
          context += `**URL:** ${url || 'Unknown'}\n`;

          if (meta?.description) context += `**Description:** ${meta.description}\n`;
          if (meta?.author) context += `**Author:** ${meta.author}\n`;
          if (meta?.siteName) context += `**Site:** ${meta.siteName}\n`;
          if (meta?.ogType) context += `**Type:** ${meta.ogType}\n`;
          if (meta?.keywords) context += `**Keywords:** ${meta.keywords}\n`;

          if (headings && headings.length > 0) {
            context += `\n**Page Structure:**\n`;
            headings.slice(0, 15).forEach(h => {
              const indent = h.level === 'H1' ? '' : h.level === 'H2' ? '  ' : '    ';
              context += `${indent}${h.level}: ${h.text}\n`;
            });
          }

          const contentBody = mainContent || text;
          if (contentBody) {
            context += `\n**Page Content:**\n${contentBody.substring(0, 6000)}\n`;
          }

          if (links && links.length > 0) {
            context += `\n**Key Links Found:**\n`;
            links.slice(0, 10).forEach(l => {
              context += `- [${l.text}](${l.href})\n`;
            });
          }

          if (meta?.structuredData) {
            context += `\n**Structured Data:** ${meta.structuredData.substring(0, 500)}\n`;
          }
        }
      } catch (e) {
        console.warn('Enhanced extraction failed:', e);
      }

      if (!context) {
        try {
          const response = await sendWithTimeout(tab.id, { action: 'get_visible_text' });
          if (response?.success && response.text) {
            context = `📄 **Analyze this page:**\n\n**Title:** ${response.title || 'Unknown'}\n**URL:** ${response.url || 'Unknown'}\n\n**Page Content:**\n${response.text.substring(0, 6000)}`;
          }
        } catch (e) {
          console.warn('Basic extraction also failed:', e);
        }
      }

      if (!context) {
        setError('Could not read page content. Please reload the tab and try again.');
        setPageLoading(false);
        return;
      }

      startMode('page', context);
    } catch (err) {
      console.error('Read page error:', err);
      setError('Page read failed: ' + (err.message || 'Unknown error'));
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const downloadPDF = () => {
    const content = spec || messages.filter(m => m.role === 'assistant').map(m => m.content).join('\n\n---\n\n');
    if (!content) return;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const lines = pdf.splitTextToSize(content, 180);
    pdf.text(lines, 10, 10);
    pdf.save('gabriel-spec.pdf');
  };

  const downloadMD = () => {
    const content = spec || messages.map(m => `### ${m.role === 'assistant' ? '🤖 Gabriel' : '👤 You'}\n\n${m.content}`).join('\n\n---\n\n');
    if (!content) return;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gabriel-spec-${Date.now()}.md`;
    a.click();
  };

  const msgCount = messages.filter(m => m.role === 'user').length;

  const handleCROQuestion = (question) => {
    sendMessage(`About the CRO audit: ${question}`);
  };

  const MODE_LABELS = {
    architect: 'Architect',
    cto: 'Brutal CTO',
    roast: 'Roast',
    compare: '⚖️ Compare',
    diagram: '📊 Diagram',
    analyze: '🔍 Analyze',
    intelligence: '🕵️ Intelligence',
    page: 'Page Analysis',
    cro: '🎯 CRO Audit'
  };

  return (
    <div className="app-container">

      {/* Settings Modal */}
      <SettingsModal
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        theme={theme}
        setTheme={setTheme}
        apiKey={apiKey}
        setApiKey={setApiKey}
        setError={setError}
        clearHistory={clearHistory}
      />

      {/* Glass Header */}
      <header className="header">
        <div className="header-left">
          <div className="header-logo">
            <Icons.Wand />
          </div>
          <div>
            <div className="header-title">Gabriel</div>
            <div className="header-subtitle">
              <span className="status-dot"></span>
              {messages.length > 0 ? MODE_LABELS[mode] : 'Online'}
            </div>
          </div>
        </div>

        <div className="header-actions">
          {messages.length > 0 && (
            <>
              <button className={`header-btn ${showBookmarksOnly ? 'active' : ''}`} onClick={() => setShowBookmarksOnly(!showBookmarksOnly)} title="Bookmarks">
                <Icons.Star filled={showBookmarksOnly} />
              </button>
              <button className={`header-btn ${showSearch ? 'active' : ''}`} onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }} title="Search">
                <Icons.Search />
              </button>
            </>
          )}

          <button className="header-btn" onClick={openSidePanel} title="Side Panel">
            <Icons.Layout />
          </button>

          {(spec || messages.length > 2) && (
            <button className="header-btn" onClick={downloadMD} title="Export">
              <Icons.Download />
            </button>
          )}

          <button className="header-btn" onClick={startNew} title="New Chat">
            <Icons.Refresh />
          </button>

          <button className="header-btn" onClick={() => setShowSettings(true)} title="Settings">
            <Icons.Settings />
          </button>
        </div>
      </header>

      {/* Model Tier Selector */}
      <div className="model-tier-bar">
        <div className="model-tier-selector">
          {Object.values(MODEL_TIERS).map(tier => (
            <button
              key={tier.id}
              className={`tier-btn ${modelTier === tier.id ? 'active' : ''}`}
              onClick={() => setModelTier(tier.id)}
              title={tier.description}
            >
              <span className="tier-emoji">{tier.emoji}</span>
              <span className="tier-label">{tier.shortName}</span>
            </button>
          ))}
        </div>
        <span className="model-indicator">{MODEL_TIERS[modelTier]?.description}</span>
      </div>

      {/* Council Toggle */}
      {isCouncilAvailable(mode) && (
        <div className="council-toggle-bar">
          <button
            className={`council-toggle-btn ${councilEnabled ? 'active' : ''}`}
            onClick={() => setCouncilEnabled(!councilEnabled)}
            title={councilEnabled ? 'Council Mode ON — querying all models' : 'Council Mode OFF — single model'}
          >
            <span>🏛️</span>
            <span>{councilEnabled ? 'Council ON' : 'Council OFF'}</span>
          </button>
          {councilEnabled && (
            <span className="council-hint">3 models will debate & synthesize</span>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">

        {showSearch && (
          <div style={{ marginBottom: 16, padding: '0 8px' }}>
            <div className="input-container" style={{ flexDirection: 'row', alignItems: 'center', padding: '4px 12px' }}>
              <Icons.Search />
              <input
                autoFocus
                className="input-field"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Home View */}
        {messages.length === 0 && !spec && (
          <HomeView startMode={startMode} runCROAnalysis={runCROAnalysis} />
        )}

        {/* CRO Report */}
        {croAnalysis && (
          <div className="cro-report-container">
            <CROReport
              analysis={croAnalysis}
              aiResponse={croAnalysis.aiResponse}
              onAskQuestion={handleCROQuestion}
              isLoading={croLoading}
            />
          </div>
        )}

        {/* Messages */}
        {filteredMessages.map((msg, i) => (
          <div key={msg.id || i} className={`message ${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="message-avatar">
                <Icons.Wand />
              </div>
            )}

            <div className="message-bubble">
              {msg.thinking && <ThinkingBlock content={msg.thinking} />}

              <MessageContent text={msg.content} />

              {msg.isCouncilResult && councilResults && (
                <CouncilPanel results={councilResults} onClose={() => { }} />
              )}

              <div className="msg-actions">
                <button
                  className="msg-action-btn"
                  onClick={() => toggleBookmark(msg.id)}
                  title={msg.bookmarked ? "Unbookmark" : "Bookmark"}
                >
                  <Icons.Star filled={msg.bookmarked} />
                </button>
                <button
                  className="msg-action-btn"
                  onClick={() => copyMessage(msg.content, i)}
                  title="Copy"
                >
                  {copiedMsgId === i ? <Icons.Check /> : <Icons.Copy />}
                </button>
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="message-avatar" style={{ background: 'var(--text-primary)', border: 'none' }}>
                <Icons.User />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="message assistant">
            <div className="message-avatar"><Icons.Wand /></div>
            <div className="message-bubble" style={{ display: 'flex', alignItems: 'center' }}>
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} style={{ height: 1 }} />
      </main>

      {/* Floating Input Footer */}
      <footer className="footer">
        <div className="input-container">
          <textarea
            ref={inputRef}
            className="input-field"
            placeholder={
              messages.length === 0 ? "What are we building today?" :
                mode === 'intelligence' ? "Enter competitor URL (e.g. apple.com)..." :
                  mode === 'analyze' ? "Enter GitHub Repo URL..." :
                    "Type a message..."
            }
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            rows={1}
            style={{ overflow: 'hidden' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            disabled={loading}
          />

          <div className="input-footer">
            <div className="input-tools">
              <button
                className="tool-btn"
                onClick={readPage}
                title="Read & Analyze Page"
                disabled={pageLoading || loading}
              >
                {pageLoading ? <Icons.Loader /> : <Icons.Page />}
              </button>
            </div>

            <button
              className="send-btn"
              disabled={!input.trim() || loading}
              onClick={() => sendMessage(input)}
            >
              {loading ? <div className="spinner" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> : <Icons.Send />}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
