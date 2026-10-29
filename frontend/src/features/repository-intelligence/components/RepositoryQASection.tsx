import { useState } from 'react';
import type { RepositoryChatMessage, GroundedReference } from '../../../types/repository';
import { RepositoryGroundedReferences } from './RepositoryGroundedReferences';

export interface RepositoryQASectionProps {
  conversation: RepositoryChatMessage[];
  onAsk: (question: string) => void;
  onClear: () => void;
  isPending: boolean;
  error: Error | null;
  onRetry?: () => void;
  lastReferences: GroundedReference[];
  warnings: string[];
}

const SUGGESTED_QUERIES = [
  'Where is the application entry point?',
  'Which file configures the API client?',
  'How are API routes registered?',
  'Where is authentication implemented?',
  'Explain the flow between frontend and backend.',
];

export function RepositoryQASection({
  conversation,
  onAsk,
  onClear,
  isPending,
  error,
  onRetry,
  lastReferences,
  warnings,
}: RepositoryQASectionProps) {
  const [inputText, setInputText] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isPending) return;
    onAsk(inputText.trim());
    setInputText('');
  };

  const handleCopy = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      style={{
        background: 'rgba(30, 41, 59, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>💡</span>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>
            Repository Architecture Q&amp;A
          </h3>
        </div>

        {conversation.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '12px' }}
          >
            Clear Conversation
          </button>
        )}
      </div>

      {/* Suggested Queries */}
      {conversation.length === 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
            Suggested Architectural Queries:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {SUGGESTED_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onAsk(q)}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation Thread */}
      {conversation.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '18px',
            maxHeight: '440px',
            overflowY: 'auto',
            paddingRight: '6px',
          }}
        >
          {conversation.map((msg, index) => {
            const isUser = msg.role === 'user';
            const isLastAssistant = !isUser && index === conversation.length - 1;

            return (
              <div
                key={`${msg.role}-${index}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: isUser ? '85%' : '95%',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '4px',
                    fontSize: '11px',
                    color: isUser ? '#38bdf8' : '#a5b4fc',
                    fontWeight: 600,
                  }}
                >
                  <span>{isUser ? '👤 You' : '🤖 AI Repository Intelligence'}</span>
                </div>

                <div
                  style={{
                    background: isUser
                      ? 'rgba(56, 189, 248, 0.15)'
                      : 'rgba(15, 23, 42, 0.85)',
                    border: `1px solid ${
                      isUser
                        ? 'rgba(56, 189, 248, 0.3)'
                        : 'rgba(255, 255, 255, 0.1)'
                    }`,
                    borderRadius: '10px',
                    padding: '12px 16px',
                    color: '#f8fafc',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.content}

                  {!isUser && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.content, index)}
                        aria-label="Copy AI response"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94a3b8',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        {copiedIndex === index ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  )}

                  {isLastAssistant && lastReferences.length > 0 && (
                    <RepositoryGroundedReferences references={lastReferences} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Thinking state */}
      {isPending && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(15, 23, 42, 0.7)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#a5b4fc',
            fontSize: '13px',
          }}
        >
          <span className="spinner" style={{ display: 'inline-block' }}>⏳</span>
          Synthesizing multi-file codebase context with qwen2.5-coder:1.5b...
        </div>
      )}

      {/* Warnings Banner */}
      {warnings.length > 0 && (
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.25)',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#fef08a',
            marginBottom: '14px',
          }}
        >
          {warnings.map((w) => (
            <div key={w}>• {w}</div>
          ))}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          style={{
            padding: '10px 14px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '13px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Error: {error.message}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="btn btn-secondary"
              style={{ padding: '3px 8px', fontSize: '11px' }}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Input Dock */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask a question about multiple files or architecture (e.g. 'Where is auth handled?')..."
          aria-label="Repository question input"
          disabled={isPending}
          style={{
            flex: 1,
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '14px',
            color: '#f8fafc',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isPending}
          aria-label="Ask repository question"
          className="btn btn-primary"
          style={{ padding: '10px 18px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>🚀</span> Ask
        </button>
      </form>
    </div>
  );
}

