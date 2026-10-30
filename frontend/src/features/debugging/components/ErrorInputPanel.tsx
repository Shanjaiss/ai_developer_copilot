import { useState } from 'react';
import type { ApprovedRepository } from '../../../types';

interface DebugPreset {
  name: string;
  errorMessage: string;
  stackTrace: string;
  codeContext: string;
  language: string;
}

const DEBUG_PRESETS: DebugPreset[] = [
  {
    name: 'Python KeyError',
    errorMessage: "KeyError: 'user_id'",
    stackTrace: `Traceback (most recent call last):
  File "user_service.py", line 42, in get_user
    user_id = data["user_id"]
KeyError: 'user_id'`,
    codeContext: `def get_user(data: dict):
    # Retrieve user record
    user_id = data["user_id"]
    return db.query(User).filter(User.id == user_id).first()`,
    language: 'python',
  },
  {
    name: 'JS TypeError: undefined.map',
    errorMessage: "TypeError: Cannot read properties of undefined (reading 'map')",
    stackTrace: `TypeError: Cannot read properties of undefined (reading 'map')
    at UserList (src/components/UserList.tsx:18:24)
    at renderWithHooks (node_modules/react-dom/cjs/react-dom.development.js:14985:18)`,
    codeContext: `export function UserList({ users }: { users?: User[] }) {
  return (
    <ul className="user-list">
      {users.map(u => <li key={u.id}>{u.name}</li>)}
    </ul>
  );
}`,
    language: 'typescript',
  },
  {
    name: 'FastAPI 422 ValidationError',
    errorMessage: "422 Unprocessable Entity: [{'loc': ['body', 'email'], 'msg': 'value is not a valid email', 'type': 'value_error.email'}]",
    stackTrace: `fastapi.exceptions.RequestValidationError: 1 validation error for CreateUserRequest
body -> email
  value is not a valid email (type=value_error.email)`,
    codeContext: `from pydantic import BaseModel, EmailStr

class CreateUserRequest(BaseModel):
    name: str
    email: EmailStr`,
    language: 'python',
  },
  {
    name: 'React Too Many Re-Renders',
    errorMessage: 'Error: Too many re-renders. React limits the number of renders to prevent an infinite loop.',
    stackTrace: `Error: Too many re-renders. React limits the number of renders to prevent an infinite loop.
    at renderWithHooks (react-dom.development.js:16305:1)
    at mountIndeterminateComponent (react-dom.development.js:20074:1)
    at Dashboard (Dashboard.tsx:24:5)`,
    codeContext: `export function Dashboard() {
  const [count, setCount] = useState(0);
  // Uncontrolled state setter inside render body
  setCount(count + 1);
  return <div>Count: {count}</div>;
}`,
    language: 'typescript',
  },
];

export interface ErrorInputPanelProps {
  errorMessage: string;
  onErrorMessageChange: (val: string) => void;
  stackTrace: string;
  onStackTraceChange: (val: string) => void;
  codeContext: string;
  onCodeContextChange: (val: string) => void;
  language: string;
  onLanguageChange: (val: string) => void;
  repositoryId: string | null;
  onRepositoryIdChange: (val: string | null) => void;
  repositories: ApprovedRepository[];
  isLoadingRepos: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  onClear: () => void;
}

export function ErrorInputPanel({
  errorMessage,
  onErrorMessageChange,
  stackTrace,
  onStackTraceChange,
  codeContext,
  onCodeContextChange,
  language,
  onLanguageChange,
  repositoryId,
  onRepositoryIdChange,
  repositories,
  isLoadingRepos,
  isSubmitting,
  onSubmit,
  onClear,
}: ErrorInputPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(true);

  const handleApplyPreset = (preset: DebugPreset) => {
    onErrorMessageChange(preset.errorMessage);
    onStackTraceChange(preset.stackTrace);
    onCodeContextChange(preset.codeContext);
    onLanguageChange(preset.language);
  };

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            🐛 AI Bug Detection &amp; Debugging
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Paste an error message or stack trace to receive root cause hypotheses and verified code fixes.
          </p>
        </div>

        {/* Quick Presets */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Presets:</span>
          {DEBUG_PRESETS.map((preset) => (
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
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {/* Error Message Input (Primary) */}
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="debug-error-message"
            style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
          >
            Error Message / Exception <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            id="debug-error-message"
            data-testid="debug-error-message"
            rows={3}
            placeholder="e.g. KeyError: 'user_id' or TypeError: Cannot read properties of undefined"
            value={errorMessage}
            onChange={(e) => onErrorMessageChange(e.target.value)}
            disabled={isSubmitting}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.88rem',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Configuration Row: Language & Repository */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label
              htmlFor="debug-language-select"
              style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
            >
              Language / Framework
            </label>
            <select
              id="debug-language-select"
              data-testid="debug-language-select"
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
              <option value="auto">Auto-detect from trace</option>
              <option value="python">Python</option>
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="sql">SQL</option>
              <option value="bash">Bash / Shell</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="debug-repository-select"
              style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
            >
              Repository Grounding (Optional)
            </label>
            <select
              id="debug-repository-select"
              data-testid="debug-repository-select"
              value={repositoryId || ''}
              onChange={(e) => onRepositoryIdChange(e.target.value ? e.target.value : null)}
              disabled={isSubmitting || isLoadingRepos}
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
              <option value="">None (Standalone Debugging)</option>
              {repositories.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  📁 {repo.name} ({repo.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggle Advanced Context: Stack Trace & Code Context */}
        <div style={{ marginBottom: '16px' }}>
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-color, #38bdf8)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <span>{showAdvanced ? '▼' : '▶'}</span>
            <span>{showAdvanced ? 'Hide Stack Trace & Code Context' : 'Add Stack Trace or Code Context'}</span>
          </button>
        </div>

        {showAdvanced && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label
                htmlFor="debug-stack-trace"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
              >
                Stack Trace / Traceback (Optional)
              </label>
              <textarea
                id="debug-stack-trace"
                data-testid="debug-stack-trace"
                rows={6}
                placeholder="Paste full multi-line traceback or stack trace..."
                value={stackTrace}
                onChange={(e) => onStackTraceChange(e.target.value)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                  resize: 'vertical',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="debug-code-context"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
              >
                Surrounding Code Context (Optional)
              </label>
              <textarea
                id="debug-code-context"
                data-testid="debug-code-context"
                rows={6}
                placeholder="Paste surrounding function or relevant code snippet..."
                value={codeContext}
                onChange={(e) => onCodeContextChange(e.target.value)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="submit"
            id="debug-submit-btn"
            data-testid="debug-submit-btn"
            disabled={isSubmitting || !errorMessage.trim()}
            className="btn btn-primary"
            style={{
              padding: '10px 24px',
              fontSize: '0.9rem',
              fontWeight: 600,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: isSubmitting || !errorMessage.trim() ? 'not-allowed' : 'pointer',
              opacity: isSubmitting || !errorMessage.trim() ? 0.6 : 1,
            }}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true">⏳</span>
                <span>Analyzing &amp; Investigating...</span>
              </>
            ) : (
              <>
                <span>🔍</span>
                <span>Analyze &amp; Debug</span>
              </>
            )}
          </button>

          <button
            type="button"
            id="debug-clear-btn"
            data-testid="debug-clear-btn"
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
