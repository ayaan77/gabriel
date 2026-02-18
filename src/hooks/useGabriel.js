/* global chrome */
import { useState, useEffect, useCallback } from 'react';
import { chatWithAI, streamChatWithAI, generateSpec, fetchGitHubRepo, buildRepoContext, PROMPTS } from '../utils/ai';
import { analyzeWebsite } from '../utils/intelligence';
import { DEFAULT_API_KEY } from '../config';
import { analyzePage, buildAIContext, exportAnalysis, generateReportMetadata } from '../utils/croAnalyzer';
import { runCouncil, isCouncilAvailable } from '../utils/council';

/**
 * useGabriel — central state and logic hook for the Gabriel Chrome extension.
 *
 * Manages all application state (messages, mode, API key, council, CRO, search/bookmarks)
 * and exposes action functions consumed by App.jsx and its child components.
 *
 * Persists conversation history, theme, model tier, and council preference
 * to `chrome.storage.local` automatically.
 *
 * @returns {object} State values and action functions
 */
export function useGabriel() {
    const [mode, setMode] = useState('architect');
    const [theme, setTheme] = useState('dark');
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [spec, setSpec] = useState('');
    const [generatingSpec, setGeneratingSpec] = useState(false);
    const [modelTier, setModelTier] = useState('high');
    const [intelligenceReport, setIntelligenceReport] = useState(null);

    // Council State
    const [councilEnabled, setCouncilEnabled] = useState(false);
    const [councilResults, setCouncilResults] = useState(null);

    // CRO Analysis State
    const [croAnalysis, setCroAnalysis] = useState(null);
    const [croLoading, setCroLoading] = useState(false);
    const [croError, setCroError] = useState('');

    // Search & Bookmark State
    const [searchQuery, setSearchQuery] = useState('');
    const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

    // Helper to ensure messages have IDs
    const hydrateMessages = (msgs) => {
        return msgs.map((m, i) => ({
            ...m,
            id: m.id || Date.now() + '-' + i,
            bookmarked: m.bookmarked || false
        }));
    };

    // Load initial state
    useEffect(() => {
        try {
            if (chrome?.storage?.local) {
                chrome.storage.local.get(['groqApiKey', 'gabrielHistory', 'gabrielMode', 'theme', 'gabrielModelTier', 'councilEnabled'], (r) => {
                    if (r?.groqApiKey) setApiKey(r.groqApiKey);
                    else setApiKey(DEFAULT_API_KEY);

                    if (r?.gabrielHistory) setMessages(hydrateMessages(r.gabrielHistory));
                    if (r?.gabrielMode) setMode(r.gabrielMode);
                    if (r?.theme) setTheme(r.theme);
                    if (r?.gabrielModelTier) setModelTier(r.gabrielModelTier);
                    if (r?.councilEnabled !== undefined) setCouncilEnabled(r.councilEnabled);
                });
            } else { setApiKey(DEFAULT_API_KEY); }
        } catch { setApiKey(DEFAULT_API_KEY); }
    }, []);

    // Persist state
    useEffect(() => {
        if (chrome?.storage?.local) {
            if (messages.length > 0) chrome.storage.local.set({ gabrielHistory: messages, gabrielMode: mode });
            chrome.storage.local.set({ theme, gabrielModelTier: modelTier, councilEnabled });
        }
    }, [messages, mode, theme, modelTier, councilEnabled]);

    // Apply theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    /**
     * Clears the conversation history from state and chrome.storage.local.
     * Also resets spec, error, and search state.
     */
    const clearHistory = useCallback(() => {
        setMessages([]);
        setSpec('');
        setError('');
        if (chrome?.storage?.local) {
            chrome.storage.local.remove(['gabrielHistory', 'gabrielMode']);
        }
    }, []);

    /**
     * Resets the entire conversation to a clean slate.
     * Clears messages, spec, input, error, search, and resets mode to 'architect'.
     */
    const startNew = useCallback(() => {
        setMessages([]);
        if (chrome?.storage?.local) chrome.storage.local.set({ gabrielHistory: [] });
        setSpec('');
        setInput('');
        setError('');
        setGeneratingSpec(false);
        setMode('architect');
        setMode('architect');
        setSearchQuery('');
        setShowBookmarksOnly(false);
    }, []);

    /**
     * Toggles the bookmarked state of a message.
     * @param {string} id - The message ID to bookmark/unbookmark
     */
    const toggleBookmark = useCallback((id) => {
        setMessages(prev => prev.map(m =>
            m.id === id ? { ...m, bookmarked: !m.bookmarked } : m
        ));
    }, []);

    /**
     * Sends a user message and streams the AI response.
     *
     * Handles all modes: architect, analyze (GitHub), intelligence (competitor URL),
     * roast, cto, compare, diagram, page, and cro.
     * When council mode is enabled, routes through the 3-stage council pipeline.
     *
     * @param {string} text - The user's message text
     * @param {string|null} overrideMode - Force a specific mode for this message
     * @param {Array|null} historyOverride - Use a custom history instead of current messages
     */
    const sendMessage = useCallback(async (text, overrideMode = null, historyOverride = null) => {
        if (!text.trim() || loading) return;

        if (!apiKey || apiKey.trim() === '') {
            setError('No API key found. Click ⚙️ Settings to enter your Groq key.');
            return;
        }

        const currentMode = overrideMode || mode;
        const userMsg = {
            role: 'user',
            content: text.trim(),
            id: Date.now().toString(),
            bookmarked: false
        };

        const currentHistory = historyOverride || messages;
        const updated = [...currentHistory, userMsg];

        setMessages(updated);
        setInput('');
        setLoading(true);
        setError('');
        setCouncilResults(null);

        try {
            // 1. Analyze Repo Mode
            const ghMatch = text.match(/github\.com\/[^\/]+\/[^\/\s]+/);
            if (currentMode === 'analyze' && ghMatch) {
                setMessages([...updated, { role: 'assistant', content: '🔍 Fetching repository structure from GitHub...', id: Date.now() + '-load' }]);
                const repoData = await fetchGitHubRepo(text.trim());
                const repoContext = buildRepoContext(repoData);

                setMessages(prev => [...prev.filter(m => !m.id?.includes('-load')), { role: 'assistant', content: '📂 Got the repo! Analyzing architecture...', id: Date.now() + '-got' }]);

                if (councilEnabled) {
                    const systemPrompt = PROMPTS['analyze'] || PROMPTS.architect;
                    const councilData = await runCouncil(repoContext, systemPrompt, apiKey, (progressMsg) => {
                        setMessages(prev => prev.map(m => m.id?.includes('-got') ? { ...m, content: progressMsg } : m));
                    });
                    setCouncilResults(councilData);
                    const cleaned = (councilData.stage3.content || '').replace('[ANALYSIS_COMPLETE]', '').trim();
                    setMessages(prev => [
                        ...prev.filter(m => !m.id?.includes('-got')),
                        { role: 'assistant', content: cleaned, id: Date.now().toString(), isCouncilResult: true }
                    ]);
                } else {
                    const response = await chatWithAI([{ role: 'user', content: repoContext }], apiKey, 'analyze', modelTier);
                    const cleaned = response.replace('[ANALYSIS_COMPLETE]', '').trim();
                    setMessages(prev => [
                        ...prev.filter(m => !m.id?.includes('-got')),
                        { role: 'assistant', content: cleaned, id: Date.now().toString() }
                    ]);
                }
                return;
            }

            // Define Assistant Message for Stream
            const assistantId = Date.now() + 1 + '';
            const assistantMsg = { role: 'assistant', content: '', id: assistantId, bookmarked: false };
            setMessages([...updated, assistantMsg]);

            if (currentMode === 'intelligence') {
                let targetUrl = text.trim();
                if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

                setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: '🕵️ Scanning target website for tech stack & ads...' } : m));

                try {
                    const data = await analyzeWebsite(targetUrl);

                    const IntelContext = `TARGET ANALYSIS DATA:
Domain: ${data.domain}

PAGE CONTENT:
Title: ${data.pageContent.title}
Description: ${data.pageContent.description}
Headings: ${data.pageContent.headings.join(' | ')}
Sample Text: "${data.pageContent.keyPhrases.substring(0, 1500)}..."

TECH STACK:
${JSON.stringify(data.stack, null, 2)}

ADS & TRAFFIC:
Meta Ads Library: ${data.metaAdsUrl}
Google Ads Transparency: ${data.googleAdsUrl}
Traffic Estimate: ${data.estimatedTraffic}

Analyze this data and provide a competitive intelligence report. Focus on the PAGE CONTENT to understand their brand positioning and proposition.`;

                    if (councilEnabled) {
                        const systemPrompt = PROMPTS['intelligence'] || PROMPTS.architect;
                        const councilData = await runCouncil(IntelContext, systemPrompt, apiKey, (progressMsg) => {
                            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: progressMsg } : m));
                        });
                        setCouncilResults(councilData);
                        const cleaned = (councilData.stage3.content || '').replace('[INTELLIGENCE_COMPLETE]', '').trim();
                        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: cleaned, isCouncilResult: true } : m));
                    } else {
                        const finalIntel = await streamChatWithAI([{ role: 'user', content: IntelContext }], apiKey, 'intelligence', (textSoFar) => {
                            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: textSoFar } : m));
                        }, modelTier);
                        const cleaned = finalIntel.replace('[INTELLIGENCE_COMPLETE]', '').trim();
                        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: cleaned } : m));
                    }

                } catch (err) {
                    setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: '❌ Analysis failed. ' + err.message } : m));
                }
                return;
            }

            // 3. Council Mode — multi-model ensemble
            if (councilEnabled && isCouncilAvailable(currentMode)) {
                const systemPrompt = PROMPTS[currentMode] || PROMPTS.architect;
                const userQuery = text.trim();

                const councilData = await runCouncil(userQuery, systemPrompt, apiKey, (progressMsg) => {
                    setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: progressMsg } : m));
                });

                setCouncilResults(councilData);

                // Display chairman's final synthesis
                const finalContent = councilData.stage3.content || 'No synthesis generated.';
                const cleaned = finalContent
                    .replace('[READY_TO_GENERATE]', '')
                    .replace('[ROAST_COMPLETE]', '')
                    .replace('[COMPARE_COMPLETE]', '')
                    .replace('[ANALYSIS_COMPLETE]', '')
                    .trim();

                setMessages(prev => prev.map(m => m.id === assistantId ? {
                    ...m,
                    content: cleaned,
                    isCouncilResult: true
                } : m));

                // 4. Normal Single-Model Chat Mode
            } else {
                const finalText = await streamChatWithAI(updated, apiKey, currentMode, (textSoFar) => {
                    // Check for thinking tags
                    let content = textSoFar;
                    let thinking = '';

                    const thinkMatch = textSoFar.match(/<think>([\s\S]*?)<\/think>/);
                    if (thinkMatch) {
                        thinking = thinkMatch[1].trim();
                        content = textSoFar.replace(/<think>[\s\S]*?<\/think>/, '').trim();
                    } else if (textSoFar.includes('<think>')) {
                        thinking = textSoFar.split('<think>')[1].trim();
                        content = textSoFar.split('<think>')[0].trim();
                    }

                    setMessages(prev => prev.map(m => m.id === assistantId ? {
                        ...m,
                        content: content,
                        thinking: thinking
                    } : m));
                }, modelTier);

                // Handle Completion Markers
                if (finalText.includes('[READY_TO_GENERATE]')) {
                    const clean = finalText.replace('[READY_TO_GENERATE]', '').trim();
                    setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: clean + '\n\n⚡ Generating your architecture spec...' } : m));

                    setGeneratingSpec(true);
                    const fullSpec = await generateSpec(updated, apiKey, modelTier);
                    setSpec(fullSpec);
                    setMessages(prev => [...prev, { role: 'assistant', content: '✅ Architecture spec is ready! Scroll down to review or export as PDF.', id: Date.now() + '-spec' }]);
                    setGeneratingSpec(false);
                } else {
                    const cleaned = finalText
                        .replace('[ROAST_COMPLETE]', '')
                        .replace('[COMPARE_COMPLETE]', '')
                        .replace('[DIAGRAM_COMPLETE]', '')
                        .replace('[ANALYSIS_COMPLETE]', '')
                        .trim();
                    setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: cleaned } : m));
                }
            }

        } catch (err) {
            console.error("AI Error:", err);
            const errorMsg = err.message || 'An unexpected error occurred.';
            if (errorMsg.includes('401')) setError('Invalid API Key. Please check settings.');
            else if (errorMsg.includes('429')) setError('Rate limit exceeded. Try again later.');
            else setError('Error: ' + errorMsg);

            setMessages(prev => [...prev.filter(m => m.id !== (Date.now() + 1 + '')), { role: 'assistant', content: '❌ Error: ' + errorMsg, id: Date.now() + '-err' }]);
        } finally {
            setLoading(false);
        }
    }, [apiKey, loading, messages, mode, modelTier, councilEnabled]);

    // CRO Analysis Function
    const runCROAnalysis = useCallback(async () => {
        if (!apiKey || apiKey.trim() === '') {
            const msg = 'No API key found. Click ⚙️ Settings to enter your Groq key.';
            setCroError(msg);
            setMessages(prev => [...prev, { role: 'assistant', content: '❌ ' + msg, id: Date.now().toString() }]);
            return;
        }

        setCroLoading(true);
        setCroError('');
        setCroAnalysis(null);

        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

            if (!tab?.id) {
                const msg = 'No active tab found. Please click inside the web page and try again.';
                setCroError(msg);
                setMessages(prev => [...prev, { role: 'assistant', content: '❌ ' + msg, id: Date.now().toString() }]);
                setCroLoading(false);
                return;
            }

            if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('about:')) {
                const msg = 'Cannot analyze browser internal pages. Please navigate to a real website.';
                setCroError(msg);
                setMessages(prev => [...prev, { role: 'assistant', content: '❌ ' + msg, id: Date.now().toString() }]);
                setCroLoading(false);
                return;
            }

            // Status: Connecting
            setMessages(prev => {
                const filtered = prev.filter(m => m.role === 'user');
                return [...filtered, { role: 'assistant', content: '🔌 Connecting to page...', id: Date.now() + '-status' }];
            });

            // Inject content script if needed
            try {
                // First inject html2canvas dependency
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['lib/html2canvas.min.js']
                });
            } catch (injectErr) {
                console.warn('html2canvas injection note:', injectErr);
            }

            try {
                // Then inject the main content script
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
            } catch (injectErr) {
                console.warn('Content script injection note:', injectErr);
            }
            await new Promise(r => setTimeout(r, 800));

            // Quick ping to verify content script is alive
            try {
                const pingResp = await new Promise((resolve) => {
                    const timer = setTimeout(() => resolve(null), 2000);
                    chrome.tabs.sendMessage(tab.id, { action: 'ping' })
                        .then(resp => { clearTimeout(timer); resolve(resp); })
                        .catch(() => { clearTimeout(timer); resolve(null); });
                });
                if (pingResp?.success) {
                    console.log('✅ Content script connected:', pingResp.version);
                } else {
                    console.warn('⚠️ Ping failed, content script may not be responding');
                }
            } catch (e) {
                console.warn('Ping check failed:', e);
            }

            // Capture CRO data from content script with generous timeout
            const sendWithTimeout = (tabId, message, ms = 15000) => {
                return new Promise((resolve) => {
                    const timer = setTimeout(() => {
                        console.warn('CRO data capture timed out after', ms, 'ms');
                        resolve(null);
                    }, ms);
                    chrome.tabs.sendMessage(tabId, message)
                        .then(resp => { clearTimeout(timer); resolve(resp); })
                        .catch(err => {
                            clearTimeout(timer);
                            console.warn('sendMessage error:', err?.message || err);
                            resolve({ success: false, error: err?.message || 'Connection failed' });
                        });
                });
            };

            // Get CRO data - first attempt
            let response = null;
            try {
                response = await sendWithTimeout(tab.id, { action: 'get_cro_data' });
            } catch (e) {
                console.warn('First CRO attempt threw:', e);
            }

            // Retry once if first attempt fails (content script may need refresh)
            if (!response?.success) {
                console.warn('First CRO capture attempt failed, retrying...');
                setMessages(prev => prev.map(m => m.id?.includes('-status') ? { ...m, content: '🔄 Retrying page capture...' } : m));

                // Re-inject content script before retry
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['lib/html2canvas.min.js']
                    });
                } catch (e) { /* ignore */ }
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    });
                } catch (e) { /* ignore */ }

                await new Promise(r => setTimeout(r, 1500));

                try {
                    response = await sendWithTimeout(tab.id, { action: 'get_cro_data' });
                } catch (e) {
                    console.warn('Second CRO attempt threw:', e);
                }
            }

            if (!response?.success) {
                const detail = response?.error || 'No response from content script';
                console.error('CRO capture failed:', detail);
                const msg = `Failed to capture page data. ${detail.includes('Could not') ? 'The page may be blocking scripts.' : 'Please reload the page and try again.'}`;
                setCroError(msg);
                setMessages(prev => [...prev, { role: 'assistant', content: '❌ ' + msg, id: Date.now().toString() }]);
                setCroLoading(false);
                return;
            }

            const assistantId = Date.now() + '-cro';

            // Initial placeholder
            setMessages([{
                role: 'assistant',
                content: '⏳ **Initializing CRO Audit...**',
                id: assistantId
            }]);

            // RAG Analysis Steps (True RAG with embeddings)
            const steps = [
                { msg: "🔍 Scanning page structure...", duration: 1000 },
                { msg: "🧠 Loading embedding model...", duration: 2000 },
                { msg: "📊 Generating page embeddings...", duration: 1500 },
                { msg: "📚 Retrieving relevant patterns from Knowledge Base...", duration: 2000 },
                { msg: "🎯 Running semantic similarity search...", duration: 1500 },
                { msg: "⚖️ Evaluating trust signals and credibility...", duration: 1000 },
                { msg: "🎨 Analyzing visual hierarchy and layout...", duration: 1000 },
                { msg: "📈 Calculating conversion probability score...", duration: 1500 }
            ];

            for (const step of steps) {
                setMessages([{
                    role: 'assistant',
                    content: `⏳ **CRO Audit In Progress**\n\n${step.msg}`,
                    id: assistantId
                }]);
                await new Promise(r => setTimeout(r, step.duration));
            }

            // Run RAG pattern analysis (async)
            console.log('🧠 Starting RAG analysis...');
            const analysis = await analyzePage(response.data);
            console.log(`✅ RAG analysis complete. Using embeddings: ${analysis.usingRAG}`);

            // Build AI context
            const aiContext = buildAIContext(analysis, response.data);

            // Get AI analysis
            setMessages([{
                role: 'assistant',
                content: '🎯 **CRO Analysis Starting**\n\nSynthesizing final report...',
                id: assistantId
            }]);

            let aiResponse;
            if (councilEnabled) {
                const systemPrompt = PROMPTS['cro'] || PROMPTS.architect;
                const councilData = await runCouncil(aiContext, systemPrompt, apiKey, (progressMsg) => {
                    setMessages([{ role: 'assistant', content: progressMsg, id: assistantId }]);
                });
                setCouncilResults(councilData);
                aiResponse = (councilData.stage3.content || '').replace('[CRO_AUDIT_COMPLETE]', '').trim();
                setMessages([{
                    role: 'assistant',
                    content: aiResponse + '\n\n✅ **CRO Audit Complete!** Scroll up to view the detailed report.',
                    id: assistantId,
                    isCouncilResult: true
                }]);
            } else {
                aiResponse = await streamChatWithAI(
                    [{ role: 'user', content: aiContext }],
                    apiKey,
                    'cro',
                    (textSoFar) => {
                        let content = textSoFar;
                        let thinking = '';

                        const thinkMatch = textSoFar.match(/<think>([\s\S]*?)<\/think>/);
                        if (thinkMatch) {
                            thinking = thinkMatch[1].trim();
                            content = textSoFar.replace(/<think>[\s\S]*?<\/think>/, '').trim();
                        } else if (textSoFar.includes('<think>')) {
                            thinking = textSoFar.split('<think>')[1].trim();
                            content = textSoFar.split('<think>')[0].trim();
                        }

                        setMessages(prev => prev.map(m => m.id === assistantId ? {
                            ...m,
                            content: content,
                            thinking: thinking
                        } : m));
                    },
                    modelTier
                );
                aiResponse = aiResponse.replace('[CRO_AUDIT_COMPLETE]', '').trim();

                setMessages([{
                    role: 'assistant',
                    content: aiResponse + '\n\n✅ **CRO Audit Complete!** Scroll up to view the detailed report.',
                    id: assistantId
                }]);
            }

            // Export full analysis (shared between council and single-model paths)
            const fullAnalysis = exportAnalysis(analysis, response.data);
            fullAnalysis.aiResponse = aiResponse;
            fullAnalysis.metadata = generateReportMetadata(analysis);
            setCroAnalysis(fullAnalysis);

        } catch (err) {
            console.error('CRO Analysis Error:', err);
            setCroError('CRO analysis failed: ' + (err.message || 'Unknown error'));
            setMessages([{
                role: 'assistant',
                content: '❌ CRO analysis failed: ' + (err.message || 'Unknown error'),
                id: Date.now() + '-cro-err'
            }]);
        } finally {
            setCroLoading(false);
        }
    }, [apiKey, modelTier, councilEnabled]);

    const startMode = useCallback((newMode, initialMsg = '') => {
        setMode(newMode);
        setSpec('');
        setError('');
        setIntelligenceReport(null);
        setCroAnalysis(null);
        setCroError('');

        // Special handling for Intelligence Mode
        if (newMode === 'intelligence') {
            setMessages([{
                role: 'assistant',
                content: '🕵️ **Intelligence Mode Active**\n\nEnter a competitor website URL (e.g., `kashmirbox.com`) to generate a deep strategic report.',
                id: Date.now().toString()
            }]);
            return;
        }

        // Special handling for CRO Mode
        if (newMode === 'cro') {
            setMessages([{
                role: 'assistant',
                content: '🚀 **Starting CRO Audit...**\n\nConnecting to page...',
                id: Date.now().toString()
            }]);
            return;
        }

        setMessages([]);
        if (newMode === 'page' && initialMsg) {
            // Logic for page analysis handled via startMode('page', context) from App.jsx
            // startMode('page', context) calls this. 
            // We want to treat 'initialMsg' as the USER message that contains the context.
            sendMessage(initialMsg, newMode, []);
            return;
        }

        // If there's an initial message (e.g., "Roast my stack"), send it
        if (initialMsg) {
            sendMessage(initialMsg, newMode, []);
        } else {
            setMessages([]); // Ensure empty if no message
        }
    }, [sendMessage]);


    // Derived state for filtering
    const filteredMessages = messages.filter(m => {
        if (showBookmarksOnly && !m.bookmarked) return false;
        if (searchQuery && !m.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return {
        mode, setMode,
        theme, setTheme,
        messages, setMessages,
        filteredMessages,
        input, setInput,
        apiKey, setApiKey,
        loading,
        error, setError,
        spec, setSpec,
        generatingSpec,
        sendMessage,
        startNew,
        startMode,
        clearHistory,
        searchQuery, setSearchQuery,
        showBookmarksOnly, setShowBookmarksOnly,
        toggleBookmark,
        modelTier, setModelTier,
        intelligenceReport, setIntelligenceReport,
        croAnalysis, setCroAnalysis,
        croLoading, setCroLoading,
        croError, setCroError,
        runCROAnalysis,
        councilEnabled, setCouncilEnabled,
        councilResults, setCouncilResults
    };
}
