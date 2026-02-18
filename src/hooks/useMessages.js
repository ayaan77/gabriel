import { useState, useCallback } from 'react';

/**
 * useMessages — manages the conversation message list, search, and bookmarks.
 *
 * Owns:
 * - `messages` array with hydrated IDs and bookmarked flags
 * - Search query filtering
 * - Bookmark-only filtering
 * - `toggleBookmark` action
 *
 * @returns {{ messages, setMessages, filteredMessages, searchQuery, setSearchQuery,
 *             showBookmarksOnly, setShowBookmarksOnly, toggleBookmark }}
 */
export function useMessages() {
    const [messages, setMessages] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

    /**
     * Ensures all messages have a unique ID and a bookmarked flag.
     * @param {Array} msgs - Raw message array (e.g. from storage)
     * @returns {Array} Hydrated messages
     */
    const hydrateMessages = useCallback((msgs) => {
        return msgs.map((m, i) => ({
            ...m,
            id: m.id || Date.now() + '-' + i,
            bookmarked: m.bookmarked || false,
        }));
    }, []);

    /**
     * Toggles the bookmarked state of a message by ID.
     * @param {string} id - Message ID
     */
    const toggleBookmark = useCallback((id) => {
        setMessages(prev =>
            prev.map(m => m.id === id ? { ...m, bookmarked: !m.bookmarked } : m)
        );
    }, []);

    // Derived: filtered view of messages based on search and bookmark filter
    const filteredMessages = messages.filter(m => {
        if (showBookmarksOnly && !m.bookmarked) return false;
        if (searchQuery && !m.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return {
        messages,
        setMessages,
        hydrateMessages,
        filteredMessages,
        searchQuery,
        setSearchQuery,
        showBookmarksOnly,
        setShowBookmarksOnly,
        toggleBookmark,
    };
}
