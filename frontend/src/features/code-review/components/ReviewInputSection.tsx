import { Button } from '../../../components/ui/Button';

export interface ReviewInputSectionProps {
  code: string;
  language: string;
  isPending: boolean;
  onCodeChange: (code: string) => void;
  onLanguageChange: (language: string) => void;
  onSubmit: () => void;
  onSelectSample: (code: string, language: string) => void;
}

const SUPPORTED_LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
];

const CODE_REVIEW_SAMPLES = [
  {
    name: 'Division by Zero',
    language: 'python',
    code: 'def divide(a, b):\n    return a / b',
  },
  {
    name: 'Unchecked Index',
    language: 'python',
    code: 'def get_first_element(items):\n    return items[0]',
  },
  {
    name: 'JS Null Access',
    language: 'javascript',
    code: `function getUserDisplayName(user) {
  return user.profile.name.toUpperCase();
}`,
  },
  {
    name: 'Clean Function',
    language: 'python',
    code: `def add(a: int, b: int) -> int:
    """Return the arithmetic sum of two integers."""
    return a + b`,
  },
];

const MAX_CODE_CHARS = 5000;

export function ReviewInputSection({
  code,
  language,
  isPending,
  onCodeChange,
  onLanguageChange,
  onSubmit,
  onSelectSample,
}: ReviewInputSectionProps) {
  const charCount = code.length;
  const isOverLimit = charCount > MAX_CODE_CHARS;
  const isNearLimit = charCount > MAX_CODE_CHARS * 0.85;

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header">
        <h3 className="card-title">
          <span className="card-icon">🛡️</span>
          Source Code Input
        </h3>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
          Review Engine: qwen2.5-coder:1.5b
        </span>
      </div>

      <div className="editor-toolbar">
        <div className="toolbar-left">
          <label htmlFor="review-language-select" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Language:
          </label>
          <select
            id="review-language-select"
            className="language-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            disabled={isPending}
            aria-label="Select Programming Language"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="toolbar-right">
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Test Scenarios:</span>
          <div className="sample-pills">
            {CODE_REVIEW_SAMPLES.map((sample) => (
              <button
                key={sample.name}
                type="button"
                className="sample-pill-btn"
                onClick={() => onSelectSample(sample.code, sample.language)}
                disabled={isPending}
              >
                {sample.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <textarea
        id="review-code-textarea"
        className="code-textarea"
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        placeholder={`// Paste or write ${language} code to inspect for bugs, security risks, or maintainability flaws...\ndef divide(a, b):\n    return a / b`}
        disabled={isPending}
        spellCheck="false"
        aria-label="Review Code Input Editor"
      />

      <div className="editor-footer">
        <span
          className={`char-counter ${
            isOverLimit ? 'limit-error' : isNearLimit ? 'limit-warning' : ''
          }`}
        >
          {charCount} / {MAX_CODE_CHARS} characters
        </span>

        <Button
          id="review-code-submit-btn"
          variant="primary"
          style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
            color: '#ffffff',
            padding: '10px 24px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            boxShadow: '0 4px 14px rgba(14, 165, 233, 0.4)',
          }}
          onClick={onSubmit}
          disabled={!code.trim() || isOverLimit || isPending}
          isLoading={isPending}
          aria-label="Review Code with AI"
        >
          <span>{isPending ? 'Reviewing with AI...' : 'Review Code 🛡️'}</span>
        </Button>
      </div>
    </div>
  );
}

export default ReviewInputSection;
