import { useState } from 'react';
import type { GroundedReference } from '../../../types/repository';

export interface RepositoryGroundedReferencesProps {
  references: GroundedReference[];
}

export function RepositoryGroundedReferences({
  references,
}: RepositoryGroundedReferencesProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  if (!references || references.length === 0) return null;

  return (
    <div
      style={{
        marginTop: '16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        paddingTop: '14px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: 600,
          color: '#a5b4fc',
          marginBottom: '10px',
        }}
      >
        <span>📑</span> Grounded Source References ({references.length})
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {references.map((ref, idx) => {
          const isExpanded = expandedIndex === idx;

          return (
            <div
              key={`${ref.path}-${ref.start_line}-${idx}`}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandedIndex(isExpanded ? null : idx);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  background: isExpanded
                    ? 'rgba(99, 102, 241, 0.1)'
                    : 'transparent',
                }}
                aria-label={`Toggle reference: ${ref.path} lines ${ref.start_line} to ${ref.end_line}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#38bdf8', fontWeight: 600 }}>
                    {ref.path}
                  </span>
                  <span
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#7dd3fc',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                    }}
                  >
                    Lines {ref.start_line}–{ref.end_line}
                  </span>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    • {ref.reason}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>

              {isExpanded && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    background: '#090d16',
                    overflowX: 'auto',
                  }}
                >
                  <pre
                    style={{
                      margin: 0,
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      lineHeight: 1.5,
                      color: '#e2e8f0',
                      whiteSpace: 'pre',
                    }}
                  >
                    {ref.snippet}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

