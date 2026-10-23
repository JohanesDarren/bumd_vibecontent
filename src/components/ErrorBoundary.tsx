import React from 'react';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/**
 * Last line of defence: a render error in one view must never blank the entire
 * app. Without this, any `.map()` on an unexpected API shape leaves the user
 * staring at a white page with no way back.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ui] render error caught by boundary:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          maxWidth: 560,
          margin: '80px auto',
          padding: '28px 26px',
          borderRadius: 14,
          border: '1px solid rgba(239,68,68,0.35)',
          background: '#fff',
          fontFamily: 'inherit'
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 800, color: '#111827' }}>
          Halaman gagal ditampilkan
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: '0.86rem', color: '#4b5563', lineHeight: 1.6 }}>
          Terjadi kesalahan saat merender halaman ini. Data Anda aman. Muat ulang untuk
          melanjutkan; kalau masalah berulang, laporkan pesan di bawah.
        </p>
        <pre
          style={{
            margin: '0 0 18px',
            padding: '10px 12px',
            borderRadius: 9,
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            fontSize: '0.72rem',
            color: '#6b7280',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 140,
            overflow: 'auto'
          }}
        >
          {this.state.error.message}
        </pre>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '9px 16px',
              borderRadius: 9,
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Muat ulang
          </button>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '9px 16px',
              borderRadius: 9,
              border: '1px solid #e5e7eb',
              background: '#fff',
              color: '#374151',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }
}
