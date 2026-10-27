import { Button } from '../../../components/ui/Button';
import type { OptimizationGoal, SupportedLanguage } from '../../../types/ai';

export interface OptimizationInputSectionProps {
  code: string;
  language: string;
  optimizationGoal: OptimizationGoal;
  isPending: boolean;
  onCodeChange: (code: string) => void;
  onLanguageChange: (language: string) => void;
  onOptimizationGoalChange: (goal: OptimizationGoal) => void;
  onSubmit: () => void;
  onSelectSample: (code: string, language: string, goal: OptimizationGoal) => void;
}

const SUPPORTED_LANGUAGES: { value: SupportedLanguage; label: string }[] = [
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

const OPTIMIZATION_GOALS: { value: OptimizationGoal; label: string; icon: string; description: string }[] = [
  {
    value: 'performance',
    label: 'Performance',
    icon: '⚡',
    description: 'Reduce algorithmic time complexity and eliminate loop bottlenecks.',
  },
  {
    value: 'readability',
    label: 'Readability',
    icon: '📖',
    description: 'Simplify logic, improve naming, and adhere to clean code idioms.',
  },
  {
    value: 'memory',
    label: 'Memory',
    icon: '💾',
    description: 'Reduce auxiliary space complexity and avoid redundant allocations.',
  },
  {
    value: 'maintainability',
    label: 'Maintainability',
    icon: '🛠️',
    description: 'Promote modularity, type clarity, error handling, and separation of concerns.',
  },
];

const OPTIMIZATION_SAMPLES = [
  {
    name: 'Nested Loops',
    language: 'python',
    goal: 'performance' as OptimizationGoal,
    code: `def find_duplicates(items):
    dups = []
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if items[i] == items[j] and items[i] not in dups:
                dups.append(items[i])
    return dups`,
  },
  {
    name: 'String Concat',
    language: 'python',
    goal: 'performance' as OptimizationGoal,
    code: `def build_report(records):
    report = ""
    for r in records:
        report = report + str(r) + "\\n"
    return report`,
  },
  {
    name: 'Array Traversal',
    language: 'javascript',
    goal: 'performance' as OptimizationGoal,
    code: `function processActiveUsers(users) {
  const active = users.filter(u => u.isActive);
  const emails = active.map(u => u.email.toLowerCase());
  return emails;
}`,
  },
  {
    name: 'Already Optimal',
    language: 'python',
    goal: 'performance' as OptimizationGoal,
    code: `def square(n: int) -> int:
    """Return the square of an integer in constant O(1) time."""
    return n * n`,
  },
];

const MAX_CODE_CHARS = 5000;

export function OptimizationInputSection({
  code,
  language,
  optimizationGoal,
  isPending,
  onCodeChange,
  onLanguageChange,
  onOptimizationGoalChange,
  onSubmit,
  onSelectSample,
}: OptimizationInputSectionProps) {
  const charCount = code.length;
  const isOverLimit = charCount > MAX_CODE_CHARS;
  const isNearLimit = charCount > MAX_CODE_CHARS * 0.85;

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header">
        <h3 className="card-title">
          <span className="card-icon">🚀</span>
          Source Code Input &amp; Goal
        </h3>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
          Engine: qwen2.5-coder:1.5b
        </span>
      </div>

      {/* Goal Selector Pill Bar */}
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="optimization-goal-select"
          style={{
            display: 'block',
            fontSize: '0.8rem',
            color: '#94a3b8',
            marginBottom: '8px',
            fontWeight: 600,
          }}
        >
          Optimization Target:
        </label>
        <div
          role="radiogroup"
          aria-label="Optimization Goal Selector"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
          }}
        >
          {OPTIMIZATION_GOALS.map((goal) => {
            const isSelected = optimizationGoal === goal.value;
            return (
              <button
                key={goal.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={isPending}
                onClick={() => onOptimizationGoalChange(goal.value)}
                style={{
                  padding: '8px 10px',
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
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
                title={goal.description}
              >
                <span>{goal.icon}</span>
                <span>{goal.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar: Language selector & Test presets */}
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <label htmlFor="optimizer-language-select" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Language:
          </label>
          <select
            id="optimizer-language-select"
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
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Test Presets:</span>
          <div className="sample-pills">
            {OPTIMIZATION_SAMPLES.map((sample) => (
              <button
                key={sample.name}
                type="button"
                className="sample-pill-btn"
                onClick={() => onSelectSample(sample.code, sample.language, sample.goal)}
                disabled={isPending}
              >
                {sample.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Code Textarea */}
      <textarea
        id="optimizer-code-textarea"
        className="code-textarea"
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        placeholder={`// Paste or write ${language} code to optimize for ${optimizationGoal}...\ndef find_duplicates(items):\n    # implementation`}
        disabled={isPending}
        spellCheck="false"
        aria-label="Optimization Code Input Editor"
      />

      {/* Footer with Character Counter & Optimize Button */}
      <div className="editor-footer">
        <span
          className={`char-counter ${
            isOverLimit ? 'limit-error' : isNearLimit ? 'limit-warning' : ''
          }`}
        >
          {charCount} / {MAX_CODE_CHARS} characters
        </span>

        <Button
          id="optimizer-code-submit-btn"
          variant="primary"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
            color: '#ffffff',
            padding: '10px 24px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
          }}
          onClick={onSubmit}
          disabled={!code.trim() || isOverLimit || isPending}
          isLoading={isPending}
          aria-label="Optimize Code with AI"
        >
          <span>{isPending ? 'Optimizing with AI...' : 'Optimize Code 🚀'}</span>
        </Button>
      </div>
    </div>
  );
}

export default OptimizationInputSection;
