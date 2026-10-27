import type { GeneratedTestCase, TestCaseCategory } from '../../../types/ai';

export interface GeneratedTestCasesSectionProps {
  testCases: GeneratedTestCase[];
}

function getCategoryBadge(category: TestCaseCategory | string) {
  switch (category) {
    case 'normal':
      return {
        label: 'Normal / Happy Path',
        icon: '🟢',
        bg: 'rgba(16, 185, 129, 0.15)',
        color: '#34d399',
        border: 'rgba(16, 185, 129, 0.3)',
      };
    case 'edge_case':
      return {
        label: 'Edge Case / Boundary',
        icon: '🟡',
        bg: 'rgba(245, 158, 11, 0.15)',
        color: '#fbbf24',
        border: 'rgba(245, 158, 11, 0.3)',
      };
    case 'error_handling':
      return {
        label: 'Error Handling / Exception',
        icon: '🔴',
        bg: 'rgba(239, 68, 68, 0.15)',
        color: '#f87171',
        border: 'rgba(239, 68, 68, 0.3)',
      };
    case 'security':
      return {
        label: 'Security',
        icon: '🟣',
        bg: 'rgba(168, 85, 247, 0.15)',
        color: '#c084fc',
        border: 'rgba(168, 85, 247, 0.3)',
      };
    case 'performance':
      return {
        label: 'Performance',
        icon: '⚡',
        bg: 'rgba(59, 130, 246, 0.15)',
        color: '#60a5fa',
        border: 'rgba(59, 130, 246, 0.3)',
      };
    default:
      return {
        label: category,
        icon: '🔹',
        bg: 'rgba(148, 163, 184, 0.15)',
        color: '#94a3b8',
        border: 'rgba(148, 163, 184, 0.3)',
      };
  }
}

export function GeneratedTestCasesSection({ testCases }: GeneratedTestCasesSectionProps) {
  if (!testCases || testCases.length === 0) {
    return (
      <div className="card" style={{ marginTop: '16px' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>No individual test cases identified.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: '16px' }}>
      <div className="card-header">
        <h3 className="card-title">
          <span className="card-icon">📋</span>
          Structured Test Cases
          <span
            style={{
              marginLeft: '8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            {testCases.length} Cases Synthesized
          </span>
        </h3>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '12px',
          marginTop: '12px',
        }}
      >
        {testCases.map((tc, idx) => {
          const badge = getCategoryBadge(tc.category);
          return (
            <div
              key={`${tc.name}-${idx}`}
              className="test-case-card"
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'border-color 0.2s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <code
                  style={{
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#60a5fa',
                    wordBreak: 'break-all',
                  }}
                >
                  {tc.name}
                </code>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: badge.bg,
                    color: badge.color,
                    border: `1px solid ${badge.border}`,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{badge.icon}</span>
                  <span>{badge.label}</span>
                </span>
              </div>

              <p
                style={{
                  fontSize: '0.82rem',
                  color: '#cbd5e1',
                  margin: 0,
                  lineHeight: 1.45,
                }}
              >
                {tc.description}
              </p>

              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: '6px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  fontSize: '0.78rem',
                  color: '#94a3b8',
                }}
              >
                <strong style={{ color: '#e2e8f0' }}>Expected:</strong> {tc.expected_behavior}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GeneratedTestCasesSection;
