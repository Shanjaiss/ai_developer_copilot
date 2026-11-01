import { useState } from 'react';
import type { RefactoringChatMessage } from '../../../types';

export interface RefactoringFollowUpSectionProps {
  conversation: RefactoringChatMessage[];
  isSubmitting: boolean;
  onSendFollowUp: (question: string) => void;
}

export function RefactoringFollowUpSection({
  conversation,
  isSubmitting,
  onSendFollowUp,
}: RefactoringFollowUpSectionProps) {
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
          Refactoring Follow-Up &amp; Clarification
        </h3>
      </div>

      <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Ask clarifying questions, request smaller incremental changes, or query test strategies for this refactoring session.
      </p>

      {/* Conversation Thread */}
      {conversation.length > 0 && (
        <div
          data-testid="refactoring-conversation-thread"
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
              data-testid={`refactor-dialogue-turn-${idx}`}
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
                {turn.role === 'user' ? 'Developer' : 'Refactoring Assistant'}
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
          id="refactor-followup-input"
          data-testid="refactor-followup-input"
          placeholder="e.g. Can you simplify this further? or What unit tests should I write for this?"
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
          id="refactor-followup-submit"
          data-testid="refactor-followup-submit"
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

