'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ padding: 40, fontFamily: 'monospace', background: '#111', color: '#f55' }}>
        <h2>Application Error</h2>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#ff9' }}>{error.message}</pre>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#888', fontSize: 12 }}>{error.stack}</pre>
        <button onClick={reset} style={{ marginTop: 20, padding: '8px 16px' }}>
          Try again
        </button>
      </body>
    </html>
  );
}
