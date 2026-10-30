import { useState } from 'react';
import type { SuggestedFix } from '../../../types';

export interface SuggestedFixCardProps {
  fixes: SuggestedFix[];
  language?: string;
}

export function SuggestedFixCard({ fixes, language = 'code' }: SuggestedFixCardProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!fixes || fixes.length === 0) {
    return null;
  }

  const handleCopyCode = async (code: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '1.2rem' }}>💡</span>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Suggested Fixes &amp; Verification
        </h3>
        <span
          style={{
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: '12px',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-muted)',
            marginLeft: 'auto',
          }}
        >
          {fixes.length} {fixes.length === 1 ? 'Actionable Fix' : 'Actionable Fixes'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {fixes.map((fix, idx) => (
          <div
            key={idx}
            data-testid={`suggested-fix-item-${idx}`}
            style={{
              padding: '18px',
              borderRadius: '8px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <h4 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {idx + 1}. {fix.title}
            </h4>
            <p style={{ margin: '0 0 14px', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {fix.explanation}
            </p>

            {/* Code Example */}
            {fix.code_example && (
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-tertiary, #1e293b)',
                    padding: '6px 12px',
                    borderTopLeftRadius: '6px',
                    borderTopRightRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    borderBottom: 'none',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {language}
                  </span>
                  <button
                    type="button"
                    data-testid={`copy-fix-btn-${idx}`}
                    onClick={() => handleCopyCode(fix.code_example || '', idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copiedIndex === idx ? '#10b981' : 'var(--accent-color, #38bdf8)',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{copiedIndex === idx ? '✓' : '📋'}</span>
                    <span>{copiedIndex === idx ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: '12px',
                    background: '#090d16',
                    color: '#f8fafc',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.84rem',
                    borderBottomLeftRadius: '6px',
                    borderBottomRightRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    overflowX: 'auto',
                    whiteSpace: 'pre',
                  }}
                >
                  <code>{fix.code_example}</code>
                </pre>
              </div>
            )}

            {/* Verification Checklist */}
            {fix.verification_steps && fix.verification_steps.length > 0 && (
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Verification Steps:
                </span>
                <ol style={{ margin: '6px 0 0', paddingLeft: '20px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  {fix.verification_steps.map((step, stepIdx) => (
                    <li key={stepIdx} style={{ marginBottom: '4px' }}>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

