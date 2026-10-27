import { Button } from '../../../components/ui/Button';
import type { TestFramework, TestFocus } from '../../../types/ai';

export interface TestGeneratorInputSectionProps {
  code: string;
  language: string;
  framework: TestFramework;
  testFocus: TestFocus;
  isPending: boolean;
  onCodeChange: (code: string) => void;
  onLanguageChange: (language: string) => void;
  onFrameworkChange: (framework: TestFramework) => void;
  onTestFocusChange: (focus: TestFocus) => void;
  onSubmit: () => void;
  onClear: () => void;
  onSelectSample: (code: string, language: string, framework: TestFramework, focus: TestFocus) => void;
}

const SUPPORTED_LANGUAGES = [
  { value: 'python', label: 'Python (pytest)', defaultFramework: 'pytest' as TestFramework },
  { value: 'typescript', label: 'TypeScript (vitest)', defaultFramework: 'vitest' as TestFramework },
  { value: 'javascript', label: 'JavaScript (vitest)', defaultFramework: 'vitest' as TestFramework },
];

const TEST_FOCUS_OPTIONS: { value: TestFocus; label: string; icon: string; description: string }[] = [
  {
    value: 'comprehensive',
    label: 'Comprehensive',
    icon: '🎯',
    description: 'Generates full suite including normal execution, boundary conditions, and edge cases.',
  },
  {
    value: 'basic',
    label: 'Basic Happy Path',
    icon: '🟢',
    description: 'Focuses on typical happy-path behavior and expected standard return values.',
  },
  {
    value: 'edge_cases',
    label: 'Edge Cases',
    icon: '🟡',
    description: 'Probes boundary conditions, extreme values, empty collections, and zero inputs.',
  },
  {
    value: 'error_handling',
    label: 'Error Handling',
    icon: '🔴',
    description: 'Tests invalid arguments, type mismatches, and expected exceptions or error states.',
  },
];

const TEST_GENERATOR_SAMPLES = [
  {
    name: 'Python: add()',
    language: 'python',
    framework: 'pytest' as TestFramework,
    focus: 'comprehensive' as TestFocus,
    code: `def add(a, b):
    """Return the arithmetic sum of two numbers."""
    return a + b`,
  },
  {
    name: 'Python: is_even()',
    language: 'python',
    framework: 'pytest' as TestFramework,
    focus: 'edge_cases' as TestFocus,
    code: `def is_even(number):
    """Determine whether an integer is even."""
    return number % 2 == 0`,
  },
  {
    name: 'JS: multiply()',
    language: 'javascript',
    framework: 'vitest' as TestFramework,
    focus: 'basic' as TestFocus,
    code: `function multiply(a, b) {
  // Multiply two numbers
  return a * b;
}`,
  },
  {
    name: 'TS: greet()',
    language: 'typescript',
    framework: 'vitest' as TestFramework,
    focus: 'comprehensive' as TestFocus,
    code: `export function greet(name: string): string {
  return \`Hello, \${name}\`;
}`,
  },
];

const MAX_CODE_CHARS = 5000;

