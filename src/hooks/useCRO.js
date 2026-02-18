/* global chrome */
import { useState, useCallback } from 'react';
import { streamChatWithAI } from '../utils/ai';
import { analyzePage, buildAIContext, exportAnalysis, generateReportMetadata } from '../utils/croAnalyzer';
import { runCouncil } from '../utils/council';
import { PROMPTS } from '../utils/ai';

/**
 * useCRO — manages the Conversion Rate Optimization audit feature.
 *
 * Handles the full CRO pipeline:
 * 1. Inject content script into the active tab
 * 2. Capture page data (with retry logic)
 * 3. Run RAG-based pattern analysis
 * 4. Stream AI analysis (or route through council)
 * 5. Export the full report
 *
 * @param {object} deps - External dependencies from parent hook
 * @param {string} deps.apiKey - Groq API key
 * @param {string} deps.modelTier - Active model tier
 * @param {boolean} deps.councilEnabled - Whether council mode is active
 * @param {Function} deps.setMessages - Message setter from useMessages
 * @param {Function} deps.setCouncilResults - Council results setter
 *
 * @returns {{ croAnalysis, setCroAnalysis, croLoading, croError, runCROAnalysis }}
 */
export function useCRO({ apiKey, modelTier, councilEnabled, setMessages, setCouncilResults }) {
    const [croAnalysis, setCroAnalysis] = useState(null);
    const [croLoading, setCroLoading] = useState(false);
    const [croError, setCroError] = useState('');

    /**
     * Runs the full CRO audit on the currently active browser tab.
     * Injects the content script, captures page data, runs RAG analysis,
     * and streams the AI report.
     */
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

            setMessages(prev => {
                const filtered = prev.filter(m => m.role === 'user');
                return [...filtered, { role: 'assistant', content: '🔌 Connecting to page...', id: Date.now() + '-status' }];
            });

            // Inject dependencies
            try {
                await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['lib/html2canvas.min.js'] });
            } catch (e) { console.warn('html2canvas injection note:', e); }

            try {
                await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
            } catch (e) { console.warn('Content script injection note:', e); }

            await new Promise(r => setTimeout(r, 800));

            // Ping to verify content script is alive
            try {
                const pingResp = await new Promise(resolve => {
                    const timer = setTimeout(() => resolve(null), 2000);
                    chrome.tabs.sendMessage(tab.id, { action: 'ping' })
                        .then(resp => { clearTimeout(timer); resolve(resp); })
                        .catch(() => { clearTimeout(timer); resolve(null); });
                });
                if (!pingResp?.success) console.warn('⚠️ Ping failed, content script may not be responding');
            } catch (e) { console.warn('Ping check failed:', e); }

            // Helper: send message with timeout
            const sendWithTimeout = (tabId, message, ms = 15000) =>
                new Promise(resolve => {
                    const timer = setTimeout(() => { console.warn('CRO timed out after', ms, 'ms'); resolve(null); }, ms);
                    chrome.tabs.sendMessage(tabId, message)
                        .then(resp => { clearTimeout(timer); resolve(resp); })
                        .catch(err => { clearTimeout(timer); resolve({ success: false, error: err?.message || 'Connection failed' }); });
                });

            // First capture attempt
            let response = null;
            try { response = await sendWithTimeout(tab.id, { action: 'get_cro_data' }); }
            catch (e) { console.warn('First CRO attempt threw:', e); }

            // Retry once if first attempt fails
            if (!response?.success) {
                console.warn('First CRO capture attempt failed, retrying...');
                setMessages(prev => prev.map(m => m.id?.includes('-status') ? { ...m, content: '🔄 Retrying page capture...' } : m));

                try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['lib/html2canvas.min.js'] }); } catch (e) { /* ignore */ }
                try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }); } catch (e) { /* ignore */ }
                await new Promise(r => setTimeout(r, 1500));

                try { response = await sendWithTimeout(tab.id, { action: 'get_cro_data' }); }
                catch (e) { console.warn('Second CRO attempt threw:', e); }
            }

            if (!response?.success) {
                const detail = response?.error || 'No response from content script';
                const msg = `Failed to capture page data. ${detail.includes('Could not') ? 'The page may be blocking scripts.' : 'Please reload the page and try again.'}`;
                setCroError(msg);
                setMessages(prev => [...prev, { role: 'assistant', content: '❌ ' + msg, id: Date.now().toString() }]);
                setCroLoading(false);
                return;
            }

            const assistantId = Date.now() + '-cro';

            // Progress steps
            const steps = [
                { msg: "🔍 Scanning page structure...", duration: 1000 },
                { msg: "🧠 Loading embedding model...", duration: 2000 },
                { msg: "📊 Generating page embeddings...", duration: 1500 },
                { msg: "📚 Retrieving relevant patterns from Knowledge Base...", duration: 2000 },
                { msg: "🎯 Running semantic similarity search...", duration: 1500 },
                { msg: "⚖️ Evaluating trust signals and credibility...", duration: 1000 },
                { msg: "🎨 Analyzing visual hierarchy and layout...", duration: 1000 },
                { msg: "📈 Calculating conversion probability score...", duration: 1500 },
            ];

            setMessages([{ role: 'assistant', content: '⏳ **Initializing CRO Audit...**', id: assistantId }]);
            for (const step of steps) {
                setMessages([{ role: 'assistant', content: `⏳ **CRO Audit In Progress**\n\n${step.msg}`, id: assistantId }]);
                await new Promise(r => setTimeout(r, step.duration));
            }

            // RAG analysis
            const analysis = await analyzePage(response.data);
            const aiContext = buildAIContext(analysis, response.data);

            setMessages([{ role: 'assistant', content: '🎯 **CRO Analysis Starting**\n\nSynthesizing final report...', id: assistantId }]);

            let aiResponse;
            if (councilEnabled) {
                const systemPrompt = PROMPTS['cro'] || PROMPTS.architect;
                const councilData = await runCouncil(aiContext, systemPrompt, apiKey, (progressMsg) => {
                    setMessages([{ role: 'assistant', content: progressMsg, id: assistantId }]);
                });
                setCouncilResults(councilData);
                aiResponse = (councilData.stage3.content || '').replace('[CRO_AUDIT_COMPLETE]', '').trim();
                setMessages([{ role: 'assistant', content: aiResponse + '\n\n✅ **CRO Audit Complete!**', id: assistantId, isCouncilResult: true }]);
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
                        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content, thinking } : m));
                    },
                    modelTier
                );
                aiResponse = aiResponse.replace('[CRO_AUDIT_COMPLETE]', '').trim();
                setMessages([{ role: 'assistant', content: aiResponse + '\n\n✅ **CRO Audit Complete!**', id: assistantId }]);
            }

            const fullAnalysis = exportAnalysis(analysis, response.data);
            fullAnalysis.aiResponse = aiResponse;
            fullAnalysis.metadata = generateReportMetadata(analysis);
            setCroAnalysis(fullAnalysis);

        } catch (err) {
            console.error('CRO Analysis Error:', err);
            setCroError('CRO analysis failed: ' + (err.message || 'Unknown error'));
            setMessages([{ role: 'assistant', content: '❌ CRO analysis failed: ' + (err.message || 'Unknown error'), id: Date.now() + '-cro-err' }]);
        } finally {
            setCroLoading(false);
        }
    }, [apiKey, modelTier, councilEnabled, setMessages, setCouncilResults]);

    return { croAnalysis, setCroAnalysis, croLoading, setCroLoading, croError, setCroError, runCROAnalysis };
}
