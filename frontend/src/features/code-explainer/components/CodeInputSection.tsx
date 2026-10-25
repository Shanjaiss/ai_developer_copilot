import { Button } from '../../../components/ui/Button';

export interface CodeInputSectionProps {
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

const CODE_SAMPLES = [
  {
    name: 'Python Square',
    language: 'python',
    code: 'def square(n):\n    """Return the square of a number."""\n    return n * n',
  },
  {
    name: 'TS Binary Search',
    language: 'typescript',
    code: `function binarySearch(arr: number[], target: number): number {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`,
  },
  {
    name: 'Go Factorial',
    language: 'go',
    code: `func factorial(n int) int {
    if n <= 1 {
        return 1
    }
    return n * factorial(n-1)
}`,
  },
];

const MAX_CODE_CHARS = 5000;

export function CodeInputSection({
  code,
  language,
  isPending,
  onCodeChange,
  onLanguageChange,
  onSubmit,
  onSelectSample,
}: CodeInputSectionProps) {
  const charCount = code.length;
  const isOverLimit = charCount > MAX_CODE_CHARS;
  const isNearLimit = charCount > MAX_CODE_CHARS * 0.85;

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header">
        <h3 className="card-title">
          <span className="card-icon">💻</span>
          Source Code Input
        </h3>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
          Local LLM: qwen2.5-coder:1.5b
        </span>
      </div>

      <div className="editor-toolbar">
        <div className="toolbar-left">
          <label htmlFor="language-select" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Language:
          </label>
          <select
            id="language-select"
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
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Samples:</span>
          <div className="sample-pills">
            {CODE_SAMPLES.map((sample) => (
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
        id="code-editor-textarea"
        className="code-textarea"
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        placeholder={`// Paste or type your ${language} code here...\ndef calculate(val):\n    return val * 2`}
        disabled={isPending}
        spellCheck="false"
        aria-label="Code Input Editor"
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
          id="explain-code-submit-btn"
          variant="primary"
          style={{
            background: 'var(--accent-gradient)',
            color: '#ffffff',
            padding: '10px 24px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
          }}
          onClick={onSubmit}
          disabled={!code.trim() || isOverLimit || isPending}
          isLoading={isPending}
          aria-label="Explain Code with AI"
        >
          <span>{isPending ? 'Analyzing with AI...' : 'Explain Code ⚡'}</span>
        </Button>
      </div>
    </div>
  );
}

export default CodeInputSection;
