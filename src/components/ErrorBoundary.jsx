import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', gap: '16px', padding: '40px', background: 'var(--bg-0)',
        color: 'var(--text-0)', textAlign: 'center',
      }}>
        <div style={{ fontSize: '40px' }}>⚠️</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Une erreur inattendue s'est produite</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', maxWidth: '500px', lineHeight: 1.6, margin: 0 }}>
          {this.state.error?.message || 'Erreur inconnue'}
        </p>
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          style={{
            padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 600,
          }}
        >
          Réessayer
        </button>
      </div>
    );
  }
}
