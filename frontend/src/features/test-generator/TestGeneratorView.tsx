import { useState, useCallback } from 'react';
import { useCreateQuery } from '../../hooks/api/useCreateQuery';
import { API_ENDPOINTS } from '../../services/apiEndpoints';
import { TestGeneratorInputSection } from './components/TestGeneratorInputSection';
import { GeneratedTestCasesSection } from './components/GeneratedTestCasesSection';
import { GeneratedTestCodeSection } from './components/GeneratedTestCodeSection';
import { TestCoverageNotesSection } from './components/TestCoverageNotesSection';
import type {
  GenerateTestsRequest,
  GenerateTestsResponse,
  TestFramework,
  TestFocus,
} from '../../types/ai';

const INITIAL_TEST_CODE = `def add(a, b):
    """Return the arithmetic sum of two numbers."""
    return a + b`;

export function TestGeneratorView() {
  const [code, setCode] = useState<string>(INITIAL_TEST_CODE);
  const [language, setLanguage] = useState<string>('python');
  const [framework, setFramework] = useState<TestFramework>('pytest');
  const [testFocus, setTestFocus] = useState<TestFocus>('comprehensive');

  // Track submitted state to detect if user modifies code in editor
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  // Requirement: Reuse the existing generic useCreateQuery hook for POST requests
  const {
    mutate: generateTests,
    data: generatedTests,
    isPending,
    error,
  } = useCreateQuery<GenerateTestsResponse, GenerateTestsRequest>({
    url: API_ENDPOINTS.AI_GENERATE_TESTS,
  });

  const handleSubmit = useCallback(() => {
    if (!code.trim() || isPending) return;
    setSubmittedCode(code);
    generateTests({
      code: code.trim(),
      language,
      framework,
      test_focus: testFocus,
    });
  }, [code, language, framework, testFocus, isPending, generateTests]);

  const handleClear = useCallback(() => {
    setCode('');
  }, []);

  const handleSelectSample = useCallback(
    (sampleCode: string, sampleLanguage: string, sampleFramework: TestFramework, sampleFocus: TestFocus) => {
      setCode(sampleCode);
      setLanguage(sampleLanguage);
      setFramework(sampleFramework);
      setTestFocus(sampleFocus);
    },
    []
  );

  // Check if code was modified after tests were generated
  const isCodeModifiedSinceGeneration =
    submittedCode !== null &&
    submittedCode !== code &&
    !isPending &&
    Boolean(generatedTests);

  return (
    <div>
      {/* Feature Hero Strip */}
      <section className="hero-banner" style={{ padding: '28px 32px', marginBottom: '24px' }}>
        <div className="hero-content">
          <span
            className="hero-tag"
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#6ee7b7',
              borderColor: 'rgba(16, 185, 129, 0.3)',
            }}
          >
            Phase 5 • AI Unit Test Generator
          </span>
          <h2 style={{ fontSize: '1.65rem' }}>Automated Behavior &amp; Edge-Case Unit Test Generation</h2>
          <p style={{ fontSize: '0.95rem', maxWidth: '820px' }}>
            Powered by local <strong style={{ color: '#6ee7b7' }}>qwen2.5-coder:1.5b</strong> running on Ollama.
            Synthesizes idiomatic, runnable <strong style={{ color: '#93c5fd' }}>pytest</strong> and{' '}
            <strong style={{ color: '#93c5fd' }}>vitest</strong> suites targeting happy paths, boundary conditions, and error-handling without executing arbitrary code.
          </p>
        </div>
      </section>

      {/* Notice if code was modified after generation */}
      {isCodeModifiedSinceGeneration && (
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
            ⚠️ <strong>Code modified:</strong> The code in the editor has changed since tests were generated. Click &quot;Generate Unit Tests&quot; to update tests.
          </span>
          <button
            type="button"
            className="endpoint-action-btn"
            style={{ padding: '4px 12px', fontSize: '0.78rem' }}
            onClick={handleSubmit}
          >
            Re-generate Tests
          </button>
        </div>
      )}

      {/* 2-Column Responsive Layout */}
      <div className="explainer-layout">
        {/* Left Column: Input and Configuration */}
        <div>
          <TestGeneratorInputSection
            code={code}
            language={language}
            framework={framework}
            testFocus={testFocus}
            isPending={isPending}
            onCodeChange={setCode}
            onLanguageChange={setLanguage}
            onFrameworkChange={setFramework}
            onTestFocusChange={setTestFocus}
            onSubmit={handleSubmit}
            onClear={handleClear}
            onSelectSample={handleSelectSample}
          />
        </div>

        {/* Right Column: Results, Skeleton, or Empty State */}
        <div>
          {/* Loading State */}
          {isPending && (
            <div className="card" style={{ height: '100%' }}>
              <div className="card-header">
                <h3 className="card-title">
                  <span className="card-icon">🧪</span>
                  Synthesizing Test Suite...
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
                    color: '#34d399',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    marginBottom: '14px',
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      border: '2px solid rgba(52, 211, 153, 0.3)',
                      borderTopColor: '#34d399',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <span>
                    Probing observable behavior, boundary conditions &amp; synthesizing{' '}
                    <strong style={{ color: '#6ee7b7' }}>{framework}</strong> test suite...
                  </span>
                </div>

                <div className="skeleton-line" style={{ width: '88%' }} />
                <div className="skeleton-line" style={{ width: '65%' }} />
                <div className="skeleton-line" style={{ width: '94%' }} />
                <div className="skeleton-line" style={{ width: '52%' }} />
                <div className="skeleton-line" style={{ width: '80%' }} />
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isPending && (
            <div className="card" style={{ height: '100%' }}>
              <div className="card-header">
                <h3 className="card-title">
                  <span className="card-icon">⚠️</span>
                  Test Generation Failed
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
                  <strong style={{ fontSize: '0.95rem' }}>Error generating unit tests:</strong>
                </div>
                <p style={{ fontSize: '0.88rem', color: '#fca5a5', lineHeight: 1.5 }}>
                  {error.message}
                </p>
                <div>
                  <button
                    type="button"
                    className="endpoint-action-btn"
                    onClick={handleSubmit}
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      borderColor: 'rgba(239, 68, 68, 0.4)',
                      color: '#fee2e2',
                    }}
                  >
                    Retry Generation 🔄
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Initial Empty State */}
          {!generatedTests && !isPending && !error && (
            <div className="card" style={{ height: '100%' }}>
              <div className="card-header">
                <h3 className="card-title">
                  <span className="card-icon">💡</span>
                  Generated Unit Test Suite
                </h3>
              </div>

              <div className="explainer-empty-state">
                <div className="empty-icon">🧪</div>
                <div className="empty-title">Ready for Unit Test Generation</div>
                <div className="empty-sub">
                  Select a test focus (Comprehensive, Basic, Edge Cases, or Error Handling), paste your function or choose a preset sample, and click &quot;Generate Unit Tests&quot;.
                </div>
              </div>
            </div>
          )}

          {/* Generated Result State */}
          {generatedTests && !isPending && (
            <div>
              {/* Summary Card */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">
                    <span className="card-icon">✅</span>
                    Test Suite Generated
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: '#a5b4fc',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {generatedTests.framework}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {generatedTests.test_focus}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 18px',
                    marginTop: '12px',
                  }}
                >
                  <p
                    style={{
                      fontSize: '0.92rem',
                      color: '#d1fae5',
                      lineHeight: 1.55,
                      margin: 0,
                    }}
                  >
                    {generatedTests.summary}
                  </p>
                </div>
              </div>

              {/* Structured Test Cases */}
              <GeneratedTestCasesSection testCases={generatedTests.test_cases} />

              {/* Generated Test Code Block */}
              <GeneratedTestCodeSection
                testCode={generatedTests.generated_test_code}
                language={generatedTests.language}
                framework={generatedTests.framework}
              />

              {/* Coverage Notes, Assumptions & Limitations */}
              <TestCoverageNotesSection
                coverageNotes={generatedTests.coverage_notes}
                assumptions={generatedTests.assumptions}
                warnings={generatedTests.warnings}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TestGeneratorView;
