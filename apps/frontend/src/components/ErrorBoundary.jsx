import { Component } from 'react';

function ErrorFallback({ error, reset }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        gap: '1rem',
        textAlign: 'center',
        background: '#f8fafc',
      }}
    >
      <h2 style={{ color: '#1e293b', margin: 0 }}>예상치 못한 오류가 발생했어.</h2>
      <p className="muted" style={{ maxWidth: '28rem', margin: 0 }}>
        {error?.message || '잠시 후 다시 시도해봐. 문제가 반복되면 강사에게 문의해줘.'}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button type="button" onClick={reset}>
          다시 시도
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => { window.location.href = '/'; }}
        >
          홈으로 돌아가기
        </button>
      </div>
      {import.meta.env.DEV && error?.stack ? (
        <pre
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#fff7f7',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            fontSize: '0.72rem',
            textAlign: 'left',
            maxWidth: '40rem',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {error.stack}
        </pre>
      ) : null}
    </div>
  );
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  reset() {
    this.setState({ error: null });
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} reset={this.reset} />;
    }
    return this.props.children;
  }
}
