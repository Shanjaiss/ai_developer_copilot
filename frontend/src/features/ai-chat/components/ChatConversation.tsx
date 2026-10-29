import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType } from '../../../types/ai';

export interface ChatConversationProps {
  messages: ChatMessageType[];
  isPending: boolean;
  warnings?: string[];
  errorMessage?: string | null;
  onRetry?: () => void;
  onSelectPromptSuggestion?: (prompt: string) => void;
}

const PROMPT_SUGGESTIONS = [
  'Explain Python decorators with a simple example.',
  'How does async/await work under the hood in JavaScript?',
  'Why does a nested loop result in O(n²) time complexity?',
  'What is the difference between useState and useEffect in React?',
  'What edge cases should I test for a division function?',
];

export function ChatConversation({
  messages,
  isPending,
  warnings = [],
  errorMessage,
  onRetry,
  onSelectPromptSuggestion,
}: ChatConversationProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest turn on message updates or pending state
  useEffect(() => {
    if (typeof bottomRef.current?.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isPending]);

  return (
    <div
      className="card"
      style={{
        flex: 1,
        minHeight: '380px',
        maxHeight: '620px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 20px',
        marginBottom: '14px',
        background: 'rgba(15, 23, 42, 0.55)',
      }}
    >
      {/* Context Truncation Warning */}
      {warnings.length > 0 && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 14px',
            marginBottom: '14px',
            fontSize: '0.8rem',
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>⚠️</span>
          <span>{warnings.join(' ')}</span>
        </div>
      )}

      {/* Empty State with Prompt Suggestions */}
      {messages.length === 0 && (
        <div
          className="explainer-empty-state"
          style={{ margin: 'auto', textAlign: 'center', padding: '32px 16px' }}
        >
          <div className="empty-icon" style={{ fontSize: '2.4rem', marginBottom: '8px' }}>
            💬
          </div>
          <div className="empty-title" style={{ fontSize: '1.15rem', fontWeight: 600 }}>
            Antigravity Conversational Coding Assistant
          </div>
          <div
            className="empty-sub"
            style={{ maxWidth: '480px', margin: '8px auto 20px', fontSize: '0.86rem', color: '#94a3b8' }}
          >
            Ask programming questions, discuss algorithms, request debugging guidance, or paste code context to explore solutions.
          </div>

          {onSelectPromptSuggestion && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '440px', margin: '0 auto' }}>
              <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>
                Suggested Prompts:
              </span>
              {PROMPT_SUGGESTIONS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="sample-snippet-btn"
                  onClick={() => onSelectPromptSuggestion(prompt)}
                  style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    fontSize: '0.82rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(30, 41, 59, 0.6)',
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    lineHeight: 1.4,
                  }}
                >
                  💡 {prompt}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Message List */}
      {messages.map((msg, idx) => (
        <ChatMessage key={`${msg.role}-${idx}`} message={msg} index={idx} />
      ))}

      {/* In-Flight Pending Indicator */}
      {isPending && (
        <div
          className="chat-message-row ai-turn"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            marginBottom: '16px',
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px',
              fontSize: '0.76rem',
              color: '#34d399',
            }}
          >
            <span style={{ fontWeight: 600 }}>🤖 Antigravity AI</span>
            <span style={{ color: '#475569' }}>• Thinking...</span>
          </div>

          <div
            style={{
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px 12px 12px 2px',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#94a3b8',
              fontSize: '0.86rem',
            }}
          >
            <div
              style={{
                width: '14px',
                height: '14px',
                border: '2px solid rgba(52, 211, 153, 0.3)',
                borderTopColor: '#34d399',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <span>Synthesizing response with qwen2.5-coder:1.5b...</span>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            marginTop: '8px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fca5a5', fontSize: '0.85rem' }}>
            <span>🛑</span>
            <span>{errorMessage}</span>
          </div>
          {onRetry && (
            <button
              type="button"
              className="endpoint-action-btn"
              onClick={onRetry}
              style={{
                padding: '4px 10px',
                fontSize: '0.76rem',
                background: 'rgba(239, 68, 68, 0.2)',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                color: '#fee2e2',
                whiteSpace: 'nowrap',
              }}
            >
              Retry 🔄
            </button>
          )}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

export default ChatConversation;
