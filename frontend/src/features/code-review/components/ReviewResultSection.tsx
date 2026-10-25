import { useState } from 'react';
import type { ReviewCodeResponse, ReviewSeverity, ReviewOverallRisk } from '../../../types/ai';

export interface ReviewResultSectionProps {
  review?: ReviewCodeResponse | null;
  isPending: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
}

const SEVERITY_CONFIG: Record<
  ReviewSeverity,
  { label: string; bg: string; color: string; border: string }
> = {
  critical: {
    label: 'CRITICAL',
    bg: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    border: 'rgba(239, 68, 68, 0.35)',
  },
  high: {
    label: 'HIGH',
    bg: 'rgba(249, 115, 22, 0.15)',
    color: '#f97316',
    border: 'rgba(249, 115, 22, 0.35)',
  },
  medium: {
    label: 'MEDIUM',
    bg: 'rgba(245, 158, 11, 0.15)',
    color: '#fbbf24',
    border: 'rgba(245, 158, 11, 0.35)',
  },
  low: {
    label: 'LOW',
    bg: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    border: 'rgba(56, 189, 248, 0.35)',
  },
};

const RISK_CONFIG: Record<
  ReviewOverallRisk,
  { label: string; bg: string; color: string; border: string; icon: string }
> = {
  clean: {
    label: 'CLEAN',
    bg: 'rgba(16, 185, 129, 0.15)',
    color: '#34d399',
    border: 'rgba(16, 185, 129, 0.35)',
    icon: '✨',
  },
  low: {
    label: 'LOW RISK',
    bg: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    border: 'rgba(56, 189, 248, 0.35)',
    icon: 'ℹ️',
  },
  medium: {
    label: 'MEDIUM RISK',
    bg: 'rgba(245, 158, 11, 0.15)',
    color: '#fbbf24',
    border: 'rgba(245, 158, 11, 0.35)',
    icon: '⚠️',
  },
  high: {
    label: 'HIGH RISK',
    bg: 'rgba(249, 115, 22, 0.15)',
    color: '#f97316',
    border: 'rgba(249, 115, 22, 0.35)',
    icon: '🚨',
  },
  critical: {
    label: 'CRITICAL RISK',
    bg: 'rgba(239, 68, 68, 0.18)',
    color: '#f87171',
    border: 'rgba(239, 68, 68, 0.4)',
    icon: '🛑',
  },
};

