import { useState, useCallback } from 'react';
import { useCreateQuery } from '../../hooks/api/useCreateQuery';
import { API_ENDPOINTS } from '../../services/apiEndpoints';
import { ReviewInputSection } from './components/ReviewInputSection';
import { ReviewResultSection } from './components/ReviewResultSection';
import type { ReviewCodeRequest, ReviewCodeResponse } from '../../types/ai';

const INITIAL_REVIEW_CODE = `def divide(a, b):
    return a / b`;

export function CodeReviewView() {
  const [code, setCode] = useState<string>(INITIAL_REVIEW_CODE);
  const [language, setLanguage] = useState<string>('python');
  // Track submitted code to ensure results correspond to active submission
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  // Requirement: Reuse the existing generic useCreateQuery hook for POST requests
  const {
    mutate: reviewCode,
    data: reviewResult,
    isPending,
    error,
  } = useCreateQuery<ReviewCodeResponse, ReviewCodeRequest>({
    url: API_ENDPOINTS.AI_REVIEW,
  });

  const handleSubmit = useCallback(() => {
    if (!code.trim() || isPending) return;
    setSubmittedCode(code);
    reviewCode({ code: code.trim(), language });
  }, [code, language, isPending, reviewCode]);

  const handleSelectSample = useCallback((sampleCode: string, sampleLanguage: string) => {
    setCode(sampleCode);
    setLanguage(sampleLanguage);
  }, []);

  // Ensure review results from an earlier code submission are not shown as results for newly edited code
  const isCodeModifiedSinceReview =
    submittedCode !== null && submittedCode !== code && !isPending && Boolean(reviewResult);

  return (
    <div>
      {/* Feature Hero Strip */}
      <section className="hero-banner" style={{ padding: '28px 32px', marginBottom: '24px' }}>
        <div className="hero-content">
          <span
            className="hero-tag"
            style={{
              background: 'rgba(14, 165, 233, 0.15)',
              color: '#38bdf8',
              borderColor: 'rgba(14, 165, 233, 0.3)',
            }}
          >
            Phase 3 • AI Code Review &amp; Bug Detection Engine
          </span>
          <h2 style={{ fontSize: '1.65rem' }}>Local LLM Heuristic Code Review</h2>
          <p style={{ fontSize: '0.95rem', maxWidth: '820px' }}>
            Powered by local <strong style={{ color: '#38bdf8' }}>qwen2.5-coder:1.5b</strong> running on Ollama.
            Performs heuristic analysis for runtime exceptions, bounds errors, undefined property access, and basic security flaws with actionable suggestions and hardened code output.
          </p>
        </div>
      </section>

      {/* Notice if code was modified after review */}
      {isCodeModifiedSinceReview && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 16px',
            marginBottom: '16px',
            fontSize: '0.85rem',
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>
            ⚠️ <strong>Code modified:</strong> The code in the editor has changed since the last review. Click &quot;Review Code&quot; to inspect the updated version.
          </span>
          <button
            type="button"
            className="endpoint-action-btn"
            style={{ padding: '4px 12px', fontSize: '0.78rem' }}
            onClick={handleSubmit}
          >
            Re-run Review
          </button>
        </div>
      )}

      {/* 2-Column Responsive Layout */}
      <div className="explainer-layout">
        <ReviewInputSection
          code={code}
          language={language}
          isPending={isPending}
          onCodeChange={setCode}
          onLanguageChange={setLanguage}
          onSubmit={handleSubmit}
          onSelectSample={handleSelectSample}
        />

        <ReviewResultSection
          review={reviewResult}
          isPending={isPending}
          errorMessage={error ? error.message : null}
          onRetry={handleSubmit}
        />
      </div>
    </div>
  );
}

export default CodeReviewView;
