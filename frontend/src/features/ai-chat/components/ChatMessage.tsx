import { useState, useCallback } from 'react';
import type { ChatMessage as ChatMessageType } from '../../../types/ai';

export interface ChatMessageProps {
  message: ChatMessageType;
  index: number;
}

/**
 * Safely parses markdown code fences and inline text without dangerouslySetInnerHTML.
 */
function renderSafeMessageContent(content: string) {
  // Split on code fences: ```[lang]\n[code]\n```
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      // Extract optional language header and code body
      const inner = part.slice(3, -3);
      const newlineIdx = inner.indexOf('\n');
      let lang = '';
      let codeBody = inner;

      if (newlineIdx !== -1) {
        lang = inner.slice(0, newlineIdx).trim();
        codeBody = inner.slice(newlineIdx + 1);
      }

      return (
        <div
          key={`code-block-${i}`}
          style={{
            margin: '10px 0',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
          }}
        >
          {lang && (
            <div
              style={{
                padding: '4px 10px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                color: '#94a3b8',
                textTransform: 'uppercase',
              }}
            >
              {lang}
            </div>
          )}
          <pre
            style={{
              margin: 0,
              padding: '12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.84rem',
              lineHeight: 1.5,
              color: '#f8fafc',
              overflowX: 'auto',
              whiteSpace: 'pre',
            }}
          >
            <code>{codeBody}</code>
          </pre>
        </div>
      );
    }

    // Regular text paragraph
    return (
      <span key={`text-part-${i}`} style={{ whiteSpace: 'pre-wrap' }}>
        {part}
      </span>
    );
  });
}

export function ChatMessage({ message, index }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = message.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [message.content]);

  return (
    <div
      className={`chat-message-row ${isUser ? 'user-turn' : 'ai-turn'}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '16px',
        width: '100%',
      }}
    >
      {/* Header meta */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '4px',
          fontSize: '0.76rem',
          color: '#94a3b8',
        }}
      >
        <span style={{ fontWeight: 600, color: isUser ? '#a5b4fc' : '#34d399' }}>
          {isUser ? '👤 You' : '🤖 Antigravity AI'}
        </span>
        <span style={{ color: '#475569' }}>• Turn #{index + 1}</span>
      </div>

      {/* Bubble container */}
      <div
        style={{
          maxWidth: '85%',
          background: isUser
            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(79, 70, 229, 0.15))'
            : 'rgba(30, 41, 59, 0.7)',
          border: isUser
            ? '1px solid rgba(99, 102, 241, 0.4)'
            : '1px solid var(--border-subtle)',
          borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
          padding: '12px 16px',
          fontSize: '0.9rem',
          lineHeight: 1.55,
          color: '#f1f5f9',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          position: 'relative',
        }}
      >
        <div style={{ wordBreak: 'break-word' }}>
          {renderSafeMessageContent(message.content)}
        </div>

        {/* Action bar for assistant responses */}
        {!isUser && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              marginTop: '8px',
              paddingTop: '6px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <button
              type="button"
              className="endpoint-action-btn"
              onClick={handleCopy}
              style={{
                padding: '2px 8px',
                fontSize: '0.72rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: copied ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                borderColor: copied ? '#10b981' : 'transparent',
                color: copied ? '#34d399' : '#94a3b8',
              }}
              title="Copy response to clipboard"
            >
              <span>{copied ? '✓' : '📋'}</span>
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
