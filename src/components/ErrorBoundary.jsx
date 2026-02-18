import React from 'react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('🔴 Gabriel Error Boundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '40px 24px',
                    textAlign: 'center',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    background: '#09090b',
                    color: '#fafafa',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px'
                }}>
                    <div style={{ fontSize: '48px' }}>⚠️</div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Something went wrong</h2>
                    <p style={{ fontSize: '13px', color: '#a1a1aa', maxWidth: '280px', lineHeight: 1.6 }}>
                        Gabriel ran into an unexpected error. This won't affect your saved data.
                    </p>
                    <p style={{ fontSize: '11px', color: '#71717a', fontFamily: 'monospace', maxWidth: '300px', wordBreak: 'break-all' }}>
                        {this.state.error?.message || 'Unknown error'}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{
                            padding: '8px 20px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: '#fff',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            marginTop: '8px'
                        }}
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
