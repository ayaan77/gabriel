import { useState, useEffect, useRef } from 'react';
import { chatWithAI, streamChatWithAI, generateSpec, fetchGitHubRepo, buildRepoContext } from './utils/ai';
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
  Copy: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>,
  Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>,
  Mic: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>,
  MicOff: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="2" x2="22" y2="22" /><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" /><path d="M5 10v2a7 7 0 0 0 12 5.12" /><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12" /><line x1="12" y1="19" x2="12" y2="22" /></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  Page: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>,
  Layout: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><line x1="15" x2="15" y1="3" y2="21" /></svg>,
};

// Render markdown-ish content with mermaid blocks
function MessageContent({ text }) {
  const parts = [];
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = mermaidRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    parts.push(<MermaidBlock key={key++} code={match[1].trim()} />);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return <div className="message-text">{parts}</div>;
}

function MermaidBlock({ code }) {
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

export default function App() {
  const [mode, setMode] = useState('architect'); // architect, roast, compare, diagram, analyze
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [spec, setSpec] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [generatingSpec, setGeneratingSpec] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [listening, setListening] = useState(false);

  const [needsPermission, setNeedsPermission] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);

  // Load history & key on mount
  useEffect(() => {
    try {
      if (chrome?.storage?.local) {
        chrome.storage.local.get(['groqApiKey', 'gabrielHistory', 'gabrielMode'], (r) => {
          if (r?.groqApiKey) setApiKey(r.groqApiKey);
          else setApiKey(DEFAULT_API_KEY);

          if (r?.gabrielHistory) setMessages(r.gabrielHistory);
          if (r?.gabrielMode) setMode(r.gabrielMode);
        });
      } else { setApiKey(DEFAULT_API_KEY); }
    } catch { setApiKey(DEFAULT_API_KEY); }
  }, []);

  // Save history on change
  useEffect(() => {
    if (chrome?.storage?.local && messages.length > 0) {
      chrome.storage.local.set({ gabrielHistory: messages, gabrielMode: mode });
    }
  }, [messages, mode]);

  // Check mic permission on load
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' }).then((result) => {
        setNeedsPermission(result.state !== 'granted');
        result.onchange = () => {
          setNeedsPermission(result.state !== 'granted');
        };
      }).catch(() => { });
    }
  }, []);

  // Listen for voice results from offscreen document
  useEffect(() => {
    const listener = (msg) => {
      if (msg.type === 'VOICE_STARTED') {
        setListening(true);
      }
      if (msg.type === 'VOICE_RESULT') {
        const text = msg.final + (msg.interim ? ' ' + msg.interim : '');
        setInput(text);
      }
      if (msg.type === 'VOICE_ERROR') {
        if (msg.error === 'not-allowed' || msg.error?.includes('permission')) {
          openPermissionPage();
        } else {
          setError('Voice: ' + msg.error);
        }
        setListening(false);
      }
      if (msg.type === 'VOICE_END') {
        setListening(false);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const openPermissionPage = () => {
    chrome.tabs.create({ url: 'permission.html' });
    setError('');
  };

  const toggleVoice = () => {
    if (listening) {
      chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
      setListening(false);
      return;
    }
    // Send start command to background → offscreen
    chrome.runtime.sendMessage({ type: 'START_RECORDING' });
  };

  const clearHistory = () => {
    setMessages([]);
    setSpec('');
    setError('');
    if (chrome?.storage?.local) {
      chrome.storage.local.remove(['gabrielHistory', 'gabrielMode']);
    }
  };

  const copyMessage = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };



  const openSidePanel = async () => {
    // Open side panel via background script (since direct API might be restricted)
    // Actually, popups CAN open it if triggered by user action.
    try {
      const windowId = (await chrome.windows.getCurrent()).id;
      await chrome.sidePanel.open({ windowId });
      window.close(); // Close popup
    } catch (e) {
      setError('Could not open side panel: ' + e.message);
    }
  };

  const readPage = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) { setError('No active tab found.'); return; }
      if (tab.url.startsWith('chrome://')) { setError('Cannot read browser internal pages.'); return; }

      // Inject content script explicitly to ensure it's there
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
      } catch (err) {
        console.log('Injection note:', err); // Might be already injected, which is fine
      }

      // Small delay to ensure script initializes
      await new Promise(r => setTimeout(r, 50));

      // Get visible text
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'get_visible_text' });
        if (response?.success && response.text) {
          const context = `📄 **Page: ${response.title}**\n${response.url}\n\n${response.text.substring(0, 4000)}`;
          setInput(prev => prev + (prev ? '\n\n' : '') + context);
        } else {
          setError('Could not read page text. Try reloading the tab.');
        }
      } catch (err) {
        setError('Failed to communicate with page. Try reloading the tab.');
      }
    } catch (err) {
      setError('Page read blocked: ' + err.message);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const startNew = () => {
    setMessages([]); setSpec(''); setInput(''); setError(''); setGeneratingSpec(false); setMode('architect'); setAnalyzing(false);
  };

  const saveApiKey = () => {
    if (!apiKey.startsWith('gsk_')) return setError('Invalid key');
    try { chrome?.storage?.local?.set({ groqApiKey: apiKey }); } catch { }
    setShowSettings(false); setError('');
  };

  const startMode = (newMode, initialMsg = '') => {
    setMode(newMode);
    setMessages([]);
    setSpec('');
    setError('');
    if (initialMsg) sendMessage(initialMsg, newMode);
  };

  const sendMessage = async (text, overrideMode = null) => {
    if (!text.trim() || loading) return;

    // Guard: check API key
    if (!apiKey || apiKey.trim() === '') {
      setError('No API key found. Click ⚙️ Settings to enter your Groq key.');
      return;
    }

    const currentMode = overrideMode || mode;
    const userMsg = { role: 'user', content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);
    setError('');

    // Check if it's a GitHub URL for analyze mode
    const ghMatch = text.match(/github\.com\/[^\/]+\/[^\/\s]+/);
    if (currentMode === 'analyze' && ghMatch) {
      try {
        setMessages([...updated, { role: 'assistant', content: '🔍 Fetching repository structure from GitHub...' }]);
        const repoData = await fetchGitHubRepo(text.trim());
        setMessages([...updated, { role: 'assistant', content: '📂 Got the repo! Analyzing architecture...' }]);
        const response = await chatWithAI([{ role: 'user', content: buildRepoContext(repoData) }], apiKey, 'analyze');
        const cleaned = response.replace('[ANALYSIS_COMPLETE]', '').trim();
        setMessages([...updated, { role: 'assistant', content: cleaned }]);
      } catch (err) {
        setMessages([...updated, { role: 'assistant', content: '❌ ' + (err.message || 'Failed to analyze repo. Make sure the URL is correct and the repo is public.') }]);
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      // Stream the response word-by-word
      const assistantMsg = { role: 'assistant', content: '' };
      setMessages([...updated, assistantMsg]);

      const finalText = await streamChatWithAI(updated, apiKey, currentMode, (textSoFar) => {
        setMessages([...updated, { role: 'assistant', content: textSoFar }]);
      });

      // Check completion markers after streaming finishes
      if (finalText.includes('[READY_TO_GENERATE]')) {
        const clean = finalText.replace('[READY_TO_GENERATE]', '').trim();
        setMessages([...updated, { role: 'assistant', content: clean + '\n\n⚡ Generating your architecture spec...' }]);
        setGeneratingSpec(true);
        const fullSpec = await generateSpec(updated, apiKey);
        setSpec(fullSpec);
        setMessages(prev => [...prev, { role: 'assistant', content: '✅ Architecture spec is ready! Scroll down to review or export as PDF.' }]);
        setGeneratingSpec(false);
      } else {
        // Strip completion markers
        const cleaned = finalText
          .replace('[ROAST_COMPLETE]', '')
          .replace('[COMPARE_COMPLETE]', '')
          .replace('[DIAGRAM_COMPLETE]', '')
          .replace('[ANALYSIS_COMPLETE]', '')
          .trim();
        setMessages([...updated, { role: 'assistant', content: cleaned }]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Multi-page PDF
  const downloadPDF = () => {
    const content = spec || messages.filter(m => m.role === 'assistant').map(m => m.content).join('\n\n---\n\n');
    if (!content) return;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), m = 15, uw = pw - m * 2;
    let y = m;
    const c = { bg: [5, 5, 16], h: [99, 102, 241], sh: [6, 182, 212], t: [200, 200, 220], mt: [120, 120, 150], tb: [40, 40, 70], th: [20, 20, 45], tr: [12, 12, 30] };
    const addPg = () => { pdf.addPage(); pdf.setFillColor(...c.bg); pdf.rect(0, 0, pw, ph, 'F'); y = m; };
    const chk = (n) => { if (y + n > ph - m) addPg(); };
    pdf.setFillColor(...c.bg); pdf.rect(0, 0, pw, ph, 'F');
    pdf.setTextColor(...c.h); pdf.setFontSize(20); pdf.setFont('helvetica', 'bold');
    pdf.text('Gabriel — Architecture Spec', m, y + 8); y += 14;
    pdf.setDrawColor(...c.h); pdf.setLineWidth(0.5); pdf.line(m, y, pw - m, y); y += 8;
    const lines = content.split('\n');
    let inMasterPrompt = false;
    for (const line of lines) {
      // Master Prompt section — special styling
      if (line.includes('Master Prompt') && line.startsWith('## ')) {
        addPg(); // Always start on fresh page
        inMasterPrompt = true;
        // Gradient-style header bar
        pdf.setFillColor(99, 102, 241); pdf.rect(m, y - 4, uw, 12, 'F');
        pdf.setTextColor(255, 255, 255); pdf.setFontSize(14); pdf.setFont('helvetica', 'bold');
        pdf.text('🤖  MASTER PROMPT — One-Shot Build Prompt', m + 4, y + 4);
        y += 16;
        pdf.setFillColor(15, 15, 35); pdf.rect(m, y, uw, 4, 'F'); // spacer
        y += 6;
        pdf.setTextColor(180, 180, 220); pdf.setFontSize(8); pdf.setFont('helvetica', 'italic');
        pdf.text('Copy the prompt below and paste it into any AI coding agent to build this project.', m, y);
        y += 8;
        // Border start
        pdf.setDrawColor(99, 102, 241); pdf.setLineWidth(0.5);
        pdf.rect(m - 2, y - 2, uw + 4, 4, 'S'); // top border marker
        y += 4;
        continue;
      }
      if (line.startsWith('## ') && inMasterPrompt) { inMasterPrompt = false; }

      if (inMasterPrompt) {
        // Render master prompt text in monospace-feel, slightly smaller
        if (!line.trim()) { y += 2; continue; }
        if (line.startsWith('```')) { continue; }
        chk(6);
        const isBold = line.includes('**');
        pdf.setTextColor(isBold ? 140 : 200, isBold ? 200 : 200, isBold ? 255 : 220);
        pdf.setFontSize(8); pdf.setFont('courier', isBold ? 'bold' : 'normal');
        const cl = line.replace(/\*\*/g, '').replace(/^#+\s*/, '');
        const sl = pdf.splitTextToSize(cl, uw - 4);
        sl.forEach(s => { chk(4.5); pdf.text(s, m + 2, y); y += 4; });
        continue;
      }

      if (line.startsWith('## ')) { chk(14); y += 6; pdf.setTextColor(...c.sh); pdf.setFontSize(13); pdf.setFont('helvetica', 'bold'); pdf.text(line.replace('## ', ''), m, y); y += 2; pdf.setDrawColor(...c.tb); pdf.setLineWidth(0.3); pdf.line(m, y + 1, pw - m, y + 1); y += 6; continue; }
      if (line.startsWith('### ')) { chk(12); y += 4; pdf.setTextColor(...c.h); pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.text(line.replace('### ', ''), m, y); y += 6; continue; }
      if (line.startsWith('|') && line.endsWith('|')) { const cells = line.split('|').filter(x => x.trim()).map(x => x.trim()); if (cells.every(x => /^[-:]+$/.test(x))) continue; chk(8); const isH = lines[lines.indexOf(line) + 1]?.includes('---'); const cw = uw / cells.length; pdf.setFillColor(...(isH ? c.th : c.tr)); pdf.setTextColor(isH ? 255 : c.t[0], isH ? 255 : c.t[1], isH ? 255 : c.t[2]); pdf.setFont('helvetica', isH ? 'bold' : 'normal'); pdf.rect(m, y - 4, uw, 7, 'F'); pdf.setFontSize(7); cells.forEach((cl, i) => { pdf.text(cl.length > 28 ? cl.substring(0, 26) + '..' : cl, m + i * cw + 2, y); }); y += 7; continue; }
      if (line.startsWith('- ') || line.startsWith('* ')) { chk(6); pdf.setTextColor(...c.t); pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); const sl = pdf.splitTextToSize('• ' + line.replace(/^[-*] /, ''), uw - 4); sl.forEach(s => { chk(5); pdf.text(s, m + 3, y); y += 4.5; }); continue; }
      if (!line.trim()) { y += 3; continue; }
      if (line.startsWith('```')) { continue; }
      chk(6); pdf.setTextColor(...c.t); pdf.setFontSize(9); pdf.setFont('helvetica', line.includes('**') ? 'bold' : 'normal'); const cl = line.replace(/\*\*/g, ''); const sl = pdf.splitTextToSize(cl, uw); sl.forEach(s => { chk(5); pdf.text(s, m, y); y += 4.5; });
    }
    const tp = pdf.internal.getNumberOfPages();
    for (let p = 1; p <= tp; p++) { pdf.setPage(p); pdf.setFontSize(8); pdf.setTextColor(...c.mt); pdf.text(`Page ${p}/${tp}`, pw - m - 18, ph - 8); pdf.text('Gabriel', m, ph - 8); }
    pdf.save('gabriel-spec.pdf');
  };

  const msgCount = messages.filter(m => m.role === 'user').length;

  const MODE_LABELS = {
    architect: '🏗️ Architect',
    roast: '🔥 Roast',
    compare: '⚖️ Compare',
    diagram: '📊 Diagram',
    analyze: '🔍 Analyze'
  };

  return (
    <div className="app-container">

      {/* Settings */}
      {showSettings && (
        <div className="settings-overlay">
          <div className="settings-panel">
            <div className="settings-title">⚙️ Groq API Key</div>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className="form-input" placeholder="gsk_..." />
            <div className="settings-actions">
              <button className="btn btn-ghost" onClick={() => setShowSettings(false)}>Cancel</button>
              <button className="btn btn-next" onClick={saveApiKey}>Save</button>
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
            <div className="header-subtitle">
              {messages.length > 0 ? MODE_LABELS[mode] : 'ONLINE'}
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button className="header-btn" onClick={openSidePanel} title="Open Side Panel">
            <Icons.Layout />
          </button>
          {(spec || messages.length > 2) && (
            <button className="header-btn primary" onClick={downloadPDF}><Icons.Download /> PDF</button>
          )}
          <button className="header-btn" onClick={startNew} title="New Chat"><Icons.Refresh /></button>
          <button className="header-btn" onClick={() => setShowSettings(true)}><Icons.Settings /></button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="main-content">
        {needsPermission && (
          <div className="permission-banner" onClick={openPermissionPage}>
            <span>🎤 Voice input requires permission. Tap to enable.</span>
            <div style={{ fontWeight: 'bold' }}>➜</div>
          </div>
        )}

        {/* Home — no messages */}
        {messages.length === 0 && !spec && (
          <div className="home-view fade-in">
            <div className="hero-icon"><Icons.Wand /></div>
            <h2 className="hero-title">Gabriel</h2>
            <p className="hero-description">
              Your AI architect. Describe your project, roast your stack, compare technologies, or analyze a GitHub repo.
            </p>

            <div className="cards-grid">
              <button className="quick-card" onClick={() => startMode('architect', 'I want to build a new project')}>
                <span className="card-emoji">🏗️</span>
                <span className="card-text">Design Architecture</span>
              </button>
              <button className="quick-card" onClick={() => startMode('roast')}>
                <span className="card-emoji">🔥</span>
                <span className="card-text">Roast My Stack</span>
              </button>
              <button className="quick-card" onClick={() => startMode('compare')}>
                <span className="card-emoji">⚖️</span>
                <span className="card-text">Compare Tech</span>
              </button>
              <button className="quick-card" onClick={() => startMode('diagram')}>
                <span className="card-emoji">�</span>
                <span className="card-text">Generate Diagram</span>
              </button>
              <button className="quick-card" onClick={() => startMode('analyze')}>
                <span className="card-emoji">🔍</span>
                <span className="card-text">Analyze Repo</span>
              </button>
              <button className="quick-card" onClick={() => startMode('architect', "I have an idea but I don't know where to start")}>
                <span className="card-emoji">💡</span>
                <span className="card-text">I Have an Idea</span>
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
              <MessageContent text={msg.content} />
              {msg.role === 'assistant' && (
                <button
                  className="msg-copy-btn"
                  onClick={() => copyMessage(msg.content, i)}
                  title="Copy response"
                >
                  {copiedMsgId === i ? <Icons.Check /> : <Icons.Copy />}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div className="message assistant">
            <div className="message-avatar"><Icons.Wand /></div>
            <div className="message-bubble assistant">
              <div className="typing-indicator"><span></span><span></span><span></span></div>
            </div>
          </div>
        )}

        {/* Spec output */}
        {spec && (
          <div className="spec-container fade-in">
            <div className="spec-header">
              <Icons.Code /> Architecture Specification
              <button className="header-btn primary" onClick={downloadPDF} style={{ marginLeft: 'auto', fontSize: '10px' }}>
                <Icons.Download /> PDF
              </button>
            </div>
            <div className="spec-content" id="spec-content">
              <MessageContent text={spec} />
            </div>
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

      {/* Footer */}
      <div className="footer">
        <div className="input-wrapper">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder={
              mode === 'analyze' && messages.length === 0
                ? 'Paste a GitHub repo URL...'
                : mode === 'roast' && messages.length === 0
                  ? 'Describe your current tech stack...'
                  : mode === 'compare' && messages.length === 0
                    ? 'e.g. "Supabase vs Firebase for my SaaS"'
                    : mode === 'diagram' && messages.length === 0
                      ? 'Describe the system to diagram...'
                      : messages.length === 0
                        ? "Describe what you're building..."
                        : 'Type your response...'
            }
            disabled={loading}
          />
          <button
            className="input-action-btn"
            onClick={readPage}
            title="Read current page"
          >
            <Icons.Page />
          </button>
          <button
            className={`input-mic-btn ${listening ? 'listening' : ''}`}
            onClick={toggleVoice}
            title={listening ? 'Stop listening' : 'Voice input'}
          >
            {listening ? <Icons.MicOff /> : <Icons.Mic />}
          </button>
          <button
            className={`input-send-btn ${input.trim() && !loading ? '' : 'inactive'}`}
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
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
