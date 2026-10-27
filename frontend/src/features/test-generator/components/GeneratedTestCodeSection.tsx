import { useState, useCallback } from 'react';

export interface GeneratedTestCodeSectionProps {
  testCode: string;
  language: string;
  framework: string;
}

export function GeneratedTestCodeSection({
  testCode,
  language,
  framework,
}: GeneratedTestCodeSectionProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(testCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback for environments where clipboard API might be restricted
      const textarea = document.createElement('textarea');
      textarea.value = testCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  }, [testCode]);

  const lineCount = testCode ? testCode.split('\n').length : 0;

  return (
    <div className="card" style={{ marginTop: '16px' }}>
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <h3 className="card-title">
          <span className="card-icon">💻</span>
          Generated Test Code
          <span
            style={{
              marginLeft: '8px',
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              textTransform: 'uppercase',
            }}
          >
            {framework} • {language}
          </span>
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
            {lineCount} lines
          </span>

          <button
            type="button"
            id="copy-generated-tests-btn"
            className="endpoint-action-btn"
            onClick={handleCopy}
            style={{
              padding: '5px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.15)',
              borderColor: copied ? '#10b981' : 'rgba(99, 102, 241, 0.35)',
              color: copied ? '#34d399' : '#a5b4fc',
              transition: 'all 0.2s ease',
            }}
            title="Copy test code to clipboard"
          >
            <span>{copied ? '✓' : '📋'}</span>
            <span>{copied ? 'Copied!' : 'Copy Generated Tests'}</span>
          </button>
        </div>
      </div>

      {/* Code Viewer */}
      <div
        className="editor-wrapper"
        style={{
          background: 'rgba(15, 23, 42, 0.85)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          overflow: 'auto',
          maxHeight: '440px',
        }}
      >
        <pre
          style={{
            margin: 0,
            padding: '16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            color: '#f8fafc',
            whiteSpace: 'pre',
          }}
        >
          <code>{testCode}</code>
        </pre>
      </div>

      {/* Static Execution Disclaimer */}
      <div
        style={{
          marginTop: '12px',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          fontSize: '0.76rem',
          color: '#fbbf24',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span>🛡️</span>
        <span>
          <strong>Sandboxing Note:</strong> Generated tests are static text for human review. They have not been executed or evaluated by a test runner in this environment.
        </span>
      </div>
    </div>
  );
}

export default GeneratedTestCodeSection;
