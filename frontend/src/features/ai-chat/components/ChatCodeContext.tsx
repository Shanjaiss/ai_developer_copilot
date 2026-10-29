import type { SupportedLanguage } from '../../../types/ai';

export interface ChatCodeContextProps {
  codeContext: string;
  language: string;
  isOpen: boolean;
  onToggleOpen: () => void;
  onCodeChange: (code: string) => void;
  onLanguageChange: (lang: string) => void;
  onClear: () => void;
  disabled?: boolean;
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

const MAX_CODE_CHARS = 5000;

export function ChatCodeContext({
  codeContext,
  language,
  isOpen,
  onToggleOpen,
  onCodeChange,
  onLanguageChange,
  onClear,
  disabled = false,
}: ChatCodeContextProps) {
  const hasContext = Boolean(codeContext.trim());
  const charCount = codeContext.length;
  const isOverLimit = charCount > MAX_CODE_CHARS;

  return (
    <div
      style={{
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(15, 23, 42, 0.65)',
        marginBottom: '12px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: hasContext ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={onToggleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleOpen();
          }
        }}
        aria-expanded={isOpen}
        aria-label="Toggle Code Context Panel"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.9rem' }}>{isOpen ? '📂' : '📁'}</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>
            Attach Code Context
          </span>
          {hasContext && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc',
                border: '1px solid rgba(99, 102, 241, 0.35)',
              }}
            >
              Active ({language} • {charCount} chars)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {hasContext && (
            <button
              type="button"
              className="endpoint-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              style={{ padding: '2px 8px', fontSize: '0.72rem' }}
              title="Remove code context"
            >
              Remove
            </button>
          )}
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            {isOpen ? '▲ Hide' : '▼ Expand'}
          </span>
        </div>
      </div>

      {isOpen && (
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-subtle)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="context-language-select" style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Language:
              </label>
              <select
                id="context-language-select"
                className="language-select"
                value={language}
                onChange={(e) => onLanguageChange(e.target.value)}
                disabled={disabled}
                aria-label="Code Context Language"
                style={{ padding: '4px 8px', fontSize: '0.78rem' }}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <span
              style={{
                fontSize: '0.74rem',
                color: isOverLimit ? '#ef4444' : '#64748b',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {charCount} / {MAX_CODE_CHARS} chars
            </span>
          </div>

          <textarea
            id="chat-code-context-input"
            className="code-textarea"
            value={codeContext}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="Paste code snippet, function definition, or traceback here to ground the conversation..."
            disabled={disabled}
            spellCheck={false}
            aria-label="Code context snippet"
            style={{
              minHeight: '120px',
              maxHeight: '240px',
              width: '100%',
              fontSize: '0.82rem',
              lineHeight: 1.45,
            }}
          />
        </div>
      )}
    </div>
  );
}

export default ChatCodeContext;
