import type { RootCauseHypothesis, DebugConfidence } from '../../../types';

export interface RootCauseCardProps {
  hypotheses: RootCauseHypothesis[];
}

function getConfidenceBadge(confidence: DebugConfidence) {
  switch (confidence) {
    case 'high':
      return {
        label: 'High Confidence',
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.3)',
        color: '#10b981',
      };
    case 'medium':
      return {
        label: 'Medium Confidence',
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.3)',
        color: '#f59e0b',
      };
    case 'low':
    default:
      return {
        label: 'Low Confidence',
        bg: 'rgba(148, 163, 184, 0.15)',
        border: 'rgba(148, 163, 184, 0.3)',
        color: '#94a3b8',
      };
  }
}

export function RootCauseCard({ hypotheses }: RootCauseCardProps) {
  if (!hypotheses || hypotheses.length === 0) {
    return null;
  }

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '1.2rem' }}>🎯</span>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Root Cause Hypotheses
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
          {hypotheses.length} {hypotheses.length === 1 ? 'Hypothesis' : 'Hypotheses'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {hypotheses.map((item, idx) => {
          const badge = getConfidenceBadge(item.confidence);
          return (
            <div
              key={idx}
              data-testid={`root-cause-item-${idx}`}
              style={{
                padding: '16px',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {item.title}
                </h4>
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

              <p style={{ margin: '0 0 12px', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {item.description}
              </p>

              {item.evidence && item.evidence.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Supporting Evidence:
                  </span>
                  <ul style={{ margin: '6px 0 0', paddingLeft: '20px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    {item.evidence.map((ev, evIdx) => (
                      <li key={evIdx} style={{ marginBottom: '4px' }}>
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

