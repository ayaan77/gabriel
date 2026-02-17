import { useState, useEffect, useCallback } from 'react';
import { chatWithAI, streamChatWithAI, generateSpec, fetchGitHubRepo, buildRepoContext } from '../utils/ai';
import { analyzeCompetitor } from '../utils/intelligence';
import { DEFAULT_API_KEY } from '../config';

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
    const [analyzing, setAnalyzing] = useState(false);
    const [modelTier, setModelTier] = useState('high');
    const [intelligenceReport, setIntelligenceReport] = useState(null);
    const [intelligenceLoading, setIntelligenceLoading] = useState(false);

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
                chrome.storage.local.get(['groqApiKey', 'gabrielHistory', 'gabrielMode', 'theme', 'gabrielModelTier'], (r) => {
                    if (r?.groqApiKey) setApiKey(r.groqApiKey);
                    else setApiKey(DEFAULT_API_KEY);

                    if (r?.gabrielHistory) setMessages(hydrateMessages(r.gabrielHistory));
                    if (r?.gabrielMode) setMode(r.gabrielMode);
                    if (r?.theme) setTheme(r.theme);
                    if (r?.gabrielModelTier) setModelTier(r.gabrielModelTier);
                });
            } else { setApiKey(DEFAULT_API_KEY); }
        } catch { setApiKey(DEFAULT_API_KEY); }
    }, []);

    // Persist state
    useEffect(() => {
        if (chrome?.storage?.local) {
            if (messages.length > 0) chrome.storage.local.set({ gabrielHistory: messages, gabrielMode: mode });
            chrome.storage.local.set({ theme, gabrielModelTier: modelTier });
        }
    }, [messages, mode, theme, modelTier]);

    // Apply theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const clearHistory = useCallback(() => {
        setMessages([]);
        setSpec('');
        setError('');
        if (chrome?.storage?.local) {
            chrome.storage.local.remove(['gabrielHistory', 'gabrielMode']);
        }
    }, []);

    const startNew = useCallback(() => {
        setMessages([]);
        if (chrome?.storage?.local) chrome.storage.local.set({ gabrielHistory: [] });
        setSpec('');
        setInput('');
        setError('');
        setGeneratingSpec(false);
        setMode('architect');
        setAnalyzing(false);
        setSearchQuery('');
        setShowBookmarksOnly(false);
    }, []);

    const toggleBookmark = useCallback((id) => {
        setMessages(prev => prev.map(m =>
            m.id === id ? { ...m, bookmarked: !m.bookmarked } : m
        ));
    }, []);

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

        // Use override history if provided (e.g. from startMode), else current state
        const currentHistory = historyOverride || messages;
        const updated = [...currentHistory, userMsg];

        setMessages(updated);
        setInput('');
        setLoading(true);
        setError('');

        try {
            // Analyze Mode logic
            const ghMatch = text.match(/github\.com\/[^\/]+\/[^\/\s]+/);
            if (currentMode === 'analyze' && ghMatch) {
                setMessages([...updated, { role: 'assistant', content: '🔍 Fetching repository structure from GitHub...', id: Date.now() + '-load' }]);
                const repoData = await fetchGitHubRepo(text.trim());

                // Remove loader, add ready msg
                // Actually streamChatWithAI usually handles appending.
                // But here we are doing custom flow.

                setMessages(prev => [...prev.filter(m => !m.id?.includes('-load')), { role: 'assistant', content: '📂 Got the repo! Analyzing architecture...', id: Date.now() + '-got' }]);

                const response = await chatWithAI([{ role: 'user', content: buildRepoContext(repoData) }], apiKey, 'analyze', modelTier);
                const cleaned = response.replace('[ANALYSIS_COMPLETE]', '').trim();

                setMessages(prev => [
                    ...prev.filter(m => !m.id?.includes('-got')),
                    { role: 'assistant', content: cleaned, id: Date.now().toString() }
                ]);
                return;
            }

            // Normal Mode logic
            const assistantId = Date.now() + 1 + '';
            const assistantMsg = { role: 'assistant', content: '', id: assistantId, bookmarked: false };
            setMessages([...updated, assistantMsg]);

            const finalText = await streamChatWithAI(updated, apiKey, currentMode, (textSoFar) => {
                setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: textSoFar } : m));
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

        } catch (err) {
            console.error("AI Error:", err);
            const errorMsg = err.message || 'An unexpected error occurred.';
            if (errorMsg.includes('401')) setError('Invalid API Key. Please check settings.');
            else if (errorMsg.includes('429')) setError('Rate limit exceeded. Try again later.');
            else setError('Error: ' + errorMsg);

            setMessages(prev => [...prev, { role: 'assistant', content: '❌ Error: ' + errorMsg, id: Date.now() + '-err' }]);
        } finally {
            setLoading(false);
        }
    }, [apiKey, loading, messages, mode, modelTier]);

    const startMode = useCallback((newMode, initialMsg = '') => {
        setMode(newMode);
        setMessages([]);
        setSpec('');
        setError('');
        setIntelligenceReport(null); // Clear intelligence when starting new mode

        // If there's an initial message, send it immediately with empty history context
        if (initialMsg) {
            sendMessage(initialMsg, newMode, []);
        }
    }, [sendMessage]);

    const runIntelligence = useCallback(async (url) => {
        if (!apiKey || apiKey.trim() === '') {
            setError('No API key found. Click ⚙️ Settings to enter your Groq key.');
            return;
        }

        setIntelligenceLoading(true);
        setError('');
        setIntelligenceReport(null);

        try {
            const report = await analyzeCompetitor(url, apiKey, modelTier);
            setIntelligenceReport(report);
        } catch (err) {
            console.error('Intelligence error:', err);
            setError('Intelligence gathering failed: ' + (err.message || 'Unknown error'));
        } finally {
            setIntelligenceLoading(false);
        }
    }, [apiKey, modelTier]);

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
        intelligenceLoading,
        runIntelligence
    };
}
