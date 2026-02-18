import { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import { marked } from 'marked';
import { useGabriel } from './hooks/useGabriel';
import CROReport from './components/CROReport';

// Extracted components
import { Icons } from './components/Icons';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { SettingsModal } from './components/SettingsModal';
import { HomeView } from './components/HomeView';

// Configure marked for clean output
marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * App — root component for the Gabriel Chrome extension.
 *
 * Orchestrates all UI sections (header, messages, input footer) and
 * delegates state management to the `useGabriel` hook.
 */
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

  /** Copies a message to clipboard and shows a brief checkmark. */
  const copyMessage = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  /** Opens the extension as a Chrome side panel, falling back to a popup window. */
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

  /**
   * Reads the active tab's page content and sends it to the AI for analysis.
   * Injects the content script if needed, with a 3-second timeout fallback.
   */
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
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
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
          if (headings?.length > 0) {
            context += `\n**Page Structure:**\n`;
            headings.slice(0, 15).forEach(h => {
              const indent = h.level === 'H1' ? '' : h.level === 'H2' ? '  ' : '    ';
              context += `${indent}${h.level}: ${h.text}\n`;
            });
          }
          const contentBody = mainContent || text;
          if (contentBody) context += `\n**Page Content:**\n${contentBody.substring(0, 6000)}\n`;
          if (links?.length > 0) {
            context += `\n**Key Links Found:**\n`;
            links.slice(0, 10).forEach(l => { context += `- [${l.text}](${l.href})\n`; });
          }
          if (meta?.structuredData) context += `\n**Structured Data:** ${meta.structuredData.substring(0, 500)}\n`;
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

  /** Downloads the current conversation or spec as a PDF file. */
  const downloadPDF = () => {
    const content = spec || messages.filter(m => m.role === 'assistant').map(m => m.content).join('\n\n---\n\n');
    if (!content) return;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const lines = pdf.splitTextToSize(content, 180);
    pdf.text(lines, 10, 10);
    pdf.save('gabriel-spec.pdf');
  };

  /** Downloads the current conversation or spec as a Markdown file. */
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

  const handleCROQuestion = (question) => {
    sendMessage(`About the CRO audit: ${question}`);
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

      {/* Header + Model Tier + Council Toggle */}
      <ChatHeader
        mode={mode}
        messageCount={messages.length}
        hasSpec={!!spec}
        modelTier={modelTier}
        setModelTier={setModelTier}
        councilEnabled={councilEnabled}
        setCouncilEnabled={setCouncilEnabled}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        setSearchQuery={setSearchQuery}
        showBookmarksOnly={showBookmarksOnly}
        setShowBookmarksOnly={setShowBookmarksOnly}
        setShowSettings={setShowSettings}
        startNew={startNew}
        openSidePanel={openSidePanel}
        downloadMD={downloadMD}
      />

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

        {/* Message Feed */}
        <MessageList
          messages={filteredMessages}
          loading={loading}
          copiedMsgId={copiedMsgId}
          copyMessage={copyMessage}
          toggleBookmark={toggleBookmark}
          councilResults={councilResults}
        />

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
              {loading
                ? <div className="spinner" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                : <Icons.Send />
              }
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
