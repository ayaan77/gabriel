/* global chrome */
import { useState, useCallback } from 'react';
import { chatWithAI, streamChatWithAI, generateSpec, fetchGitHubRepo, buildRepoContext, PROMPTS } from '../utils/ai';
import { runCouncil, isCouncilAvailable } from '../utils/council';
import { usePersistence } from './usePersistence';
import { useMessages } from './useMessages';
import { useCRO } from './useCRO';

/**
 * useGabriel — root hook for the Gabriel Chrome extension.
 *
 * Composes three focused sub-hooks:
 * - `usePersistence` — chrome.storage, theme, model tier, council toggle
 * - `useMessages` — message list, search, bookmarks
 * - `useCRO` — CRO audit pipeline
 *
 * Owns: sendMessage, startMode, startNew, clearHistory, mode, input,
 * loading, error, spec, councilResults.
 *
 * @returns {object} All state and actions consumed by App.jsx
 */
export function useGabriel() {
    // ── Sub-hooks ──────────────────────────────────────────────────────────
    const {
        apiKey, setApiKey,
        theme, setTheme,
        modelTier, setModelTier,
        councilEnabled, setCouncilEnabled,
    } = usePersistence();

    const {
        messages, setMessages,
        hydrateMessages,
        filteredMessages,
        searchQuery, setSearchQuery,
        showBookmarksOnly, setShowBookmarksOnly,
        toggleBookmark,
    } = useMessages();

    // ── Local state ────────────────────────────────────────────────────────
    const [mode, setMode] = useState('architect');
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [spec, setSpec] = useState('');
    const [generatingSpec, setGeneratingSpec] = useState(false);
    const [intelligenceReport, setIntelligenceReport] = useState(null);
    const [councilResults, setCouncilResults] = useState(null);

    // ── CRO sub-hook (needs shared state injected) ─────────────────────────
    const {
        croAnalysis, setCroAnalysis,
        croLoading, setCroLoading,
        croError, setCroError,
        runCROAnalysis,
    } = useCRO({ apiKey, modelTier, councilEnabled, setMessages, setCouncilResults });

    // ── Load history from storage ──────────────────────────────────────────
    // (apiKey, theme, modelTier, councilEnabled loaded by usePersistence)
    // History and mode are owned here since they interact with sendMessage
    useState(() => {
        try {
            if (chrome?.storage?.local) {
                chrome.storage.local.get(['gabrielHistory', 'gabrielMode'], (r) => {
                    if (r?.gabrielHistory) setMessages(hydrateMessages(r.gabrielHistory));
                    if (r?.gabrielMode) setMode(r.gabrielMode);
                });
            }
        } catch { /* ignore */ }
    });

    // ── Persist history ────────────────────────────────────────────────────
    // Note: theme/modelTier/councilEnabled persistence handled by usePersistence
    const persistHistory = useCallback((msgs, currentMode) => {
        if (chrome?.storage?.local && msgs.length > 0) {
            chrome.storage.local.set({ gabrielHistory: msgs, gabrielMode: currentMode });
        }
    }, []);

    // ── Actions ────────────────────────────────────────────────────────────

    /**
     * Clears the conversation history from state and chrome.storage.local.
     */
    const clearHistory = useCallback(() => {
        setMessages([]);
        setSpec('');
        setError('');
        if (chrome?.storage?.local) {
            chrome.storage.local.remove(['gabrielHistory', 'gabrielMode']);
        }
    }, [setMessages]);

    /**
     * Resets the entire conversation to a clean slate.
     */
    const startNew = useCallback(() => {
        setMessages([]);
        if (chrome?.storage?.local) chrome.storage.local.set({ gabrielHistory: [] });
        setSpec('');
        setInput('');
        setError('');
        setGeneratingSpec(false);
        setMode('architect');
        setSearchQuery('');
        setShowBookmarksOnly(false);
    }, [setMessages, setSearchQuery, setShowBookmarksOnly]);

    /**
     * Sends a user message and streams the AI response.
     *
     * Routes through the appropriate handler based on mode:
     * - `analyze` + GitHub URL → fetchGitHubRepo → chatWithAI
     * - `intelligence` → analyzeWebsite → streamChatWithAI
     * - council ON → runCouncil (3-stage pipeline)
     * - default → streamChatWithAI
     *
     * @param {string} text - The user's message
     * @param {string|null} overrideMode - Force a specific mode
     * @param {Array|null} historyOverride - Use a custom history
     */
    const sendMessage = useCallback(async (text, overrideMode = null, historyOverride = null) => {
        if (!text.trim() || loading) return;

        if (!apiKey || apiKey.trim() === '') {
            setError('No API key found. Click ⚙️ Settings to enter your Groq key.');
            return;
        }

        const currentMode = overrideMode || mode;
        const userMsg = { role: 'user', content: text.trim(), id: Date.now().toString(), bookmarked: false };
        const currentHistory = historyOverride || messages;
        const updated = [...currentHistory, userMsg];

        setMessages(updated);
        setInput('');
        setLoading(true);
        setError('');
        setCouncilResults(null);

        try {
            // 1. GitHub Repo Analysis
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
                    setMessages(prev => [...prev.filter(m => !m.id?.includes('-got')), { role: 'assistant', content: cleaned, id: Date.now().toString(), isCouncilResult: true }]);
                } else {
                    const response = await chatWithAI([{ role: 'user', content: repoContext }], apiKey, 'analyze', modelTier);
                    const cleaned = response.replace('[ANALYSIS_COMPLETE]', '').trim();
                    setMessages(prev => [...prev.filter(m => !m.id?.includes('-got')), { role: 'assistant', content: cleaned, id: Date.now().toString() }]);
                }
                persistHistory(updated, currentMode);
                return;
            }

            // 2. Stream response placeholder
            const assistantId = Date.now() + 1 + '';
            setMessages([...updated, { role: 'assistant', content: '', id: assistantId, bookmarked: false }]);

            // 3. Council mode
            if (councilEnabled && isCouncilAvailable(currentMode)) {
                const systemPrompt = PROMPTS[currentMode] || PROMPTS.architect;
                const councilData = await runCouncil(text.trim(), systemPrompt, apiKey, (progressMsg) => {
                    setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: progressMsg } : m));
                });
                setCouncilResults(councilData);
                const cleaned = (councilData.stage3.content || '')
                    .replace('[READY_TO_GENERATE]', '').replace('[ROAST_COMPLETE]', '')
                    .replace('[COMPARE_COMPLETE]', '').replace('[ANALYSIS_COMPLETE]', '').trim();
                setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: cleaned, isCouncilResult: true } : m));

            } else {
                // 4. Single-model streaming
                const finalText = await streamChatWithAI(updated, apiKey, currentMode, (textSoFar) => {
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
                    setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content, thinking } : m));
                }, modelTier);

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
                        .replace('[ROAST_COMPLETE]', '').replace('[COMPARE_COMPLETE]', '')
                        .replace('[DIAGRAM_COMPLETE]', '').replace('[ANALYSIS_COMPLETE]', '').trim();
                    setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: cleaned } : m));
                }
            }

            persistHistory(updated, currentMode);

        } catch (err) {
            console.error('AI Error:', err);
            const errorMsg = err.message || 'An unexpected error occurred.';
            if (errorMsg.includes('401')) setError('Invalid API Key. Please check settings.');
            else if (errorMsg.includes('429')) setError('Rate limit exceeded. Try again later.');
            else setError('Error: ' + errorMsg);
            setMessages(prev => [...prev, { role: 'assistant', content: '❌ Error: ' + errorMsg, id: Date.now() + '-err' }]);
        } finally {
            setLoading(false);
        }
    }, [apiKey, loading, messages, mode, modelTier, councilEnabled, setMessages, persistHistory]);

    /**
     * Switches to a new mode, optionally sending an initial message.
     * Handles special setup for intelligence and CRO modes.
     *
     * @param {string} newMode - Mode to switch to
     * @param {string} initialMsg - Optional first message to send
     */
    const startMode = useCallback((newMode, initialMsg = '') => {
        setMode(newMode);
        setSpec('');
        setError('');
        setIntelligenceReport(null);
        setCroAnalysis(null);
        setCroError('');

        if (newMode === 'intelligence') {
            setMessages([{ role: 'assistant', content: '🕵️ **Intelligence Mode Active**\n\nEnter a competitor website URL (e.g., `kashmirbox.com`) to generate a deep strategic report.', id: Date.now().toString() }]);
            return;
        }
        if (newMode === 'cro') {
            setMessages([{ role: 'assistant', content: '🚀 **Starting CRO Audit...**\n\nConnecting to page...', id: Date.now().toString() }]);
            return;
        }

        setMessages([]);
        if (newMode === 'page' && initialMsg) {
            sendMessage(initialMsg, newMode, []);
            return;
        }
        if (initialMsg) sendMessage(initialMsg, newMode, []);
    }, [sendMessage, setMessages, setCroAnalysis, setCroError]);

    // ── Return all state and actions ───────────────────────────────────────
    return {
        // Persistence (from usePersistence)
        apiKey, setApiKey,
        theme, setTheme,
        modelTier, setModelTier,
        councilEnabled, setCouncilEnabled,

        // Messages (from useMessages)
        messages, setMessages,
        filteredMessages,
        searchQuery, setSearchQuery,
        showBookmarksOnly, setShowBookmarksOnly,
        toggleBookmark,

        // CRO (from useCRO)
        croAnalysis, setCroAnalysis,
        croLoading, setCroLoading,
        croError, setCroError,
        runCROAnalysis,

        // Local state
        mode, setMode,
        input, setInput,
        loading,
        error, setError,
        spec, setSpec,
        generatingSpec,
        intelligenceReport, setIntelligenceReport,
        councilResults, setCouncilResults,

        // Actions
        sendMessage,
        startNew,
        startMode,
        clearHistory,
    };
}
