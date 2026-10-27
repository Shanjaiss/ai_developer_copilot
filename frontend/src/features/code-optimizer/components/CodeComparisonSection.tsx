import { useState } from 'react';

export interface CodeComparisonSectionProps {
  originalCode: string;
  optimizedCode: string;
  language: string;
  isUnchanged?: boolean;
}

export function CodeComparisonSection({
  originalCode,
  optimizedCode,
  language,
  isUnchanged = false,
}: CodeComparisonSectionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!optimizedCode) return;
    try {
      await navigator.clipboard.writeText(optimizedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Original Code Box */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(30, 41, 59, 0.6)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              color: '#94a3b8',
              fontWeight: 600,
            }}
          >
            <span>📄 Original Code</span>
            <span style={{ fontFamily: 'var(--font-mono)', textTransform: 'lowercase' }}>
              {language}
            </span>
          </div>
          <pre
            style={{
              margin: 0,
              padding: '14px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.84rem',
              color: '#cbd5e1',
              lineHeight: 1.5,
              overflowX: 'auto',
              maxHeight: '320px',
              background: 'transparent',
            }}
          >
            <code>{originalCode}</code>
          </pre>
        </div>

        {/* Optimized Code Box */}
        <div
          style={{
            background: isUnchanged ? 'rgba(15, 23, 42, 0.7)' : 'rgba(16, 185, 129, 0.04)',
            border: isUnchanged
              ? '1px solid var(--border-subtle)'
              : '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '8px 14px',
              background: isUnchanged ? 'rgba(30, 41, 59, 0.6)' : 'rgba(16, 185, 129, 0.12)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: isUnchanged ? '#94a3b8' : '#34d399', fontWeight: 600 }}>
                {isUnchanged ? '⚡ Evaluated Code' : '✨ Optimized Code'}
              </span>
              {isUnchanged && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(148, 163, 184, 0.15)',
                    color: '#94a3b8',
                  }}
                >
                  Unchanged
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="endpoint-action-btn"
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              aria-label="Copy Optimized Code"
            >
              <span>{copied ? '✓' : '📋'}</span>
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
          <pre
            id="optimized-code-display"
            style={{
              margin: 0,
              padding: '14px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.84rem',
              color: isUnchanged ? '#cbd5e1' : '#f8fafc',
              lineHeight: 1.5,
              overflowX: 'auto',
              maxHeight: '320px',
              background: 'transparent',
            }}
          >
            <code>{optimizedCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

export default CodeComparisonSection;
