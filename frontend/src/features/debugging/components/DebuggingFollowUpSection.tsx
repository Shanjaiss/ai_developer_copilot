import { useState } from 'react';
import type { DebugChatMessage } from '../../../types';

export interface DebuggingFollowUpSectionProps {
  conversation: DebugChatMessage[];
  isSubmitting: boolean;
  onSendFollowUp: (question: string) => void;
}

export function DebuggingFollowUpSection({
  conversation,
  isSubmitting,
  onSendFollowUp,
}: DebuggingFollowUpSectionProps) {
  const [followUpText, setFollowUpText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = followUpText.trim();
    if (!trimmed || isSubmitting) return;
    onSendFollowUp(trimmed);
    setFollowUpText('');
  };

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '1.2rem' }}>💬</span>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Iterative Debugging Dialogue
        </h3>
      </div>

      <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Ask clarifying questions or request alternative fix strategies for this specific error session.
      </p>

      {/* Conversation Thread */}
      {conversation.length > 0 && (
        <div
          data-testid="debugging-conversation-thread"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginBottom: '20px',
            maxHeight: '400px',
            overflowY: 'auto',
            paddingRight: '6px',
          }}
        >
          {conversation.map((turn, idx) => (
            <div
              key={idx}
              data-testid={`debug-dialogue-turn-${idx}`}
              style={{
                alignSelf: turn.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '12px 16px',
                borderRadius: '8px',
                background: turn.role === 'user' ? 'var(--accent-color, #0284c7)' : 'var(--bg-secondary)',
                color: turn.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                border: turn.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  marginBottom: '4px',
                  color: turn.role === 'user' ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)',
                }}
              >
                {turn.role === 'user' ? 'Developer' : 'Debugging Assistant'}
              </div>
              {turn.content}
            </div>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          id="debug-followup-input"
          data-testid="debug-followup-input"
          placeholder="e.g. Can you provide an alternative fix using Pydantic? or How do I write a test for this?"
          value={followUpText}
          onChange={(e) => setFollowUpText(e.target.value)}
          disabled={isSubmitting}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '0.88rem',
          }}
        />
        <button
          type="submit"
          id="debug-followup-submit"
          data-testid="debug-followup-submit"
          disabled={isSubmitting || !followUpText.trim()}
          className="btn btn-primary"
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            cursor: isSubmitting || !followUpText.trim() ? 'not-allowed' : 'pointer',
            opacity: isSubmitting || !followUpText.trim() ? 0.6 : 1,
          }}
        >
          {isSubmitting ? 'Thinking...' : 'Ask Follow-up'}
        </button>
      </form>
    </div>
  );
}

