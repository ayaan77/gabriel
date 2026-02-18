import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMessages } from './useMessages';

describe('useMessages Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes with empty messages and default filters', () => {
        const { result } = renderHook(() => useMessages());

        expect(result.current.messages).toEqual([]);
        expect(result.current.filteredMessages).toEqual([]);
        expect(result.current.searchQuery).toBe('');
        expect(result.current.showBookmarksOnly).toBe(false);
    });

    it('sets and updates messages', () => {
        const { result } = renderHook(() => useMessages());

        act(() => {
            result.current.setMessages([
                { role: 'user', content: 'hello', id: '1', bookmarked: false },
                { role: 'assistant', content: 'hi there', id: '2', bookmarked: false },
            ]);
        });

        expect(result.current.messages).toHaveLength(2);
        expect(result.current.messages[0].content).toBe('hello');
    });

    it('toggles bookmark on a message', () => {
        const { result } = renderHook(() => useMessages());

        act(() => {
            result.current.setMessages([
                { role: 'user', content: 'hello', id: 'msg-1', bookmarked: false },
            ]);
        });

        act(() => result.current.toggleBookmark('msg-1'));
        expect(result.current.messages[0].bookmarked).toBe(true);

        act(() => result.current.toggleBookmark('msg-1'));
        expect(result.current.messages[0].bookmarked).toBe(false);
    });

    it('filters messages by search query', () => {
        const { result } = renderHook(() => useMessages());

        act(() => {
            result.current.setMessages([
                { role: 'user', content: 'React patterns', id: '1', bookmarked: false },
                { role: 'assistant', content: 'Vue is also great', id: '2', bookmarked: false },
                { role: 'user', content: 'Tell me about React hooks', id: '3', bookmarked: false },
            ]);
        });

        act(() => result.current.setSearchQuery('react'));
        expect(result.current.filteredMessages).toHaveLength(2);
        expect(result.current.filteredMessages[0].id).toBe('1');
        expect(result.current.filteredMessages[1].id).toBe('3');
    });

    it('filters messages by bookmark only', () => {
        const { result } = renderHook(() => useMessages());

        act(() => {
            result.current.setMessages([
                { role: 'user', content: 'msg1', id: '1', bookmarked: true },
                { role: 'assistant', content: 'msg2', id: '2', bookmarked: false },
                { role: 'user', content: 'msg3', id: '3', bookmarked: true },
            ]);
        });

        act(() => result.current.setShowBookmarksOnly(true));
        expect(result.current.filteredMessages).toHaveLength(2);
        expect(result.current.filteredMessages[0].id).toBe('1');
        expect(result.current.filteredMessages[1].id).toBe('3');
    });

    it('hydrates messages with IDs and bookmarked flag', () => {
        const { result } = renderHook(() => useMessages());

        const rawMsgs = [
            { role: 'user', content: 'no id' },
            { role: 'assistant', content: 'also no id' },
        ];

        let hydrated;
        act(() => {
            hydrated = result.current.hydrateMessages(rawMsgs);
        });

        expect(hydrated[0].id).toBeDefined();
        expect(hydrated[0].bookmarked).toBe(false);
        expect(hydrated[1].id).toBeDefined();
        expect(hydrated[1].bookmarked).toBe(false);
    });

    it('combines search and bookmark filters', () => {
        const { result } = renderHook(() => useMessages());

        act(() => {
            result.current.setMessages([
                { role: 'user', content: 'React patterns', id: '1', bookmarked: true },
                { role: 'assistant', content: 'Vue is also great', id: '2', bookmarked: true },
                { role: 'user', content: 'React hooks', id: '3', bookmarked: false },
            ]);
        });

        act(() => {
            result.current.setSearchQuery('react');
            result.current.setShowBookmarksOnly(true);
        });

        // Only msg 1 matches both criteria (bookmarked + contains "react")
        expect(result.current.filteredMessages).toHaveLength(1);
        expect(result.current.filteredMessages[0].id).toBe('1');
    });
});
