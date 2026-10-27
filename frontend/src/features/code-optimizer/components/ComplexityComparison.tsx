import type { ComplexityMetrics } from '../../../types/ai';

export interface ComplexityComparisonProps {
  originalComplexity: ComplexityMetrics;
  optimizedComplexity: ComplexityMetrics;
}

export function ComplexityComparison({
  originalComplexity,
  optimizedComplexity,
}: ComplexityComparisonProps) {
  const isTimeChanged = originalComplexity.time !== optimizedComplexity.time;
  const isSpaceChanged = originalComplexity.space !== optimizedComplexity.space;

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        marginBottom: '20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
        }}
      >
        <span
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>📊</span> Algorithmic Complexity Comparison (Big-O)
        </span>
        <span
          style={{
            fontSize: '0.72rem',
            color: '#94a3b8',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Theoretical Estimates
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        {/* Time Complexity Card */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: isTimeChanged
              ? '1px solid rgba(16, 185, 129, 0.4)'
              : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '6px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Time Complexity</span>
            {isTimeChanged && (
              <span style={{ color: '#34d399', fontWeight: 600 }}>⚡ Adjusted</span>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.95rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span style={{ color: '#cbd5e1' }}>{originalComplexity.time}</span>
            <span style={{ color: '#6366f1' }}>➔</span>
            <span
              style={{
                color: isTimeChanged ? '#34d399' : '#f8fafc',
                fontWeight: 700,
              }}
            >
              {optimizedComplexity.time}
            </span>
          </div>
        </div>

        {/* Space Complexity Card */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: isSpaceChanged
              ? '1px solid rgba(245, 158, 11, 0.4)'
              : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '6px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Auxiliary Space Complexity</span>
            {isSpaceChanged && (
              <span style={{ color: '#fbbf24', fontWeight: 600 }}>⚖️ Trade-off</span>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.95rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span style={{ color: '#cbd5e1' }}>{originalComplexity.space}</span>
            <span style={{ color: '#6366f1' }}>➔</span>
            <span
              style={{
                color: isSpaceChanged ? '#fbbf24' : '#f8fafc',
                fontWeight: 700,
              }}
            >
              {optimizedComplexity.space}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComplexityComparison;
