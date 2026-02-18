import { Icons } from './Icons';

export function HomeView({ startMode, runCROAnalysis }) {
    return (
        <div className="home-view">
            <div className="hero-icon">
                <Icons.Wand />
            </div>
            <h1 className="hero-title">Gabriel AI</h1>
            <p className="hero-description">
                Your intelligent architectural companion. Roast stacks, design systems, or prepare for brutal interviews.
            </p>

            <div className="cards-grid">
                <button className="quick-card" onClick={() => startMode('architect', 'I want to build a new project')}>
                    <span className="card-emoji">🏗️</span>
                    <span className="card-text">Design System</span>
                </button>
                <button className="quick-card" onClick={() => startMode('roast', 'Roast my tech stack')}>
                    <span className="card-emoji">🔥</span>
                    <span className="card-text">Roast My Stack</span>
                </button>
                <button className="quick-card" onClick={() => startMode('cto', 'I am ready for a brutal interview')}>
                    <span className="card-emoji">🤬</span>
                    <span className="card-text">Brutal Interview</span>
                </button>
                <button className="quick-card" onClick={() => startMode('compare', 'I need to compare two technologies')}>
                    <span className="card-emoji">⚖️</span>
                    <span className="card-text">Compare Tech</span>
                </button>
                <button className="quick-card" onClick={() => startMode('diagram', 'I want to generate a diagram')}>
                    <span className="card-emoji">📊</span>
                    <span className="card-text">Generate Diagram</span>
                </button>
                <button className="quick-card" onClick={() => startMode('analyze', 'I want to analyze a GitHub repository')}>
                    <span className="card-emoji">🔍</span>
                    <span className="card-text">Analyze Repo</span>
                </button>
                <button className="quick-card" onClick={() => startMode('intelligence', 'I want to analyze a competitor website')}>
                    <span className="card-emoji">🕵️</span>
                    <span className="card-text">Site Intel</span>
                </button>
                <button className="quick-card" onClick={() => { startMode('cro'); runCROAnalysis(); }}>
                    <span className="card-emoji">🎯</span>
                    <span className="card-text">CRO Audit</span>
                </button>
                <button className="quick-card" onClick={() => startMode('architect', "I have an idea but I don't know where to start")}>
                    <span className="card-emoji">💡</span>
                    <span className="card-text">I Have an Idea</span>
                </button>
            </div>
        </div>
    );
}
