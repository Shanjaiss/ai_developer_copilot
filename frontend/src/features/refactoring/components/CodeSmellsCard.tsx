import type { CodeSmell } from '../../../types';

export interface CodeSmellsCardProps {
  smells: CodeSmell[];
}

function getSmellSeverityBadge(severity: 'low' | 'medium' | 'high') {
  switch (severity) {
    case 'high':
      return {
        label: 'High Severity',
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.3)',
        color: '#ef4444',
      };
    case 'medium':
      return {
        label: 'Medium Severity',
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.3)',
        color: '#f59e0b',
      };
    case 'low':
    default:
      return {
        label: 'Low Severity',
        bg: 'rgba(56, 189, 248, 0.15)',
        border: 'rgba(56, 189, 248, 0.3)',
        color: '#38bdf8',
      };
  }
}

export function CodeSmellsCard({ smells }: CodeSmellsCardProps) {
  if (!smells || smells.length === 0) {
    return (
      <div className="card" style={{ padding: '20px 24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>✨</span>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            No Major Code Smells Detected
          </h3>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Static analysis did not identify long functions, excessive nesting, or complex conditionals in this code snippet.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '1.2rem' }}>👃</span>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Detected Code Smells &amp; Anti-Patterns
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
          {smells.length} {smells.length === 1 ? 'Smell' : 'Smells'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {smells.map((smell, idx) => {
          const badge = getSmellSeverityBadge(smell.severity);
          return (
            <div
              key={idx}
              data-testid={`code-smell-item-${idx}`}
              style={{
                padding: '16px',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {smell.title}
                  </h4>
                  {smell.line && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      Line {smell.line}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: badge.bg,
                    border: `1px solid ${badge.border}`,
                    color: badge.color,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {badge.label}
                </span>
              </div>

              <p style={{ margin: '0 0 8px', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {smell.description}
              </p>

              {smell.evidence && smell.evidence.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {smell.evidence.map((ev, evIdx) => (
                      <li key={evIdx} style={{ marginBottom: '2px' }}>
                        <code>{ev}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

