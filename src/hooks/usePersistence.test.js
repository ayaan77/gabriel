import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePersistence } from './usePersistence';

// Mock chrome.storage.local
const mockStorage = {};
global.chrome = {
    storage: {
        local: {
            get: vi.fn((keys, cb) => {
                const result = {};
                keys.forEach(k => { if (mockStorage[k] !== undefined) result[k] = mockStorage[k]; });
                cb(result);
            }),
            set: vi.fn((obj) => { Object.assign(mockStorage, obj); }),
        }
    }
};

vi.mock('../config', () => ({
    DEFAULT_API_KEY: 'test-default-key'
}));

describe('usePersistence Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    });

    it('initializes with default values when storage is empty', () => {
        const { result } = renderHook(() => usePersistence());

        expect(result.current.apiKey).toBe('test-default-key');
        expect(result.current.theme).toBe('dark');
        expect(result.current.modelTier).toBe('high');
        expect(result.current.councilEnabled).toBe(false);
    });

    it('loads values from chrome.storage on mount', () => {
        mockStorage.groqApiKey = 'stored-key';
        mockStorage.theme = 'light';
        mockStorage.gabrielModelTier = 'efficient';
        mockStorage.councilEnabled = true;

        const { result } = renderHook(() => usePersistence());

        expect(result.current.apiKey).toBe('stored-key');
        expect(result.current.theme).toBe('light');
        expect(result.current.modelTier).toBe('efficient');
        expect(result.current.councilEnabled).toBe(true);
    });

    it('updates theme and persists to storage', () => {
        const { result } = renderHook(() => usePersistence());

        act(() => result.current.setTheme('light'));
        expect(result.current.theme).toBe('light');
        expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    it('updates modelTier', () => {
        const { result } = renderHook(() => usePersistence());

        act(() => result.current.setModelTier('efficient'));
        expect(result.current.modelTier).toBe('efficient');
    });

    it('toggles councilEnabled', () => {
        const { result } = renderHook(() => usePersistence());

        act(() => result.current.setCouncilEnabled(true));
        expect(result.current.councilEnabled).toBe(true);

        act(() => result.current.setCouncilEnabled(false));
        expect(result.current.councilEnabled).toBe(false);
    });

    it('updates API key', () => {
        const { result } = renderHook(() => usePersistence());

        act(() => result.current.setApiKey('new-key-123'));
        expect(result.current.apiKey).toBe('new-key-123');
    });

    it('applies theme to document element', () => {
        const { result } = renderHook(() => usePersistence());

        act(() => result.current.setTheme('light'));
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');

        act(() => result.current.setTheme('dark'));
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
});
