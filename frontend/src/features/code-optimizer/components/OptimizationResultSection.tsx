import type { OptimizeCodeResponse } from '../../../types/ai';
import { ComplexityComparison } from './ComplexityComparison';
import { CodeComparisonSection } from './CodeComparisonSection';

export interface OptimizationResultSectionProps {
  result?: OptimizeCodeResponse | null;
  originalCode?: string;
  language?: string;
  isPending: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
}

export function OptimizationResultSection({
  result,
  originalCode = '',
  language = 'python',
  isPending,
  errorMessage,
  onRetry,
}: OptimizationResultSectionProps) {
  // 1. Loading State
  if (isPending) {
    return (
      <div className="card" style={{ height: '100%' }}>
        <div className="card-header">
          <h3 className="card-title">
            <span className="card-icon">⚡</span>
            Optimization in Progress
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
            Ollama: qwen2.5-coder:1.5b
          </span>
        </div>

        <div className="loading-skeleton-box" style={{ marginTop: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#38bdf8',
              fontSize: '0.9rem',
              fontWeight: 500,
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                width: '18px',
                height: '18px',
                border: '2px solid rgba(56, 189, 248, 0.3)',
                borderTopColor: '#38bdf8',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <span>Analyzing code structure &amp; synthesizing optimized implementation...</span>
          </div>

          <div className="skeleton-line" style={{ width: '85%' }} />
          <div className="skeleton-line" style={{ width: '65%' }} />
          <div className="skeleton-line" style={{ width: '92%' }} />
          <div className="skeleton-line" style={{ width: '45%' }} />
          <div className="skeleton-line" style={{ width: '78%' }} />
        </div>
      </div>
    );
  }

  // 2. Error State
  if (errorMessage) {
    return (
      <div className="card" style={{ height: '100%' }}>
        <div className="card-header">
          <h3 className="card-title">
            <span className="card-icon">⚠️</span>
            Optimization Error
          </h3>
        </div>

        <div
          role="alert"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            marginTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444' }}>
            <span style={{ fontSize: '1.2rem' }}>🛑</span>
            <strong style={{ fontSize: '0.95rem' }}>Failed to complete code optimization:</strong>
          </div>
          <p style={{ fontSize: '0.88rem', color: '#fca5a5', lineHeight: 1.5 }}>
            {errorMessage}
          </p>
          {onRetry && (
            <div>
              <button
                type="button"
                className="endpoint-action-btn"
                onClick={onRetry}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  color: '#fee2e2',
                }}
              >
                Retry Optimization 🔄
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Empty Initial State
  if (!result) {
    return (
      <div className="card" style={{ height: '100%' }}>
        <div className="card-header">
          <h3 className="card-title">
            <span className="card-icon">💡</span>
            Optimization Analysis
          </h3>
        </div>

        <div className="explainer-empty-state">
          <div className="empty-icon">⚡</div>
          <div className="empty-title">Ready for Code Optimization</div>
          <div className="empty-sub">
            Select an optimization target (Performance, Readability, Memory, or Maintainability),
            paste your source code or pick a test preset, and click &quot;Optimize Code&quot;.
          </div>
        </div>
      </div>
    );
  }

  // 4. Result Loaded State
  const isUnchanged =
    result.changes.length === 0 ||
    result.optimized_code.trim() === originalCode.trim();

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header">
        <h3 className="card-title">
          <span className="card-icon">🚀</span>
          Optimization Report
        </h3>
        <span
          style={{
            fontSize: '0.72rem',
            padding: '3px 8px',
            borderRadius: '999px',
            background: isUnchanged ? 'rgba(148, 163, 184, 0.15)' : 'rgba(16, 185, 129, 0.18)',
            color: isUnchanged ? '#94a3b8' : '#34d399',
            border: isUnchanged ? '1px solid rgba(148, 163, 184, 0.3)' : '1px solid rgba(16, 185, 129, 0.35)',
            fontWeight: 600,
          }}
        >
          {isUnchanged ? 'ALREADY OPTIMAL' : 'OPTIMIZED'}
        </span>
      </div>

      {/* Summary Banner */}
      <div
        style={{
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          marginBottom: '18px',
          marginTop: '12px',
        }}
      >
        <div style={{ fontSize: '0.75rem', color: '#a5b4fc', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>
          Summary
        </div>
        <p style={{ fontSize: '0.92rem', color: '#f8fafc', lineHeight: 1.5 }}>
          {result.summary}
        </p>
      </div>

      {/* Complexity Comparison (Big-O) */}
      <ComplexityComparison
        originalComplexity={result.original_complexity}
        optimizedComplexity={result.optimized_complexity}
      />

      {/* Code Comparison (Original vs Optimized) with Copy button */}
      <CodeComparisonSection
        originalCode={originalCode}
        optimizedCode={result.optimized_code}
        language={language}
        isUnchanged={isUnchanged}
      />

      {/* Proposed Changes Section */}
      <div style={{ marginBottom: '20px' }}>
        <h4
          style={{
            fontSize: '0.88rem',
            color: '#f8fafc',
            fontWeight: 600,
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>🛠️</span> Proposed Changes &amp; Rationale ({result.changes.length})
        </h4>

        {result.changes.length === 0 ? (
          <div
            style={{
              padding: '14px 18px',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.85rem',
              color: '#94a3b8',
            }}
          >
            No modifications were proposed. The submitted code already follows clean, optimal patterns for the chosen objective.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {result.changes.map((change, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e2e8f0' }}>
                  {idx + 1}. {change.title}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                  <strong style={{ color: '#94a3b8' }}>Reason: </strong>
                  {change.reason}
                </div>
                {change.tradeoff && (
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: '#fbbf24',
                      background: 'rgba(245, 158, 11, 0.08)',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      marginTop: '2px',
                    }}
                  >
                    <strong>Trade-off: </strong>
                    {change.tradeoff}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warnings & Empirical Benchmarking Card */}
      {result.warnings && result.warnings.length > 0 && (
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
          }}
        >
          <div
            style={{
              fontSize: '0.78rem',
              color: '#fbbf24',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>⚖️</span> Trade-offs &amp; Benchmark Advisories
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: '#cbd5e1' }}>
            {result.warnings.map((warning, wIdx) => (
              <li key={wIdx} style={{ marginBottom: '4px', lineHeight: 1.45 }}>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default OptimizationResultSection;
