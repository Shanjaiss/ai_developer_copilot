import { useState, useRef, useCallback } from 'react';
import { useFetchQuery } from '../../hooks/api/useFetchQuery';
import { useCreateQuery } from '../../hooks/api/useCreateQuery';
import { API_ENDPOINTS } from '../../services/apiEndpoints';
import { ErrorInputPanel } from './components/ErrorInputPanel';
import { RootCauseCard } from './components/RootCauseCard';
import { SuggestedFixCard } from './components/SuggestedFixCard';
import { DebuggingEvidenceViewer } from './components/DebuggingEvidenceViewer';
import { DebuggingFollowUpSection } from './components/DebuggingFollowUpSection';
import type {
  RepositoryListResponse,
  DebugRequest,
  DebugResponse,
  DebugChatMessage,
} from '../../types';

export function DebuggingView() {
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [stackTrace, setStackTrace] = useState<string>('');
  const [codeContext, setCodeContext] = useState<string>('');
  const [language, setLanguage] = useState<string>('auto');
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);

  const [conversation, setConversation] = useState<DebugChatMessage[]>([]);
  const [debugResult, setDebugResult] = useState<DebugResponse | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Session ID isolates in-flight requests across session resets or repository switches
  const sessionIdRef = useRef<number>(1);

  // 1. Fetch server-approved repositories list
  const {
    data: repoListData,
    isLoading: isLoadingRepos,
  } = useFetchQuery<RepositoryListResponse>({
    queryKey: ['repositories'],
    url: API_ENDPOINTS.REPOSITORIES,
  });

  const repositories = repoListData?.repositories || [];

  // 2. Debug mutation
  const {
    mutate: executeDebug,
    isPending: isSubmitting,
  } = useCreateQuery<DebugResponse, DebugRequest>({
    url: API_ENDPOINTS.AI_DEBUG,
  });

  // Handle repository change with session isolation
  const handleRepositoryChange = useCallback((newRepoId: string | null) => {
    sessionIdRef.current += 1;
    setSelectedRepoId(newRepoId);
    setErrorBanner(null);
  }, []);

  // Clear / Reset form
  const handleClear = useCallback(() => {
    sessionIdRef.current += 1;
    setErrorMessage('');
    setStackTrace('');
    setCodeContext('');
    setLanguage('auto');
    setConversation([]);
    setDebugResult(null);
    setErrorBanner(null);
  }, []);

  // Submit initial debug request
  const handleSubmit = useCallback(() => {
    const trimmedError = errorMessage.trim();
    if (!trimmedError) return;

    setErrorBanner(null);
    const activeSessionId = sessionIdRef.current;

    const payload: DebugRequest = {
      error_message: trimmedError,
      stack_trace: stackTrace.trim() || undefined,
      language: language !== 'auto' ? language : undefined,
      code_context: codeContext.trim() || undefined,
      repository_id: selectedRepoId || undefined,
      conversation: [],
    };

    executeDebug(payload, {
      onSuccess: (data) => {
        if (sessionIdRef.current !== activeSessionId) return;
        setDebugResult(data);
        setConversation([
          { role: 'user', content: trimmedError },
          { role: 'assistant', content: data.summary },
        ]);
      },
      onError: (err) => {
        if (sessionIdRef.current !== activeSessionId) return;
        setErrorBanner(err.message || 'Failed to complete debugging analysis. Please check that Ollama is running.');
      },
    });
  }, [errorMessage, stackTrace, codeContext, language, selectedRepoId, executeDebug]);

  // Handle iterative follow-up questions
  const handleSendFollowUp = useCallback((question: string) => {
    if (!debugResult || isSubmitting) return;

    const activeSessionId = sessionIdRef.current;
    const updatedHistory: DebugChatMessage[] = [
      ...conversation,
      { role: 'user', content: question },
    ];
    setConversation(updatedHistory);
    setErrorBanner(null);

    const payload: DebugRequest = {
      error_message: errorMessage.trim(),
      stack_trace: stackTrace.trim() || undefined,
      language: debugResult.language,
      code_context: codeContext.trim() || undefined,
      repository_id: selectedRepoId || undefined,
      conversation: updatedHistory,
    };

    executeDebug(payload, {
      onSuccess: (data) => {
        if (sessionIdRef.current !== activeSessionId) return;
        setDebugResult(data);
        setConversation((prev) => [
          ...prev,
          { role: 'assistant', content: data.summary },
        ]);
      },
      onError: (err) => {
        if (sessionIdRef.current !== activeSessionId) return;
        setErrorBanner(err.message || 'Failed to generate follow-up answer.');
      },
    });
  }, [debugResult, isSubmitting, conversation, errorMessage, stackTrace, codeContext, selectedRepoId, executeDebug]);

  return (
    <div className="debugging-view-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
      {/* Input Form Panel */}
      <ErrorInputPanel
        errorMessage={errorMessage}
        onErrorMessageChange={setErrorMessage}
        stackTrace={stackTrace}
        onStackTraceChange={setStackTrace}
        codeContext={codeContext}
        onCodeContextChange={setCodeContext}
        language={language}
        onLanguageChange={setLanguage}
        repositoryId={selectedRepoId}
        onRepositoryIdChange={handleRepositoryChange}
        repositories={repositories}
        isLoadingRepos={isLoadingRepos}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onClear={handleClear}
      />

      {/* Error Banner */}
      {errorBanner && (
        <div
          data-testid="debug-error-banner"
          style={{
            padding: '16px 20px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div>
            <strong>Error:</strong> {errorBanner}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Results Section */}
      {debugResult && (
        <div data-testid="debug-results-section">
          {/* Diagnostic Header Overview */}
          <div
            className="card"
            style={{
              padding: '20px 24px',
              marginBottom: '24px',
              borderLeft: '4px solid var(--accent-color, #38bdf8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                }}
              >
                {debugResult.error_type}
              </span>

              <span
                style={{
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                }}
              >
                {debugResult.language}
              </span>

              <span
                style={{
                  fontSize: '0.78rem',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-muted)',
                }}
              >
                Model: {debugResult.model}
              </span>

              {debugResult.repository_used ? (
                <span
                  style={{
                    fontSize: '0.78rem',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    fontWeight: 600,
                  }}
                >
                  📁 Repo: {debugResult.repository_used}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '0.78rem',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-muted)',
                  }}
                >
                  Standalone Analysis
                </span>
              )}
            </div>

            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {debugResult.summary}
            </p>
          </div>

          {/* Root Causes */}
          <RootCauseCard hypotheses={debugResult.root_causes} />

          {/* Suggested Fixes */}
          <SuggestedFixCard fixes={debugResult.suggested_fixes} language={debugResult.language} />

          {/* Evidence & Grounded References */}
          <DebuggingEvidenceViewer
            references={debugResult.references}
            parsedFrames={debugResult.parsed_frames}
          />

          {/* Warnings and Disclaimers */}
          {debugResult.warnings && debugResult.warnings.length > 0 && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                marginBottom: '24px',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f59e0b', marginBottom: '4px' }}>
                ⚠️ Advisory Notices &amp; Limits:
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {debugResult.warnings.map((w, wIdx) => (
                  <li key={wIdx} style={{ marginBottom: '2px' }}>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Follow-up Dialogue */}
          <DebuggingFollowUpSection
            conversation={conversation}
            isSubmitting={isSubmitting}
            onSendFollowUp={handleSendFollowUp}
          />
        </div>
      )}
    </div>
  );
}

export default DebuggingView;

