import { useState, useRef, useCallback } from 'react';
import { useFetchQuery } from '../../hooks/api/useFetchQuery';
import { useCreateQuery } from '../../hooks/api/useCreateQuery';
import { API_ENDPOINTS } from '../../services/apiEndpoints';
import { RefactoringInputPanel } from './components/RefactoringInputPanel';
import { CodeSmellsCard } from './components/CodeSmellsCard';
import { RefactoringDiffViewer } from './components/RefactoringDiffViewer';
import { CrossFileImpactCard } from './components/CrossFileImpactCard';
import { RefactoringFollowUpSection } from './components/RefactoringFollowUpSection';
import type {
  RepositoryListResponse,
  RefactorMode,
  RefactorRequest,
  RefactorResponse,
  RefactoringChatMessage,
} from '../../types';

export function RefactoringView() {
  const [mode, setMode] = useState<RefactorMode>('pasted_code');
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('python');
  const [goal, setGoal] = useState<string>('');
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string>('');
  const [codeRange, setCodeRange] = useState<string>('');

  const [conversation, setConversation] = useState<RefactoringChatMessage[]>([]);
  const [refactorResult, setRefactorResult] = useState<RefactorResponse | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Session ID isolates in-flight requests across session resets or mode switches
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

  // 2. Refactor mutation
  const {
    mutate: executeRefactor,
    isPending: isSubmitting,
  } = useCreateQuery<RefactorResponse, RefactorRequest>({
    url: API_ENDPOINTS.AI_REFACTOR,
  });

  // Handle mode change
  const handleModeChange = useCallback((newMode: RefactorMode) => {
    sessionIdRef.current += 1;
    setMode(newMode);
    setErrorBanner(null);
  }, []);

  // Handle repository change
  const handleRepositoryChange = useCallback((newRepoId: string | null) => {
    sessionIdRef.current += 1;
    setSelectedRepoId(newRepoId);
    setErrorBanner(null);
  }, []);

  // Clear / Reset form
  const handleClear = useCallback(() => {
    sessionIdRef.current += 1;
    setCode('');
    setGoal('');
    setFilePath('');
    setCodeRange('');
    setConversation([]);
    setRefactorResult(null);
    setErrorBanner(null);
  }, []);

  // Submit initial refactor request
  const handleSubmit = useCallback(() => {
    setErrorBanner(null);
    const activeSessionId = sessionIdRef.current;

    const payload: RefactorRequest = {
      language: language !== 'auto' ? language : undefined,
      goal: goal.trim() || undefined,
      conversation: [],
    };

    if (mode === 'repository_file') {
      if (!selectedRepoId || !filePath.trim()) return;
      payload.repository_id = selectedRepoId;
      payload.file_path = filePath.trim();
      payload.code_range = codeRange.trim() || undefined;
    } else {
      if (!code.trim()) return;
      payload.code = code.trim();
    }

    executeRefactor(payload, {
      onSuccess: (data) => {
        if (sessionIdRef.current !== activeSessionId) return;
        setRefactorResult(data);
        setConversation([
          { role: 'user', content: goal.trim() ? `Refactor goal: ${goal.trim()}` : 'Analyze code for refactoring opportunities.' },
          { role: 'assistant', content: data.summary },
        ]);
      },
      onError: (err) => {
        if (sessionIdRef.current !== activeSessionId) return;
        setErrorBanner(err.message || 'Failed to complete refactoring analysis.');
      },
    });
  }, [mode, selectedRepoId, filePath, codeRange, code, language, goal, executeRefactor]);

  // Handle iterative follow-up questions
  const handleSendFollowUp = useCallback((question: string) => {
    if (!refactorResult || isSubmitting) return;

    const activeSessionId = sessionIdRef.current;
    const updatedHistory: RefactoringChatMessage[] = [
      ...conversation,
      { role: 'user', content: question },
    ];
    setConversation(updatedHistory);
    setErrorBanner(null);

    const payload: RefactorRequest = {
      language: refactorResult.language,
      goal: goal.trim() || undefined,
      conversation: updatedHistory,
    };

    if (refactorResult.mode === 'repository_file') {
      payload.repository_id = refactorResult.repository_id;
      payload.file_path = refactorResult.file_path;
      payload.code_range = codeRange.trim() || undefined;
    } else {
      payload.code = code.trim();
    }

    executeRefactor(payload, {
      onSuccess: (data) => {
        if (sessionIdRef.current !== activeSessionId) return;
        setRefactorResult(data);
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
  }, [refactorResult, isSubmitting, conversation, goal, codeRange, code, executeRefactor]);

  return (
    <div className="refactoring-view-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
      {/* Input Form Panel */}
      <RefactoringInputPanel
        mode={mode}
        onModeChange={handleModeChange}
        code={code}
        onCodeChange={setCode}
        language={language}
        onLanguageChange={setLanguage}
        goal={goal}
        onGoalChange={setGoal}
        repositoryId={selectedRepoId}
        onRepositoryIdChange={handleRepositoryChange}
        filePath={filePath}
        onFilePathChange={setFilePath}
        codeRange={codeRange}
        onCodeRangeChange={setCodeRange}
        repositories={repositories}
        isLoadingRepos={isLoadingRepos}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onClear={handleClear}
      />

      {/* Error Banner */}
      {errorBanner && (
        <div
          data-testid="refactor-error-banner"
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
      {refactorResult && (
        <div data-testid="refactor-results-section">
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
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                }}
              >
                {refactorResult.mode === 'repository_file' ? 'Repository File Refactor' : 'Pasted Code Refactor'}
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
                {refactorResult.language}
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
                Model: {refactorResult.model}
              </span>

              {refactorResult.repository_id && (
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
                  📁 {refactorResult.repository_id}: {refactorResult.file_path}
                </span>
              )}
            </div>

            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {refactorResult.summary}
            </p>
          </div>

          {/* Code Smells Card */}
          <CodeSmellsCard smells={refactorResult.code_smells} />

          {/* Refactoring Proposals & Diff Comparison */}
          <RefactoringDiffViewer
            refactorings={refactorResult.refactorings}
            language={refactorResult.language}
          />

          {/* Cross-File Impact (in repository mode) */}
          {refactorResult.cross_file_impacts && refactorResult.cross_file_impacts.length > 0 && (
            <CrossFileImpactCard impacts={refactorResult.cross_file_impacts} />
          )}

          {/* Warnings & Advisory Notices */}
          {refactorResult.warnings && refactorResult.warnings.length > 0 && (
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
                ⚠️ Advisory Notices &amp; Limitations:
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {refactorResult.warnings.map((w, wIdx) => (
                  <li key={wIdx} style={{ marginBottom: '2px' }}>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Follow-up Dialogue */}
          <RefactoringFollowUpSection
            conversation={conversation}
            isSubmitting={isSubmitting}
            onSendFollowUp={handleSendFollowUp}
          />
        </div>
      )}
    </div>
  );
}

export default RefactoringView;

