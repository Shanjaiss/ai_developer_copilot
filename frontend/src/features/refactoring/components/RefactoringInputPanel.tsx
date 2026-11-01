import type { ApprovedRepository, RefactorMode } from '../../../types';

interface RefactorPreset {
  name: string;
  code: string;
  language: string;
  goal: string;
}

const REFACTOR_PRESETS: RefactorPreset[] = [
  {
    name: 'Python: Nested Discount Logic',
    code: `def calculate_invoice_total(order, customer):
    total = 0
    for item in order.items:
        if item.quantity > 0:
            if item.price > 0:
                total += item.price * item.quantity
    if customer.is_vip:
        if total > 500:
            total = total * 0.85
        elif total > 100:
            total = total * 0.90
    elif customer.is_partner:
        if total > 200:
            total = total * 0.92
    return round(total, 2)`,
    language: 'python',
    goal: 'Extract discount rules and price calculation into focused pure functions.',
  },
  {
    name: 'JS: Nested Ternary Elimination',
    code: `function getPermissionLevel(user, resource) {
  return !user ? 'guest' : user.isAdmin ? 'admin' : resource.isPublic ? 'viewer' : user.id === resource.ownerId ? 'editor' : 'forbidden';
}`,
    language: 'javascript',
    goal: 'Replace deeply nested ternary operator with readable guard clauses.',
  },
  {
    name: 'TS: Duplicate Validation',
    code: `interface UserForm {
  username?: string;
  email?: string;
  age?: number;
}

export function validateForm(form: UserForm): string[] {
  const errors: string[] = [];
  if (!form.username || form.username.trim() === '') {
    errors.push('Username is required');
  }
  if (!form.email || form.email.trim() === '') {
    errors.push('Email is required');
  } else if (!form.email.includes('@')) {
    errors.push('Email must be valid');
  }
  if (form.age !== undefined && form.age !== null) {
    if (form.age < 18) {
      errors.push('Must be at least 18');
    }
  }
  return errors;
}`,
    language: 'typescript',
    goal: 'Extract reusable validation schema and field rules.',
  },
  {
    name: 'React: Monolithic Component',
    code: `export function UserProfileCard({ user, onUpdate }: { user: any; onUpdate: any }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate({ name, email });
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="card">
      {editing ? (
        <div>
          <input value={name} onChange={e => setName(e.target.value)} />
          <input value={email} onChange={e => setEmail(e.target.value)} />
          <button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          <button onClick={() => setEditing(false)}>Cancel</button>
        </div>
      ) : (
        <div>
          <h3>{user.name}</h3>
          <p>{user.email}</p>
          <button onClick={() => setEditing(true)}>Edit Profile</button>
        </div>
      )}
    </div>
  );
}`,
    language: 'typescript',
    goal: 'Extract edit form into a dedicated sub-component and manage state cleanly.',
  },
];

export interface RefactoringInputPanelProps {
  mode: RefactorMode;
  onModeChange: (mode: RefactorMode) => void;
  code: string;
  onCodeChange: (code: string) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  goal: string;
  onGoalChange: (goal: string) => void;
  repositoryId: string | null;
  onRepositoryIdChange: (repoId: string | null) => void;
  filePath: string;
  onFilePathChange: (path: string) => void;
  codeRange: string;
  onCodeRangeChange: (range: string) => void;
  repositories: ApprovedRepository[];
  isLoadingRepos: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  onClear: () => void;
}