export function ReviewResultSection({
  review,
  isPending,
  errorMessage,
  onRetry,
}: ReviewResultSectionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!review?.improved_code) return;
    try {
      await navigator.clipboard.writeText(review.improved_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const riskMeta = review?.overall_risk ? RISK_CONFIG[review.overall_risk] || RISK_CONFIG.low : null;

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header">
        <h3 className="card-title">
          <span className="card-icon">🔍</span>
          AI Review &amp; Bug Findings
        </h3>
        {review && riskMeta && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              id="overall-risk-badge"
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '999px',
                background: riskMeta.bg,
                color: riskMeta.color,
                border: `1px solid ${riskMeta.border}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                letterSpacing: '0.04em',
              }}
            >
              <span>{riskMeta.icon}</span>
              <span>{riskMeta.label}</span>
            </span>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
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
              Inspecting code with local qwen2.5-coder:1.5b for edge cases &amp; bugs...
            </span>
          </div>
          <div className="skeleton-line" style={{ width: '92%' }} />
          <div className="skeleton-line" style={{ width: '100%' }} />
          <div className="skeleton-line" style={{ width: '70%' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: '12px' }}>
            <div className="skeleton-line" style={{ height: '64px' }} />
            <div className="skeleton-line" style={{ height: '64px' }} />
          </div>
          <div className="skeleton-line" style={{ width: '85%', marginTop: '12px' }} />
        </div>
      )}

      {/* Error Banner */}
      {!isPending && errorMessage && (
        <div className="error-banner" role="alert" style={{ marginBottom: '0' }}>
          <div className="error-text">
            <strong>Review Engine Error:</strong> {errorMessage}
          </div>
          {onRetry && (
            <button className="endpoint-action-btn" onClick={onRetry}>
              Retry Review
            </button>
          )}
        </div>
      )}

      {/* Empty State before submission */}
      {!isPending && !errorMessage && !review && (
        <div className="explainer-empty-state">
          <div className="empty-icon">🛡️</div>
          <div className="empty-title">Ready for Code Review</div>
          <p className="empty-sub">
            Paste code in the editor or select a test scenario, then click{' '}
            <strong style={{ color: '#e2e8f0' }}>Review Code</strong> to run local heuristic bug and vulnerability detection.
          </p>
        </div>
      )}

      {/* Structured Review Results */}
      {!isPending && review && (
        <div className="review-results-container">
          {/* Executive Summary */}
          <div>
            <div className="section-subtitle">
              <span>📋</span> Review Summary
            </div>
            <div className="explanation-summary">{review.summary}</div>
          </div>

          {/* Issue Findings Section */}
          <div>
            <div className="section-subtitle" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚠️</span>
                <span>Detected Issues ({review.issues.length})</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'none', fontWeight: 400 }}>
                Advisory heuristics • Not verified CVEs
              </span>
            </div>

            {review.issues.length === 0 ? (
              <div
                className="clean-issues-banner"
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <span style={{ fontSize: '1.6rem' }}>🎉</span>
                <div>
                  <div style={{ fontWeight: 600, color: '#34d399', fontSize: '0.92rem' }}>
                    No Issues Detected
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
                    The submitted code appears clean, robust, and follows recommended practices.
                  </div>
                </div>
              </div>
            ) : (
              <div className="issues-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {review.issues.map((issue, idx) => {
                  const sev = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.low;
                  return (
                    <div
                      key={idx}
                      className="issue-card"
                      style={{
                        background: 'rgba(15, 23, 42, 0.55)',
                        border: '1px solid var(--border-subtle)',
                        borderLeft: `4px solid ${sev.color}`,
                        borderRadius: 'var(--radius-sm)',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            className="severity-pill"
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: sev.bg,
                              color: sev.color,
                              border: `1px solid ${sev.border}`,
                              letterSpacing: '0.04em',
                            }}
                          >
                            {sev.label}
                          </span>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontFamily: 'var(--font-mono)',
                              color: '#94a3b8',
                              background: 'rgba(255, 255, 255, 0.05)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {issue.line !== null ? `Line ${issue.line}` : 'General Scope'}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              color: '#a5b4fc',
                              background: 'rgba(99, 102, 241, 0.1)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              textTransform: 'capitalize',
                            }}
                          >
                            {issue.category}
                          </span>
                        </div>
                      </div>

                      <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>
                        {issue.title}
                      </div>

                      <div style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                        {issue.description}
                      </div>

                      <div
                        style={{
                          background: 'rgba(16, 185, 129, 0.06)',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          borderRadius: '4px',
                          padding: '8px 12px',
                          fontSize: '0.82rem',
                          color: '#e2e8f0',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          marginTop: '4px',
                        }}
                      >
                        <span style={{ color: '#10b981', fontWeight: 700 }}>Fix:</span>
                        <span>{issue.suggestion}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Improved Code Section */}
          {review.improved_code && (
            <div>
              <div
                className="section-subtitle"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>✨</span>
                  <span>Hardened &amp; Improved Code</span>
                </div>
                <button
                  type="button"
                  id="copy-improved-code-btn"
                  onClick={handleCopyCode}
                  style={{
                    background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    color: copied ? '#34d399' : '#e2e8f0',
                    border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`,
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s ease',
                  }}
                  aria-label="Copy Improved Code"
                >
                  <span>{copied ? '✓' : '📋'}</span>
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <pre
                id="improved-code-display"
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  color: '#f8fafc',
                  lineHeight: '1.6',
                  overflowX: 'auto',
                  margin: 0,
                  whiteSpace: 'pre',
                }}
              >
                <code>{review.improved_code}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReviewResultSection;
