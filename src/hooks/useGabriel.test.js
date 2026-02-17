import { renderHook, act, waitFor } from '@testing-library/react';
import { useGabriel } from './useGabriel';
import { streamChatWithAI } from '../utils/ai';

// Mock AI utils
vi.mock('../utils/ai', () => ({
    streamChatWithAI: vi.fn(),
    chatWithAI: vi.fn(),
    generateSpec: vi.fn(),
    fetchGitHubRepo: vi.fn(),
    buildRepoContext: vi.fn()
}));

// Mock config
vi.mock('../config', () => ({
    DEFAULT_API_KEY: 'gsk_test_key'
}));

describe('useGabriel Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        // Reset chrome mock
        global.chrome.storage.local.get.mockImplementation((keys, cb) => cb({}));
    });

    it('initializes with default state', async () => {
        const { result } = renderHook(() => useGabriel());

        expect(result.current.mode).toBe('architect');
        expect(result.current.messages).toEqual([]);
        expect(result.current.apiKey).toBe('gsk_test_key');
    });

    it('sends a message and handles AI response', async () => {
        const { result } = renderHook(() => useGabriel());

        // Mock stream response
        streamChatWithAI.mockImplementation(async (msgs, key, mode, onStream) => {
            onStream('Hello');
            return 'Hello there';
        });

        await act(async () => {
            await result.current.sendMessage('Hi');
        });

        expect(result.current.messages).toHaveLength(2); // User + Assistant
        expect(result.current.messages[0].content).toBe('Hi');
        expect(result.current.messages[1].content).toBe('Hello there');
        expect(streamChatWithAI).toHaveBeenCalled();
    });

    it('toggles bookmarks', async () => {
        const { result } = renderHook(() => useGabriel());

        // Add a dummy message manually for testing
        act(() => {
            result.current.setMessages([{ id: '1', role: 'user', content: 'test', bookmarked: false }]);
        });

        act(() => {
            result.current.toggleBookmark('1');
        });

        expect(result.current.messages[0].bookmarked).toBe(true);

        act(() => {
            result.current.toggleBookmark('1');
        });

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
});
