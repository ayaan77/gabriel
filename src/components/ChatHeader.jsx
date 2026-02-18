import { Icons } from './Icons';
import { MODEL_TIERS } from '../config';
import { isCouncilAvailable } from '../utils/council';

/**
 * ChatHeader — top navigation bar, model tier selector, and council toggle.
 *
 * @param {object} props
 * @param {string} props.mode - Current AI mode (architect, analyze, etc.)
 * @param {number} props.messageCount - Number of messages in the conversation
 * @param {boolean} props.hasSpec - Whether a spec has been generated
 * @param {string} props.modelTier - Active model tier ID
 * @param {Function} props.setModelTier - Setter for model tier
 * @param {boolean} props.councilEnabled - Whether council mode is active
 * @param {Function} props.setCouncilEnabled - Setter for council mode
 * @param {boolean} props.showSearch - Whether search bar is visible
 * @param {Function} props.setShowSearch - Setter for search visibility
 * @param {Function} props.setSearchQuery - Setter for search query
 * @param {boolean} props.showBookmarksOnly - Whether bookmarks filter is active
 * @param {Function} props.setShowBookmarksOnly - Setter for bookmarks filter
 * @param {Function} props.setShowSettings - Opens the settings modal
 * @param {Function} props.startNew - Resets the conversation
 * @param {Function} props.openSidePanel - Opens the extension as a side panel
 * @param {Function} props.downloadMD - Downloads conversation as Markdown
 */
export function ChatHeader({
    mode,
    messageCount,
    hasSpec,
    modelTier,
    setModelTier,
    councilEnabled,
    setCouncilEnabled,
    showSearch,
    setShowSearch,
    setSearchQuery,
    showBookmarksOnly,
    setShowBookmarksOnly,
    setShowSettings,
    startNew,
    openSidePanel,
    downloadMD,
}) {
    const MODE_LABELS = {
        architect: 'Architect',
        cto: 'Brutal CTO',
        roast: 'Roast',
        compare: '⚖️ Compare',
        diagram: '📊 Diagram',
        analyze: '🔍 Analyze',
        intelligence: '🕵️ Intelligence',
        page: 'Page Analysis',
        cro: '🎯 CRO Audit',
    };

    return (
        <>
            {/* Glass Header */}
            <header className="header">
                <div className="header-left">
                    <div className="header-logo">
                        <Icons.Wand />
                    </div>
                    <div>
                        <div className="header-title">Gabriel</div>
                        <div className="header-subtitle">
                            <span className="status-dot"></span>
                            {messageCount > 0 ? MODE_LABELS[mode] : 'Online'}
                        </div>
                    </div>
                </div>

                <div className="header-actions">
                    {messageCount > 0 && (
                        <>
                            <button
                                className={`header-btn ${showBookmarksOnly ? 'active' : ''}`}
                                onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
                                title="Bookmarks"
                            >
                                <Icons.Star filled={showBookmarksOnly} />
                            </button>
                            <button
                                className={`header-btn ${showSearch ? 'active' : ''}`}
                                onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
                                title="Search"
                            >
                                <Icons.Search />
                            </button>
                        </>
                    )}

                    <button className="header-btn" onClick={openSidePanel} title="Side Panel">
                        <Icons.Layout />
                    </button>

                    {(hasSpec || messageCount > 2) && (
                        <button className="header-btn" onClick={downloadMD} title="Export">
                            <Icons.Download />
                        </button>
                    )}

                    <button className="header-btn" onClick={startNew} title="New Chat">
                        <Icons.Refresh />
                    </button>

                    <button className="header-btn" onClick={() => setShowSettings(true)} title="Settings">
                        <Icons.Settings />
                    </button>
                </div>
            </header>

            {/* Model Tier Selector */}
            <div className="model-tier-bar">
                <div className="model-tier-selector">
                    {Object.values(MODEL_TIERS).map(tier => (
                        <button
                            key={tier.id}
                            className={`tier-btn ${modelTier === tier.id ? 'active' : ''}`}
                            onClick={() => setModelTier(tier.id)}
                            title={tier.description}
                        >
                            <span className="tier-emoji">{tier.emoji}</span>
                            <span className="tier-label">{tier.shortName}</span>
                        </button>
                    ))}
                </div>
                <span className="model-indicator">{MODEL_TIERS[modelTier]?.description}</span>
            </div>

            {/* Council Toggle */}
            {isCouncilAvailable(mode) && (
                <div className="council-toggle-bar">
                    <button
                        className={`council-toggle-btn ${councilEnabled ? 'active' : ''}`}
                        onClick={() => setCouncilEnabled(!councilEnabled)}
                        title={councilEnabled ? 'Council Mode ON — querying all models' : 'Council Mode OFF — single model'}
                    >
                        <span>🏛️</span>
                        <span>{councilEnabled ? 'Council ON' : 'Council OFF'}</span>
                    </button>
                    {councilEnabled && (
                        <span className="council-hint">3 models will debate &amp; synthesize</span>
                    )}
                </div>
            )}
        </>
    );
}
