import { Icons } from './Icons';

export function SettingsModal({ showSettings, setShowSettings, theme, setTheme, apiKey, setApiKey, setError, clearHistory }) {
    const saveApiKey = () => {
        if (!apiKey.startsWith('gsk_')) return setError('Invalid key');
        try { chrome?.storage?.local?.set({ groqApiKey: apiKey }); } catch { }
        setShowSettings(false); setError('');
    };

    if (!showSettings) return null;

    return (
        <div className="settings-overlay" onClick={(e) => {
            if (e.target.className === 'settings-overlay') setShowSettings(false);
        }}>
            <div className="settings-panel">
                <h3 className="settings-title">Preferences</h3>

                <div className="setting-item">
                    <span className="setting-label">Theme</span>
                    <button className="header-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                        {theme === 'dark' ? <Icons.Moon /> : <Icons.Sun />}
                    </button>
                </div>

                <div style={{ marginTop: 16 }}>
                    <span className="setting-label">Groq API Key</span>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        className="input-field"
                        style={{ background: 'var(--bg-card)', borderRadius: 8, marginTop: 8, border: '1px solid var(--border-color)' }}
                        placeholder="gsk_..."
                    />
                </div>

                <div className="settings-actions">
                    <button className="btn btn-ghost" onClick={() => setShowSettings(false)}>Cancel</button>
                    <button className="btn btn-next" onClick={saveApiKey}>Save</button>
                </div>

                <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                    <button className="btn-outline-danger" style={{ width: '100%', justifyContent: 'center' }} onClick={clearHistory}>
                        <Icons.Trash /> Clear Conversation
                    </button>
                </div>
            </div>
        </div>
    );
}
