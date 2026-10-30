import { useState } from 'react';
import type { GroundedReference, StackFrame } from '../../../types';

export interface DebuggingEvidenceViewerProps {
  references: GroundedReference[];
  parsedFrames: StackFrame[];
}

export function DebuggingEvidenceViewer({ references, parsedFrames }: DebuggingEvidenceViewerProps) {
  const [showFrames, setShowFrames] = useState<boolean>(true);

  if ((!references || references.length === 0) && (!parsedFrames || parsedFrames.length === 0)) {
    return null;
  }

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '1.2rem' }}>📑</span>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Evidence &amp; Code Grounding
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
          {references.length} Grounded {references.length === 1 ? 'Reference' : 'References'}
        </span>
      </div>

      {/* Grounded Source References */}
      {references.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
          {references.map((ref, idx) => (
            <div
              key={idx}
              data-testid={`grounded-reference-${idx}`}
              style={{
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 14px',
                  background: 'var(--bg-tertiary)',
                  borderBottom: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem' }}>📄</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {ref.path}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Lines {ref.start_line}–{ref.end_line}
                  </span>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {ref.reason}
                </span>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: '12px 14px',
                  background: '#090d16',
                  color: '#e2e8f0',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                  lineHeight: 1.45,
                  overflowX: 'auto',
                  whiteSpace: 'pre',
                }}
              >
                <code>{ref.snippet}</code>
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* Parsed Stack Frames Breakdown */}
      {parsedFrames.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowFrames(!showFrames)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              padding: '4px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{showFrames ? '▼' : '▶'}</span>
            <span>Parsed Stack Frames ({parsedFrames.length})</span>
          </button>

          {showFrames && (
            <div
              style={{
                marginTop: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>#</th>
                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>File Path</th>
                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Line:Col</th>
                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Function / Scope</th>
                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Origin</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedFrames.map((frame, fIdx) => (
                    <tr
                      key={fIdx}
                      style={{
                        borderBottom: fIdx === parsedFrames.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                        background: fIdx % 2 === 0 ? 'var(--bg-secondary)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {fIdx + 1}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {frame.file_path || 'unknown'}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {frame.line_number ?? '-'}{frame.column_number ? `:${frame.column_number}` : ''}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {frame.function_name || 'anonymous'}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {frame.is_in_repository ? (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              fontWeight: 600,
                            }}
                          >
                            Repository File
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            External / Library
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

