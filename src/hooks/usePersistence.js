/* global chrome */
import { useState, useEffect } from 'react';
import { DEFAULT_API_KEY } from '../config';

/**
 * usePersistence — handles loading and saving application settings
 * to chrome.storage.local, and applies the active theme to the DOM.
 *
 * Loads on mount: apiKey, theme, modelTier, councilEnabled, and
 * passes back setters so other hooks can trigger persistence.
 *
 * @returns {{ apiKey, setApiKey, theme, setTheme, modelTier, setModelTier, councilEnabled, setCouncilEnabled }}
 */
export function usePersistence() {
    const [apiKey, setApiKey] = useState('');
    const [theme, setTheme] = useState('dark');
    const [modelTier, setModelTier] = useState('high');
    const [councilEnabled, setCouncilEnabled] = useState(false);

    // Load from chrome.storage on mount
    useEffect(() => {
        try {
            if (chrome?.storage?.local) {
                chrome.storage.local.get(
                    ['groqApiKey', 'theme', 'gabrielModelTier', 'councilEnabled'],
                    (r) => {
                        setApiKey(r?.groqApiKey || DEFAULT_API_KEY);
                        if (r?.theme) setTheme(r.theme);
                        if (r?.gabrielModelTier) setModelTier(r.gabrielModelTier);
                        if (r?.councilEnabled !== undefined) setCouncilEnabled(r.councilEnabled);
                    }
                );
            } else {
                setApiKey(DEFAULT_API_KEY);
            }
        } catch {
            setApiKey(DEFAULT_API_KEY);
        }
    }, []);

    // Persist settings whenever they change
    useEffect(() => {
        if (chrome?.storage?.local) {
            chrome.storage.local.set({ theme, gabrielModelTier: modelTier, councilEnabled });
        }
    }, [theme, modelTier, councilEnabled]);

    // Apply theme to DOM
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return { apiKey, setApiKey, theme, setTheme, modelTier, setModelTier, councilEnabled, setCouncilEnabled };
}
