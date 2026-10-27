import { useState, useCallback } from 'react';
import { useCreateQuery } from '../../hooks/api/useCreateQuery';
import { API_ENDPOINTS } from '../../services/apiEndpoints';
import { OptimizationInputSection } from './components/OptimizationInputSection';
import { OptimizationResultSection } from './components/OptimizationResultSection';
import type { OptimizeCodeRequest, OptimizeCodeResponse, OptimizationGoal } from '../../types/ai';

const INITIAL_OPTIMIZE_CODE = `def find_duplicates(items):
    dups = []
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if items[i] == items[j] and items[i] not in dups:
                dups.append(items[i])
    return dups`;

export function CodeOptimizerView() {
  const [code, setCode] = useState<string>(INITIAL_OPTIMIZE_CODE);
  const [language, setLanguage] = useState<string>('python');
  const [optimizationGoal, setOptimizationGoal] = useState<OptimizationGoal>('performance');
  // Track submitted state to detect editor changes
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [submittedLanguage, setSubmittedLanguage] = useState<string>('python');

  // Requirement: Reuse the existing generic useCreateQuery hook for POST requests
  const {
    mutate: optimizeCode,
    data: optimizationResult,
    isPending,
    error,
  } = useCreateQuery<OptimizeCodeResponse, OptimizeCodeRequest>({
    url: API_ENDPOINTS.AI_OPTIMIZE,
  });

  const handleSubmit = useCallback(() => {
    if (!code.trim() || isPending) return;
    setSubmittedCode(code);
    setSubmittedLanguage(language);
    optimizeCode({
      code: code.trim(),
      language,
      optimization_goal: optimizationGoal,
    });
  }, [code, language, optimizationGoal, isPending, optimizeCode]);

  const handleSelectSample = useCallback(
    (sampleCode: string, sampleLanguage: string, sampleGoal: OptimizationGoal) => {
      setCode(sampleCode);
      setLanguage(sampleLanguage);
      setOptimizationGoal(sampleGoal);
    },
    []
  );

  // Check if code was modified after optimization
  const isCodeModifiedSinceOptimization =
    submittedCode !== null &&
    submittedCode !== code &&
    !isPending &&
    Boolean(optimizationResult);

  return (
    <div>
      {/* Feature Hero Strip */}
      <section className="hero-banner" style={{ padding: '28px 32px', marginBottom: '24px' }}>
        <div className="hero-content">
          <span
            className="hero-tag"
            style={{
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#a5b4fc',
              borderColor: 'rgba(99, 102, 241, 0.3)',
            }}
          >
            Phase 4 • AI Code Optimization Engine
          </span>
          <h2 style={{ fontSize: '1.65rem' }}>Algorithmic &amp; Architectural Code Optimization</h2>
          <p style={{ fontSize: '0.95rem', maxWidth: '820px' }}>
            Powered by local <strong style={{ color: '#a5b4fc' }}>qwen2.5-coder:1.5b</strong> running on Ollama.
            Synthesizes targeted optimizations for <strong>Performance</strong>, <strong>Readability</strong>, <strong>Memory</strong>, or <strong>Maintainability</strong> while strictly preserving functional behavior and highlighting trade-offs.
          </p>
        </div>
      </section>

      {/* Notice if code was modified after optimization */}
      {isCodeModifiedSinceOptimization && (
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
            ⚠️ <strong>Code modified:</strong> The code in the editor has changed since the last optimization run. Click &quot;Optimize Code&quot; to inspect the updated version.
          </span>
          <button
            type="button"
            className="endpoint-action-btn"
            style={{ padding: '4px 12px', fontSize: '0.78rem' }}
            onClick={handleSubmit}
          >
            Re-run Optimization
          </button>
        </div>
      )}

      {/* 2-Column Responsive Layout */}
      <div className="explainer-layout">
        <OptimizationInputSection
          code={code}
          language={language}
          optimizationGoal={optimizationGoal}
          isPending={isPending}
          onCodeChange={setCode}
          onLanguageChange={setLanguage}
          onOptimizationGoalChange={setOptimizationGoal}
          onSubmit={handleSubmit}
          onSelectSample={handleSelectSample}
        />

        <OptimizationResultSection
          result={optimizationResult}
          originalCode={submittedCode || code}
          language={submittedLanguage || language}
          isPending={isPending}
          errorMessage={error ? error.message : null}
          onRetry={handleSubmit}
        />
      </div>
    </div>
  );
}

export default CodeOptimizerView;
