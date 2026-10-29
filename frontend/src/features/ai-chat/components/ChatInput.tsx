import { useState, useCallback, useRef, type KeyboardEvent } from 'react';
import { Button } from '../../../components/ui/Button';

export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isPending: boolean;
  placeholder?: string;
}

const MAX_MESSAGE_CHARS = 2000;

export function ChatInput({
  onSendMessage,
  isPending,
  placeholder = 'Ask a coding question, request an explanation, or ask follow-ups... (Enter to send, Shift+Enter for newline)',
}: ChatInputProps) {
  const [text, setText] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = text.length;
  const isOverLimit = charCount > MAX_MESSAGE_CHARS;
  const canSend = text.trim().length > 0 && !isOverLimit && !isPending;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [canSend, onSendMessage, text]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (unless Shift is pressed for newline) or on Ctrl/Cmd+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
        <textarea
          ref={textareaRef}
          id="chat-message-input"
          className="code-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isPending}
          spellCheck={true}
          rows={2}
          aria-label="Chat message input"
          style={{
            flex: 1,
            minHeight: '52px',
            maxHeight: '160px',
            resize: 'vertical',
            padding: '10px 12px',
            fontSize: '0.9rem',
            lineHeight: 1.45,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(2, 6, 23, 0.6)',
          }}
        />

        <Button
          id="send-chat-btn"
          variant="primary"
          onClick={handleSend}
          disabled={!canSend}
          isLoading={isPending}
          aria-label="Send message to AI assistant"
          style={{
            height: '42px',
            padding: '0 18px',
            fontSize: '0.86rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          <span>{isPending ? 'Thinking...' : 'Send 💬'}</span>
        </Button>
      </div>

      {/* Footer toolbar: hints & character counter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.74rem',
          color: '#64748b',
        }}
      >
        <span>
          Press <kbd style={{ padding: '1px 5px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)' }}>Enter</kbd> to send, <kbd style={{ padding: '1px 5px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)' }}>Shift+Enter</kbd> for newline
        </span>

        <span
          style={{
            fontFamily: 'var(--font-mono)',
            color: isOverLimit ? '#ef4444' : charCount > MAX_MESSAGE_CHARS * 0.85 ? '#f59e0b' : '#64748b',
          }}
        >
          {charCount} / {MAX_MESSAGE_CHARS}
        </span>
      </div>
    </div>
  );
}

export default ChatInput;
