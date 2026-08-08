import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught UI Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', color: '#fff', padding: '20px' }}>
          <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '40px', textAlign: 'center', borderRadius: '16px' }}>
            <span style={{ fontSize: '3rem' }}>⚠️</span>
            <h2 style={{ margin: '15px 0 10px 0' }}>Something went wrong</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button onClick={() => window.location.reload()} className="glow-button" style={{ padding: '10px 20px' }}>
                🔄 Refresh Page
              </button>
              <button onClick={() => { window.location.href = '/'; }} className="glass-panel" style={{ padding: '10px 20px', cursor: 'pointer' }}>
                🏠 Back to Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