export function RefactoringInputPanel({
  mode,
  onModeChange,
  code,
  onCodeChange,
  language,
  onLanguageChange,
  goal,
  onGoalChange,
  repositoryId,
  onRepositoryIdChange,
  filePath,
  onFilePathChange,
  codeRange,
  onCodeRangeChange,
  repositories,
  isLoadingRepos,
  isSubmitting,
  onSubmit,
  onClear,
}: RefactoringInputPanelProps) {
  const handleApplyPreset = (preset: RefactorPreset) => {
    onModeChange('pasted_code');
    onCodeChange(preset.code);
    onLanguageChange(preset.language);
    onGoalChange(preset.goal);
  };

  const isFormValid =
    mode === 'pasted_code'
      ? code.trim().length > 0
      : Boolean(repositoryId && filePath.trim().length > 0);

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            🔄 AI Code Refactoring Assistant
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Detect code smells, generate maintainable refactorings, and inspect deterministic before/after diffs.
          </p>
        </div>

        {/* Quick Presets (Pasted Mode) */}
        {mode === 'pasted_code' && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Presets:</span>
            {REFACTOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="btn-preset"
                style={{
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
                onClick={() => handleApplyPreset(preset)}
                disabled={isSubmitting}
              >
                {preset.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mode Switcher Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          type="button"
          data-testid="mode-pasted-btn"
          onClick={() => onModeChange('pasted_code')}
          disabled={isSubmitting}
          style={{
            padding: '8px 18px',
            borderRadius: '6px',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: mode === 'pasted_code' ? '1px solid var(--accent-color, #38bdf8)' : '1px solid var(--border-subtle)',
            background: mode === 'pasted_code' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-secondary)',
            color: mode === 'pasted_code' ? 'var(--accent-color, #38bdf8)' : 'var(--text-secondary)',
          }}
        >
          📝 Pasted Code Mode
        </button>
        <button
          type="button"
          data-testid="mode-repo-btn"
          onClick={() => onModeChange('repository_file')}
          disabled={isSubmitting}
          style={{
            padding: '8px 18px',
            borderRadius: '6px',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: mode === 'repository_file' ? '1px solid var(--accent-color, #38bdf8)' : '1px solid var(--border-subtle)',
            background: mode === 'repository_file' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-secondary)',
            color: mode === 'repository_file' ? 'var(--accent-color, #38bdf8)' : 'var(--text-secondary)',
          }}
        >
          📁 Repository File Mode
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isFormValid) onSubmit();
        }}
      >
        {mode === 'pasted_code' ? (
          <>
            {/* Language & Goal Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label
                  htmlFor="refactor-language-select"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
                >
                  Programming Language
                </label>
                <select
                  id="refactor-language-select"
                  data-testid="refactor-language-select"
                  value={language}
                  onChange={(e) => onLanguageChange(e.target.value)}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                  }}
                >
                  <option value="python">Python</option>
                  <option value="typescript">TypeScript</option>
                  <option value="javascript">JavaScript</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="sql">SQL</option>
                  <option value="bash">Bash</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="refactor-goal-input"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
                >
                  Refactoring Objective (Optional)
                </label>
                <input
                  type="text"
                  id="refactor-goal-input"
                  data-testid="refactor-goal-input"
                  placeholder="e.g. Extract validation logic, simplify conditionals..."
                  value={goal}
                  onChange={(e) => onGoalChange(e.target.value)}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                  }}
                />
              </div>
            </div>

            {/* Code Input */}
            <div style={{ marginBottom: '20px' }}>
              <label
                htmlFor="refactor-code-input"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
              >
                Source Code to Refactor <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                id="refactor-code-input"
                data-testid="refactor-code-input"
                rows={10}
                placeholder="Paste the source code you want to analyze and refactor..."
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                disabled={isSubmitting}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.86rem',
                  resize: 'vertical',
                }}
              />
            </div>
          </>
        ) : (
          <>
            {/* Repository Mode Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label
                  htmlFor="refactor-repo-select"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
                >
                  Approved Repository <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  id="refactor-repo-select"
                  data-testid="refactor-repo-select"
                  value={repositoryId || ''}
                  onChange={(e) => onRepositoryIdChange(e.target.value || null)}
                  disabled={isSubmitting || isLoadingRepos}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                  }}
                >
                  <option value="">Select an approved repository...</option>
                  {repositories.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      📁 {repo.name} ({repo.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="refactor-file-path-input"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
                >
                  Repository File Path <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  id="refactor-file-path-input"
                  data-testid="refactor-file-path-input"
                  placeholder="e.g. backend/app/routers/users.py"
                  value={filePath}
                  onChange={(e) => onFilePathChange(e.target.value)}
                  disabled={isSubmitting}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="refactor-code-range-input"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
                >
                  Code Line Range (Optional)
                </label>
                <input
                  type="text"
                  id="refactor-code-range-input"
                  data-testid="refactor-code-range-input"
                  placeholder="e.g. 10-50"
                  value={codeRange}
                  onChange={(e) => onCodeRangeChange(e.target.value)}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                htmlFor="refactor-repo-goal-input"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
              >
                Refactoring Objective (Optional)
              </label>
              <input
                type="text"
                id="refactor-repo-goal-input"
                data-testid="refactor-repo-goal-input"
                placeholder="e.g. Extract helper functions, isolate business logic..."
                value={goal}
                onChange={(e) => onGoalChange(e.target.value)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                }}
              />
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="submit"
            id="refactor-submit-btn"
            data-testid="refactor-submit-btn"
            disabled={isSubmitting || !isFormValid}
            className="btn btn-primary"
            style={{
              padding: '10px 24px',
              fontSize: '0.9rem',
              fontWeight: 600,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: isSubmitting || !isFormValid ? 'not-allowed' : 'pointer',
              opacity: isSubmitting || !isFormValid ? 0.6 : 1,
            }}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true">⏳</span>
                <span>Analyzing &amp; Refactoring...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Analyze &amp; Refactor</span>
              </>
            )}
          </button>

          <button
            type="button"
            id="refactor-clear-btn"
            data-testid="refactor-clear-btn"
            onClick={onClear}
            disabled={isSubmitting}
            className="btn btn-secondary"
            style={{
              padding: '10px 18px',
              fontSize: '0.88rem',
              borderRadius: '8px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
