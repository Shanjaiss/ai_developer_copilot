import type { ExplainCodeResponse } from '../../../types/ai';

export interface ExplanationResultSectionProps {
  explanation?: ExplainCodeResponse | null;
  isPending: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
}

export function ExplanationResultSection({
  explanation,
  isPending,
  errorMessage,
  onRetry,
}: ExplanationResultSectionProps) {
  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header">
        <h3 className="card-title">
          <span className="card-icon">🧠</span>
          AI Explanation &amp; Analysis
        </h3>
        {explanation && (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            ● Inference Complete
          </span>
        )}
      </div>

      {/* Loading Skeleton State */}
      {isPending && (
        <div className="loading-skeleton-box" aria-busy="true" aria-live="polite">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'var(--accent-cyan)',
                animation: 'pulseGlow 1.5s infinite ease-in-out',
              }}
            />
            <span style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600 }}>
              Generating explanation with local qwen2.5-coder:1.5b...
            </span>
          </div>
          <div className="skeleton-line" style={{ width: '90%' }} />
          <div className="skeleton-line" style={{ width: '100%' }} />
          <div className="skeleton-line" style={{ width: '75%' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '12px' }}>
            <div className="skeleton-line" style={{ height: '54px' }} />
            <div className="skeleton-line" style={{ height: '54px' }} />
          </div>
          <div className="skeleton-line" style={{ width: '80%', marginTop: '12px' }} />
          <div className="skeleton-line" style={{ width: '60%' }} />
        </div>
      )}

      {/* Error State */}
      {!isPending && errorMessage && (
        <div className="error-banner" role="alert" style={{ marginBottom: '0' }}>
          <div className="error-text">
            <strong>Inference Error:</strong> {errorMessage}
          </div>
          {onRetry && (
            <button className="endpoint-action-btn" onClick={onRetry}>
              Retry Analysis
            </button>
          )}
        </div>
      )}

      {/* Empty State before any submission */}
      {!isPending && !errorMessage && !explanation && (
        <div className="explainer-empty-state">
          <div className="empty-icon">✨</div>
          <div className="empty-title">Ready for Code Analysis</div>
          <p className="empty-sub">
            Paste code in the editor or select a sample snippet, then click{' '}
            <strong style={{ color: '#e2e8f0' }}>Explain Code</strong> to generate a local AI breakdown.
          </p>
        </div>
      )}

      {/* Structured Result Display */}
      {!isPending && explanation && (
        <div className="explanation-card">
          {/* Summary */}
          <div>
            <div className="section-subtitle">
              <span>📋</span> Executive Summary
            </div>
            <div className="explanation-summary">{explanation.summary}</div>
          </div>

          {/* Time & Space Complexity */}
          <div>
            <div className="section-subtitle">
              <span>⏱️</span> Algorithmic Complexity
            </div>
            <div className="complexity-strip">
              <div className="complexity-box">
                <span className="complexity-label">Time Complexity</span>
                <span className="complexity-val" id="time-complexity-value">
                  {explanation.time_complexity}
                </span>
              </div>
              <div className="complexity-box">
                <span className="complexity-label">Space Complexity</span>
                <span
                  className="complexity-val"
                  id="space-complexity-value"
                  style={{ color: '#a78bfa' }}
                >
                  {explanation.space_complexity}
                </span>
              </div>
            </div>
          </div>

          {/* Line-by-Line Breakdown */}
          {explanation.line_by_line && explanation.line_by_line.length > 0 && (
            <div>
              <div className="section-subtitle">
                <span>🔍</span> Line-by-Line Logic
              </div>
              <div className="line-breakdown-list">
                {explanation.line_by_line.map((line, idx) => (
                  <div key={idx} className="line-breakdown-item">
                    <span className="line-badge">Step {idx + 1}</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Improvements */}
          {explanation.improvements && explanation.improvements.length > 0 && (
            <div>
              <div className="section-subtitle">
                <span>💡</span> Suggested Improvements
              </div>
              <ul className="improvements-list">
                {explanation.improvements.map((improvement, idx) => (
                  <li key={idx} className="improvement-item">
                    <span className="improvement-bullet">✓</span>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ExplanationResultSection;
