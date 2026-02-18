import { renderHook, act } from '@testing-library/react';
import { useGabriel } from './useGabriel';
import { streamChatWithAI, chatWithAI } from '../utils/ai';
import { runCouncil } from '../utils/council';

// Mock AI utils
vi.mock('../utils/ai', () => ({
    streamChatWithAI: vi.fn(),
    chatWithAI: vi.fn(),
    generateSpec: vi.fn(),
    fetchGitHubRepo: vi.fn(),
    buildRepoContext: vi.fn()
}));

// Mock council
vi.mock('../utils/council', () => ({
    runCouncil: vi.fn(),
    isCouncilAvailable: vi.fn(() => true)
}));

// Mock config
vi.mock('../config', () => ({
    DEFAULT_API_KEY: 'gsk_test_key',
    MODEL_TIERS: {
        high: { id: 'high', shortName: '70B', emoji: '🚀', description: 'Fast & efficient · llama-3.1-8b' },
        mid: { id: 'mid', shortName: '8B', emoji: '⚡', description: 'Fast & efficient · llama-3.1-8b' },
        low: { id: 'low', shortName: '9B', emoji: '💰', description: 'Budget · gemma2-9b' }
    },
    COUNCIL_CONFIG: {
        models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
        chairman: 'llama-3.3-70b-versatile',
        stageDelay: 0,
        enabledModes: ['architect', 'analyze', 'cro', 'roast', 'intelligence']
    }
}));

describe('useGabriel Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        global.chrome.storage.local.get.mockImplementation((keys, cb) => cb({}));
    });

    // ===== EXISTING TESTS =====

    it('initializes with default state', async () => {
        const { result } = renderHook(() => useGabriel());

        expect(result.current.mode).toBe('architect');
        expect(result.current.messages).toEqual([]);
        expect(result.current.apiKey).toBe('gsk_test_key');
    });

    it('sends a message and handles AI response', async () => {
        const { result } = renderHook(() => useGabriel());

        streamChatWithAI.mockImplementation(async (msgs, key, mode, onStream) => {
            onStream('Hello');
            return 'Hello there';
        });

        await act(async () => {
            await result.current.sendMessage('Hi');
        });

        expect(result.current.messages).toHaveLength(2);
        expect(result.current.messages[0].content).toBe('Hi');
        expect(result.current.messages[1].content).toBe('Hello there');
        expect(streamChatWithAI).toHaveBeenCalled();
    });

    it('toggles bookmarks', async () => {
        const { result } = renderHook(() => useGabriel());

        act(() => {
            result.current.setMessages([{ id: '1', role: 'user', content: 'test', bookmarked: false }]);
        });

        act(() => { result.current.toggleBookmark('1'); });
        expect(result.current.messages[0].bookmarked).toBe(true);

        act(() => { result.current.toggleBookmark('1'); });
        expect(result.current.messages[0].bookmarked).toBe(false);
    });

    it('filters messages by search query', async () => {
        const { result } = renderHook(() => useGabriel());

        act(() => {
            result.current.setMessages([
                { id: '1', role: 'user', content: 'Apple', bookmarked: false },
                { id: '2', role: 'assistant', content: 'Banana', bookmarked: false }
            ]);
            result.current.setSearchQuery('App');
        });

        expect(result.current.filteredMessages).toHaveLength(1);
        expect(result.current.filteredMessages[0].content).toBe('Apple');
    });

    it('filters messages by bookmark', async () => {
        const { result } = renderHook(() => useGabriel());

        act(() => {
            result.current.setMessages([
                { id: '1', role: 'user', content: 'One', bookmarked: true },
                { id: '2', role: 'assistant', content: 'Two', bookmarked: false }
            ]);
            result.current.setShowBookmarksOnly(true);
        });

        expect(result.current.filteredMessages).toHaveLength(1);
        expect(result.current.filteredMessages[0].content).toBe('One');
    });

    // ===== NEW TESTS =====

    it('startNew resets all state to defaults', async () => {
        const { result } = renderHook(() => useGabriel());

        // Set up some state first
        act(() => {
            result.current.setMessages([{ id: '1', role: 'user', content: 'hello', bookmarked: false }]);
            result.current.setSearchQuery('hello');
            result.current.setShowBookmarksOnly(true);
        });

        expect(result.current.messages).toHaveLength(1);

        act(() => { result.current.startNew(); });

        expect(result.current.messages).toHaveLength(0);
        expect(result.current.searchQuery).toBe('');
        expect(result.current.showBookmarksOnly).toBe(false);
        expect(result.current.mode).toBe('architect');
    });

    it('returns error when API key is missing', async () => {
        const { result } = renderHook(() => useGabriel());

        // Override apiKey to empty
        act(() => { result.current.setApiKey(''); });

        await act(async () => {
            await result.current.sendMessage('Hello');
        });

        expect(result.current.error).toContain('No API key');
        expect(streamChatWithAI).not.toHaveBeenCalled();
    });

    it('council toggle enables and disables council mode', () => {
        const { result } = renderHook(() => useGabriel());

        expect(result.current.councilEnabled).toBe(false);

        act(() => { result.current.setCouncilEnabled(true); });
        expect(result.current.councilEnabled).toBe(true);

        act(() => { result.current.setCouncilEnabled(false); });
        expect(result.current.councilEnabled).toBe(false);
    });

    it('mode switching updates mode state', () => {
        const { result } = renderHook(() => useGabriel());

        expect(result.current.mode).toBe('architect');

        act(() => { result.current.setMode('analyze'); });
        expect(result.current.mode).toBe('analyze');

        act(() => { result.current.setMode('roast'); });
        expect(result.current.mode).toBe('roast');

        act(() => { result.current.setMode('intelligence'); });
        expect(result.current.mode).toBe('intelligence');
    });

    it('clearHistory removes all messages and resets state', () => {
        const { result } = renderHook(() => useGabriel());

        act(() => {
            result.current.setMessages([
                { id: '1', role: 'user', content: 'test', bookmarked: false },
                { id: '2', role: 'assistant', content: 'response', bookmarked: false }
            ]);
        });

        expect(result.current.messages).toHaveLength(2);

        act(() => { result.current.clearHistory(); });

        expect(result.current.messages).toHaveLength(0);
        expect(result.current.error).toBe('');
    });
});
