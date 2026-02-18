import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCRO } from './useCRO';

// Mock all AI/analysis dependencies
vi.mock('../utils/ai', () => ({
    streamChatWithAI: vi.fn(),
    PROMPTS: { cro: 'CRO prompt', architect: 'Architect prompt' },
}));
vi.mock('../utils/croAnalyzer', () => ({
    analyzePage: vi.fn(),
    buildAIContext: vi.fn(),
    exportAnalysis: vi.fn(() => ({})),
    generateReportMetadata: vi.fn(() => ({})),
}));
vi.mock('../utils/council', () => ({
    runCouncil: vi.fn(),
}));

describe('useCRO Hook', () => {
    const defaultDeps = {
        apiKey: 'test-key',
        modelTier: 'high',
        councilEnabled: false,
        setMessages: vi.fn(),
        setCouncilResults: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes with null analysis and no loading/error', () => {
        const { result } = renderHook(() => useCRO(defaultDeps));

        expect(result.current.croAnalysis).toBeNull();
        expect(result.current.croLoading).toBe(false);
        expect(result.current.croError).toBe('');
    });

    it('sets error when API key is missing', async () => {
        const deps = { ...defaultDeps, apiKey: '' };
        const { result } = renderHook(() => useCRO(deps));

        await act(async () => {
            await result.current.runCROAnalysis();
        });

        expect(result.current.croError).toContain('No API key');
        expect(deps.setMessages).toHaveBeenCalled();
    });

    it('allows setting croAnalysis externally', () => {
        const { result } = renderHook(() => useCRO(defaultDeps));

        act(() => {
            result.current.setCroAnalysis({ test: 'data' });
        });

        expect(result.current.croAnalysis).toEqual({ test: 'data' });
    });

    it('allows setting croError externally', () => {
        const { result } = renderHook(() => useCRO(defaultDeps));

        act(() => {
            result.current.setCroError('Custom error');
        });

        expect(result.current.croError).toBe('Custom error');
    });

    it('allows setting croLoading externally', () => {
        const { result } = renderHook(() => useCRO(defaultDeps));

        act(() => {
            result.current.setCroLoading(true);
        });

        expect(result.current.croLoading).toBe(true);
    });

    it('exposes runCROAnalysis as a function', () => {
        const { result } = renderHook(() => useCRO(defaultDeps));
        expect(typeof result.current.runCROAnalysis).toBe('function');
    });
});
