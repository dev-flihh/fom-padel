import * as React from 'react';
import type { ErrorInfo, ReactNode } from 'react';

type ErrorReporter = (error: Error, info: ErrorInfo, context: string) => void;

type Props = {
  children: ReactNode;
  /** Identifies which part of the tree failed (e.g. "root", "active-match"). */
  context?: string;
  /** Wired to Sentry (or any monitor) from main.tsx. Never allowed to throw. */
  onError?: ErrorReporter;
  /**
   * Custom fallback. Receives a reset() that clears the error state so a nested
   * boundary can try to re-render without a full page reload. When omitted the
   * default full-screen recovery UI is shown.
   */
  fallback?: (error: Error, reset: () => void) => ReactNode;
};

type State = { error: Error | null };

/**
 * Catches render/lifecycle errors so a single broken component can no longer
 * white-screen the whole app. The active match snapshot is persisted to
 * localStorage, so a reload recovers an in-progress match.
 *
 * NOTE: this project ships without @types/react, so React APIs are untyped at
 * compile time and the generic base class does not resolve its inherited
 * members. We `declare` the members we use (provided by Component at runtime).
 */
export class AppErrorBoundary extends React.Component {
  declare props: Props;
  declare setState: (state: Partial<State>) => void;
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const { context = 'root', onError } = this.props;
    try {
      onError?.(error, info, context);
    } catch {
      // A failure inside the reporter must never mask the original error.
    }
    console.error(`[ErrorBoundary:${context}]`, error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { children, fallback } = this.props;
    const { error } = this.state;
    if (!error) return children;
    if (fallback) return fallback(error, this.reset);
    return <DefaultFallback error={error} />;
  }
}

// Inline styles only: a crash screen must render even if the app's CSS/Tailwind
// bundle is the thing that failed to load.
const DefaultFallback = ({ error }: { error: Error }) => (
  <div
    role="alert"
    style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
      padding: 24,
      textAlign: 'center',
      background: '#F7F7FA',
      color: '#111827',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    }}
  >
    <div
      aria-hidden="true"
      style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: 'rgba(230,94,20,0.12)',
        color: '#E65E14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 32,
        fontWeight: 700,
      }}
    >
      !
    </div>
    <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Ada yang tidak beres</h1>
    <p style={{ margin: 0, maxWidth: 320, fontSize: 15, lineHeight: 1.5, color: '#4B5563' }}>
      Tenang, match kamu tersimpan otomatis. Coba muat ulang untuk melanjutkan dari
      titik terakhir.
    </p>
    <button
      type="button"
      onClick={() => window.location.reload()}
      style={{
        marginTop: 4,
        minWidth: 200,
        height: 48,
        border: 'none',
        borderRadius: 12,
        background: '#E65E14',
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      Muat Ulang
    </button>
    <p style={{ margin: 0, fontSize: 13, color: '#8E8E93' }}>
      Kalau masih bermasalah, tutup lalu buka lagi aplikasinya.
    </p>
    {import.meta.env.DEV && (
      <pre
        style={{
          maxWidth: '90vw',
          maxHeight: 160,
          overflow: 'auto',
          textAlign: 'left',
          fontSize: 11,
          color: '#8E8E93',
          background: '#FFFFFF',
          border: '1px solid #ECECF2',
          borderRadius: 8,
          padding: 12,
        }}
      >
        {error.message}
      </pre>
    )}
  </div>
);
