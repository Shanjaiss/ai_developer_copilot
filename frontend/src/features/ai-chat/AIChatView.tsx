import { useState, useCallback, useRef } from 'react';
import { useCreateQuery } from '../../hooks/api/useCreateQuery';
import { API_ENDPOINTS } from '../../services/apiEndpoints';
import { ChatConversation } from './components/ChatConversation';
import { ChatCodeContext } from './components/ChatCodeContext';
import { ChatInput } from './components/ChatInput';
import type { ChatMessage, ChatRequest, ChatResponse } from '../../types/ai';

export function AIChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [codeContext, setCodeContext] = useState<string>('');
  const [contextLanguage, setContextLanguage] = useState<string>('python');
  const [isContextOpen, setIsContextOpen] = useState<boolean>(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  // Session ID tracks conversation instance to isolate in-flight responses on reset
  const sessionIdRef = useRef<number>(1);

  const {
    mutate: sendChatMessage,
    isPending,
    error,
    reset: resetMutation,
  } = useCreateQuery<ChatResponse, ChatRequest>({
    url: API_ENDPOINTS.AI_CHAT,
  });

  const handleSendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isPending) return;

      const currentSessionId = sessionIdRef.current;
      const historySnapshot = [...messages];
      const newUserMessage: ChatMessage = { role: 'user', content: text.trim() };

      setMessages((prev) => [...prev, newUserMessage]);
      setLastFailedMessage(null);
      resetMutation();

      sendChatMessage(
        {
          message: text.trim(),
          language: codeContext.trim() ? contextLanguage : undefined,
          code_context: codeContext.trim() || undefined,
          conversation: historySnapshot,
        },
        {
          onSuccess: (data) => {
            // Guarantee in-flight isolation: ignore late response if conversation was reset
            if (sessionIdRef.current !== currentSessionId) return;

            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: data.reply },
            ]);
            if (data.warnings && data.warnings.length > 0) {
              setWarnings(data.warnings);
            }
          },
          onError: () => {
            if (sessionIdRef.current !== currentSessionId) return;
            setLastFailedMessage(text.trim());
          },
        }
      );
    },
    [messages, isPending, codeContext, contextLanguage, sendChatMessage, resetMutation]
  );

  const handleNewConversation = useCallback(() => {
    sessionIdRef.current += 1;
    setMessages([]);
    setWarnings([]);
    setLastFailedMessage(null);
    resetMutation();
  }, [resetMutation]);

  const handleClearContext = useCallback(() => {
    setCodeContext('');
  }, []);

  const handleRetry = useCallback(() => {
    if (!lastFailedMessage || isPending) return;
    // Pop the failed user message before resending to avoid duplicate turn
    setMessages((prev) => prev.slice(0, -1));
    handleSendMessage(lastFailedMessage);
  }, [lastFailedMessage, isPending, handleSendMessage]);

  return (
    <div>
      {/* Hero Banner */}
      <section className="hero-banner" style={{ padding: '24px 28px', marginBottom: '20px' }}>
        <div className="hero-content">
          <span
            className="hero-tag"
            style={{
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#a5b4fc',
              borderColor: 'rgba(99, 102, 241, 0.3)',
            }}
          >
            Phase 6 • Conversational AI Assistant
          </span>
          <h2 style={{ fontSize: '1.6rem' }}>Conversational Coding Assistant &amp; Pair Programmer</h2>
          <p style={{ fontSize: '0.92rem', maxWidth: '820px' }}>
            Powered by local <strong style={{ color: '#a5b4fc' }}>qwen2.5-coder:1.5b</strong> running on Ollama.
            Engage in multi-turn dialogues for algorithmic problem solving, code debugging, architectural trade-offs, and testing strategies with bounded conversation memory.
          </p>
        </div>
      </section>

      {/* Chat Workspace Card */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
        {/* Chat Control Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '12px',
            marginBottom: '12px',
            borderBottom: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>💬</span>
            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f8fafc' }}>
              Active Dialogue
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              {messages.length} {messages.length === 1 ? 'Message' : 'Messages'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
              Model: qwen2.5-coder:1.5b
            </span>

            <button
              type="button"
              id="new-chat-btn"
              className="endpoint-action-btn"
              onClick={handleNewConversation}
              disabled={messages.length === 0 && !codeContext}
              style={{
                padding: '4px 12px',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Clear active conversation and start fresh"
            >
              <span>✨</span>
              <span>New Conversation</span>
            </button>
          </div>
        </div>

        {/* Optional Code Context Drawer */}
        <ChatCodeContext
          codeContext={codeContext}
          language={contextLanguage}
          isOpen={isContextOpen}
          onToggleOpen={() => setIsContextOpen((prev) => !prev)}
          onCodeChange={setCodeContext}
          onLanguageChange={setContextLanguage}
          onClear={handleClearContext}
          disabled={isPending}
        />

        {/* Conversation Stream */}
        <ChatConversation
          messages={messages}
          isPending={isPending}
          warnings={warnings}
          errorMessage={error ? error.message : null}
          onRetry={handleRetry}
          onSelectPromptSuggestion={handleSendMessage}
        />

        {/* Input Dock */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isPending={isPending}
        />
      </div>
    </div>
  );
}

export default AIChatView;