export function TestGeneratorInputSection({
  code,
  language,
  framework,
  testFocus,
  isPending,
  onCodeChange,
  onLanguageChange,
  onFrameworkChange,
  onTestFocusChange,
  onSubmit,
  onClear,
  onSelectSample,
}: TestGeneratorInputSectionProps) {
  const charCount = code.length;
  const isOverLimit = charCount > MAX_CODE_CHARS;
  const isNearLimit = charCount > MAX_CODE_CHARS * 0.85;

  const handleLanguageSelect = (newLang: string) => {
    onLanguageChange(newLang);
    // Auto-sync framework to maintain strict compatibility
    if (newLang === 'python') {
      onFrameworkChange('pytest');
    } else if (newLang === 'javascript' || newLang === 'typescript') {
      onFrameworkChange('vitest');
    }
  };

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <h3 className="card-title">
          <span className="card-icon">🧪</span>
          Source Code &amp; Test Configuration
        </h3>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
          Model: qwen2.5-coder:1.5b
        </span>
      </div>

      {/* Test Focus Pill Group */}
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="test-focus-group"
          style={{
            display: 'block',
            fontSize: '0.8rem',
            color: '#94a3b8',
            marginBottom: '8px',
            fontWeight: 600,
          }}
        >
          Test Generation Focus:
        </label>
        <div
          id="test-focus-group"
          role="radiogroup"
          aria-label="Test Focus Selector"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
          }}
        >
          {TEST_FOCUS_OPTIONS.map((opt) => {
            const isSelected = testFocus === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={isPending}
                onClick={() => onTestFocusChange(opt.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: isSelected
                    ? '1px solid var(--accent-indigo)'
                    : '1px solid var(--border-subtle)',
                  background: isSelected
                    ? 'rgba(99, 102, 241, 0.18)'
                    : 'rgba(15, 23, 42, 0.6)',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  fontSize: '0.82rem',
                  fontWeight: isSelected ? 600 : 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                }}
                title={opt.description}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Language & Framework Selectors Toolbar */}
      <div className="editor-toolbar" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="test-language-select" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Language:
          </label>
          <select
            id="test-language-select"
            className="language-select"
            value={language}
            onChange={(e) => handleLanguageSelect(e.target.value)}
            disabled={isPending}
            aria-label="Programming Language"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="test-framework-select" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Framework:
          </label>
          <select
            id="test-framework-select"
            className="language-select"
            value={framework}
            onChange={(e) => onFrameworkChange(e.target.value as TestFramework)}
            disabled={isPending}
            aria-label="Testing Framework"
          >
            {language === 'python' ? (
              <option value="pytest">pytest (Python standard)</option>
            ) : (
              <option value="vitest">vitest (JS / TS fast runner)</option>
            )}
          </select>
        </div>

        <div className="toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Samples:</span>
          {TEST_GENERATOR_SAMPLES.map((sample) => (
            <button
              key={sample.name}
              type="button"
              className="sample-snippet-btn"
              onClick={() => onSelectSample(sample.code, sample.language, sample.framework, sample.focus)}
              disabled={isPending}
              title={`Load sample: ${sample.name}`}
            >
              {sample.name}
            </button>
          ))}
        </div>
      </div>

      {/* Source Code Textarea */}
      <div className="editor-wrapper" style={{ flex: 1, minHeight: '260px', display: 'flex', flexDirection: 'column' }}>
        <textarea
          id="test-code-input"
          className="code-textarea"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          placeholder={`// Paste your source function or module here...\n// Antigravity AI will synthesize idiomatic unit tests.`}
          disabled={isPending}
          spellCheck={false}
          aria-label="Source code for unit test generation"
          style={{ flex: 1, minHeight: '240px' }}
        />
      </div>

      {/* Editor Footer / Validation / Action Buttons */}
      <div
        className="editor-footer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontSize: '0.78rem',
              color: isOverLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : '#64748b',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {charCount.toLocaleString()} / {MAX_CODE_CHARS.toLocaleString()} chars
          </span>
          {isOverLimit && (
            <span style={{ fontSize: '0.78rem', color: '#ef4444' }}>
              ⚠️ Code exceeds maximum allowed length
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            id="clear-tests-input-btn"
            className="endpoint-action-btn"
            onClick={onClear}
            disabled={isPending || (!code && language === 'python')}
            style={{ background: 'transparent', color: '#94a3b8' }}
          >
            Clear
          </button>

          <Button
            id="generate-tests-btn"
            variant="primary"
            onClick={onSubmit}
            isLoading={isPending}
            disabled={isPending || !code.trim() || isOverLimit}
          >
            {isPending ? 'Generating Tests...' : 'Generate Unit Tests 🧪'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default TestGeneratorInputSection;
