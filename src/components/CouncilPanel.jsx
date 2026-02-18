import { useState } from 'react';
import { MessageContent } from './MessageContent';

export function CouncilPanel({ results, onClose }) {
    const [activeTab, setActiveTab] = useState(0);
    const [showStage, setShowStage] = useState('stage1');

    if (!results) return null;

    const { stage1, stage2, stage3, metadata } = results;

    return (
        <div className="council-panel">
            <div className="council-header">
                <span>🏛️ Council Deliberation</span>
                <button className="council-close" onClick={onClose}>✕</button>
            </div>

            <div className="council-tabs">
                <button
                    className={`council-tab ${showStage === 'stage1' ? 'active' : ''}`}
                    onClick={() => setShowStage('stage1')}
                >
                    💬 Opinions ({stage1.length})
                </button>
                <button
                    className={`council-tab ${showStage === 'stage2' ? 'active' : ''}`}
                    onClick={() => setShowStage('stage2')}
                >
                    ⚖️ Rankings
                </button>
                <button
                    className={`council-tab ${showStage === 'stage3' ? 'active' : ''}`}
                    onClick={() => setShowStage('stage3')}
                >
                    👑 Synthesis
                </button>
            </div>

            {showStage === 'stage1' && (
                <div className="council-stage">
                    <div className="council-model-tabs">
                        {stage1.map((r, i) => (
                            <button
                                key={i}
                                className={`council-model-tab ${activeTab === i ? 'active' : ''}`}
                                onClick={() => setActiveTab(i)}
                            >
                                {r.model.split('/').pop()}
                            </button>
                        ))}
                    </div>
                    <div className="council-content">
                        <MessageContent text={stage1[activeTab]?.content || 'No response'} />
                    </div>
                </div>
            )}

            {showStage === 'stage2' && (
                <div className="council-stage">
                    {metadata?.aggregateRankings?.length > 0 && (
                        <div className="council-rankings">
                            <div className="rankings-title">🏆 Aggregate Rankings</div>
                            {metadata.aggregateRankings.map((r, i) => (
                                <div key={i} className="ranking-row">
                                    <span className="ranking-pos">#{i + 1}</span>
                                    <span className="ranking-model">{r.model.split('/').pop()}</span>
                                    <span className="ranking-score">avg: {r.avgRank}</span>
                                    <span className="ranking-votes">{r.voteCount} votes</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="council-model-tabs">
                        {stage2.map((r, i) => (
                            <button
                                key={i}
                                className={`council-model-tab ${activeTab === i ? 'active' : ''}`}
                                onClick={() => setActiveTab(i)}
                            >
                                {r.model.split('/').pop()}
                            </button>
                        ))}
                    </div>
                    <div className="council-content">
                        <MessageContent text={stage2[activeTab]?.evaluation || 'No evaluation'} />
                        {stage2[activeTab]?.parsedRanking?.length > 0 && (
                            <div className="parsed-ranking">
                                <strong>Extracted Ranking:</strong> {stage2[activeTab].parsedRanking.join(' → ')}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showStage === 'stage3' && (
                <div className="council-stage council-synthesis">
                    <div className="synthesis-label">👑 Chairman: {stage3.model?.split('/').pop()}</div>
                    <div className="council-content">
                        <MessageContent text={stage3.content || 'No synthesis'} />
                    </div>
                </div>
            )}
        </div>
    );
}
