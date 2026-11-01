import { useState } from 'react';
import type { RefactoringSuggestion } from '../../../types';

export interface RefactoringDiffViewerProps {
  refactorings: RefactoringSuggestion[];
  language?: string;
}

export function RefactoringDiffViewer({ refactorings, language = 'text' }: RefactoringDiffViewerProps) {
  const [activeTab, setActiveTab] = useState<'diff' | 'proposed' | 'original'>('diff');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!refactorings || refactorings.length === 0) {
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

  const renderDiffLine = (line: string, lineIdx: number) => {
    let bg = 'transparent';
    let color = '#e2e8f0';

    if (line.startsWith('+') && !line.startsWith('+++')) {
      bg = 'rgba(16, 185, 129, 0.15)';
      color = '#34d399';
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      bg = 'rgba(239, 68, 68, 0.15)';
      color = '#f87171';
    } else if (line.startsWith('@@')) {
      bg = 'rgba(56, 189, 248, 0.1)';
      color = '#38bdf8';
    }

    return (
      <div
        key={lineIdx}
        style={{
          background: bg,
          color: color,
          padding: '2px 8px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.82rem',
          lineHeight: 1.45,
          whiteSpace: 'pre',
        }}
      >
        {line || ' '}
      </div>
    );
  };

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '1.2rem' }}>⚡</span>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Proposed Refactorings &amp; Diff Comparison
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
          {refactorings.length} {refactorings.length === 1 ? 'Proposal' : 'Proposals'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {refactorings.map((refact, idx) => (
          <div
            key={idx}
            data-testid={`refactoring-proposal-${idx}`}
            style={{
              padding: '18px',
              borderRadius: '8px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {idx + 1}. {refact.title}
                </h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {refact.reason}
                </p>
              </div>
            </div>

            {/* Code View Controls & Tabs */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '16px',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '8px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  data-testid={`tab-diff-btn-${idx}`}
                  onClick={() => setActiveTab('diff')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    background: activeTab === 'diff' ? 'var(--accent-color, #38bdf8)' : 'var(--bg-tertiary)',
                    color: activeTab === 'diff' ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  Unified Diff
                </button>
                <button
                  type="button"
                  data-testid={`tab-proposed-btn-${idx}`}
                  onClick={() => setActiveTab('proposed')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    background: activeTab === 'proposed' ? 'var(--accent-color, #38bdf8)' : 'var(--bg-tertiary)',
                    color: activeTab === 'proposed' ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  Proposed Code {language !== 'text' ? `(${language})` : ''}
                </button>
                <button
                  type="button"
                  data-testid={`tab-original-btn-${idx}`}
                  onClick={() => setActiveTab('original')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    background: activeTab === 'original' ? 'var(--accent-color, #38bdf8)' : 'var(--bg-tertiary)',
                    color: activeTab === 'original' ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  Original Code
                </button>
              </div>

              <button
                type="button"
                data-testid={`copy-refactored-btn-${idx}`}
                onClick={() => handleCopyCode(refact.refactored_code, idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copiedIndex === idx ? '#10b981' : 'var(--accent-color, #38bdf8)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>{copiedIndex === idx ? '✓' : '📋'}</span>
                <span>{copiedIndex === idx ? 'Copied!' : 'Copy Proposed Code'}</span>
              </button>
            </div>

            {/* Code Content Area */}
            <div
              style={{
                marginTop: '12px',
                borderRadius: '6px',
                background: '#090d16',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
              }}
            >
              {activeTab === 'diff' ? (
                <div data-testid={`diff-container-${idx}`} style={{ padding: '8px 0', overflowX: 'auto', maxHeight: '450px' }}>
                  {(refact.diff || '').split(/\r?\n/).map((line, lIdx) => renderDiffLine(line, lIdx))}
                </div>
              ) : activeTab === 'proposed' ? (
                <pre
                  data-testid={`proposed-code-pre-${idx}`}
                  style={{
                    margin: 0,
                    padding: '12px 14px',
                    color: '#f8fafc',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.84rem',
                    lineHeight: 1.45,
                    overflowX: 'auto',
                    whiteSpace: 'pre',
                    maxHeight: '450px',
                  }}
                >
                  <code>{refact.refactored_code}</code>
                </pre>
              ) : (
                <pre
                  data-testid={`original-code-pre-${idx}`}
                  style={{
                    margin: 0,
                    padding: '12px 14px',
                    color: '#94a3b8',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.84rem',
                    lineHeight: 1.45,
                    overflowX: 'auto',
                    whiteSpace: 'pre',
                    maxHeight: '450px',
                  }}
                >
                  <code>{refact.original_code}</code>
                </pre>
              )}
            </div>

            {/* Benefits & Risks Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '16px', marginTop: '16px' }}>
              {/* Expected Benefits */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#10b981', textTransform: 'uppercase', marginBottom: '6px' }}>
                  ✨ Expected Benefits:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {refact.benefits.map((b, bIdx) => (
                    <li key={bIdx} style={{ marginBottom: '2px' }}>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Behavior-Change Risks */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '6px' }}>
                  ⚠️ Potential Risks &amp; Caveats:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {refact.risks.map((r, rIdx) => (
                    <li key={rIdx} style={{ marginBottom: '2px' }}>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Verification Checklist */}
            {refact.verification_steps && refact.verification_steps.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Verification Steps:
                </span>
                <ol style={{ margin: '6px 0 0', paddingLeft: '20px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  {refact.verification_steps.map((step, sIdx) => (
                    <li key={sIdx} style={{ marginBottom: '3px' }}>
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
