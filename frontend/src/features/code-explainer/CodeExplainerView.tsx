import { useState, useCallback } from 'react';
import { useCreateQuery } from '../../hooks/api/useCreateQuery';
import { API_ENDPOINTS } from '../../services/apiEndpoints';
import { CodeInputSection } from './components/CodeInputSection';
import { ExplanationResultSection } from './components/ExplanationResultSection';
import type { ExplainCodeRequest, ExplainCodeResponse } from '../../types/ai';

const INITIAL_CODE = `def square(n):
    """Return the square of a number."""
    return n * n`;

export function CodeExplainerView() {
  const [code, setCode] = useState<string>(INITIAL_CODE);
  const [language, setLanguage] = useState<string>('python');

  // Requirement: Reuse the existing generic useCreateQuery hook for the POST request
  const {
    mutate: explainCode,
    data: explanation,
    isPending,
    error,
  } = useCreateQuery<ExplainCodeResponse, ExplainCodeRequest>({
    url: API_ENDPOINTS.AI_EXPLAIN,
  });

  const handleSubmit = useCallback(() => {
    if (!code.trim() || isPending) return;
    explainCode({ code: code.trim(), language });
  }, [code, language, isPending, explainCode]);

  const handleSelectSample = useCallback((sampleCode: string, sampleLanguage: string) => {
    setCode(sampleCode);
    setLanguage(sampleLanguage);
  }, []);

  return (
    <div>
      {/* Feature Hero Strip */}
      <section className="hero-banner" style={{ padding: '28px 32px', marginBottom: '24px' }}>
        <div className="hero-content">
          <span className="hero-tag" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
            Phase 2 • AI Code Explanation Engine
          </span>
          <h2 style={{ fontSize: '1.65rem' }}>Local LLM Code Analysis</h2>
          <p style={{ fontSize: '0.95rem', maxWidth: '820px' }}>
            Powered by local <strong style={{ color: '#38bdf8' }}>qwen2.5-coder:1.5b</strong> running on Ollama.
            Generates high-level summaries, line-by-line logical analysis, Big-O algorithmic complexity estimates, and idiomatic optimization tips without executing untrusted code.
          </p>
        </div>
      </section>

      {/* 2-Column Responsive Layout */}
      <div className="explainer-layout">
        <CodeInputSection
          code={code}
          language={language}
          isPending={isPending}
          onCodeChange={setCode}
          onLanguageChange={setLanguage}
          onSubmit={handleSubmit}
          onSelectSample={handleSelectSample}
        />

        <ExplanationResultSection
          explanation={explanation}
          isPending={isPending}
          errorMessage={error ? error.message : null}
          onRetry={handleSubmit}
        />
      </div>
    </div>
  );
}

export default CodeExplainerView;
