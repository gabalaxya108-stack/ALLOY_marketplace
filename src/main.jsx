import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './admin.css';
import './trustOrbit.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CreaSync Caught Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#FAF8F5',
          color: '#1A1918',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '640px',
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid rgba(0,0,0,0.08)',
            padding: '36px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '12px', fontWeight: 600 }}>Alloy Encountered an Error</h2>
            <p style={{ color: '#555', marginBottom: '20px', lineHeight: 1.5 }}>
              {this.state.error?.message || 'An unexpected error occurred while rendering.'}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  localStorage.removeItem('creasync_marketplace_state_v1');
                  window.location.reload();
                }}
                style={{
                  background: '#1A1918',
                  color: '#FAF8F5',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '999px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Reset State & Reload
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: '#F3EFEA',
                  color: '#1A1918',
                  border: '1px solid rgba(0,0,0,0.1)',
                  padding: '10px 20px',
                  borderRadius: '999px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Reload Page
              </button>
            </div>
            {this.state.errorInfo && (
              <pre style={{
                marginTop: '24px',
                padding: '16px',
                background: '#F9F8F6',
                borderRadius: '8px',
                overflowX: 'auto',
                fontSize: '12px',
                color: '#666'
              }}>
                {this.state.error?.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

