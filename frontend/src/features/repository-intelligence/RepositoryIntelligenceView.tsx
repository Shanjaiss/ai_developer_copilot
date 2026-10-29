import { useState, useEffect, useCallback, useRef } from 'react';
import { useFetchQuery } from '../../hooks/api/useFetchQuery';
import { useCreateQuery } from '../../hooks/api/useCreateQuery';
import { API_ENDPOINTS } from '../../services/apiEndpoints';
import { RepositorySelector } from './components/RepositorySelector';
import { RepositoryOverviewCard } from './components/RepositoryOverviewCard';
import { RepositoryFileTree } from './components/RepositoryFileTree';
import { RepositoryDependencyViewer } from './components/RepositoryDependencyViewer';
import { RepositoryQASection } from './components/RepositoryQASection';
import type {
  RepositoryListResponse,
  RepositoryScanResponse,
  RepositoryAskRequest,
  RepositoryAskResponse,
  RepositoryChatMessage,
  RepositoryDependenciesRequest,
  RepositoryDependenciesResponse,
  GroundedReference,
} from '../../types/repository';

export function RepositoryIntelligenceView() {
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [conversation, setConversation] = useState<RepositoryChatMessage[]>([]);
  const [lastReferences, setLastReferences] = useState<GroundedReference[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(null);

  // Session ID isolates in-flight responses across repository switches or resets
  const sessionIdRef = useRef<number>(1);

  // 1. Fetch approved repositories list
  const {
    data: repoListData,
    isLoading: isRepoListLoading,
    error: repoListError,
  } = useFetchQuery<RepositoryListResponse>({
    queryKey: ['repositories'],
    url: API_ENDPOINTS.REPOSITORIES,
  });

  // Derive active repository id without setState in effect
  const activeRepoId = selectedRepoId ?? (repoListData?.repositories?.[0]?.id || null);

  // 2. Scan / Tree query
  const {
    data: scanData,
    mutate: executeScan,
    isPending: isScanning,
    error: scanError,
  } = useCreateQuery<RepositoryScanResponse, void>({
    url: activeRepoId ? API_ENDPOINTS.REPOSITORY_SCAN(activeRepoId) : '',
  });

  // Auto-scan whenever selected repository changes
  useEffect(() => {
    if (activeRepoId) {
      executeScan(undefined as void);
    }
  }, [activeRepoId, executeScan]);

  // 3. File dependency inspection query
  const {
    data: depData,
    mutate: fetchDependencies,
    isPending: isDepLoading,
    error: depError,
  } = useCreateQuery<RepositoryDependenciesResponse, RepositoryDependenciesRequest>({
    url: activeRepoId ? API_ENDPOINTS.REPOSITORY_DEPENDENCIES(activeRepoId) : '',
  });

  // Fetch dependencies whenever a file is selected
  const handleSelectFile = useCallback(
    (filePath: string) => {
      setSelectedFilePath(filePath);
      if (activeRepoId) {
        fetchDependencies({ path: filePath });
      }
    },
    [activeRepoId, fetchDependencies]
  );

  // 4. Repository Q&A query
  const {
    mutate: askQuestion,
    isPending: isAsking,
    error: askError,
    reset: resetAskMutation,
  } = useCreateQuery<RepositoryAskResponse, RepositoryAskRequest>({
    url: activeRepoId ? API_ENDPOINTS.REPOSITORY_ASK(activeRepoId) : '',
  });

  // Handle repository switch: reset all repository-specific context
  const handleSelectRepo = useCallback(
    (repoId: string) => {
      if (repoId === activeRepoId) return;
      sessionIdRef.current += 1;
      setSelectedRepoId(repoId);
      setSelectedFilePath(null);
      setConversation([]);
      setLastReferences([]);
      setWarnings([]);
      setLastFailedQuestion(null);
      resetAskMutation();
    },
    [activeRepoId, resetAskMutation]
  );

  const handleManualScan = useCallback(() => {
    if (activeRepoId) {
      executeScan(undefined as void);
    }
  }, [activeRepoId, executeScan]);

  const handleAskQuestion = useCallback(
    (questionText: string) => {
      if (!questionText.trim() || isAsking || !activeRepoId) return;

      const currentSession = sessionIdRef.current;
      const historySnapshot = [...conversation];
      const newTurn: RepositoryChatMessage = { role: 'user', content: questionText.trim() };

      setConversation((prev) => [...prev, newTurn]);
      setLastFailedQuestion(null);
      resetAskMutation();

      askQuestion(
        {
          question: questionText.trim(),
          conversation: historySnapshot,
          selected_paths: selectedFilePath ? [selectedFilePath] : undefined,
        },
        {
          onSuccess: (data) => {
            // Guard in-flight isolation
            if (sessionIdRef.current !== currentSession) return;

            setConversation((prev) => [
              ...prev,
              { role: 'assistant', content: data.answer },
            ]);
            setLastReferences(data.references || []);
            if (data.warnings && data.warnings.length > 0) {
              setWarnings(data.warnings);
            }
          },
          onError: () => {
            if (sessionIdRef.current !== currentSession) return;
            setLastFailedQuestion(questionText.trim());
          },
        }
      );
    },
    [conversation, isAsking, activeRepoId, selectedFilePath, askQuestion, resetAskMutation]
  );

  const handleClearConversation = useCallback(() => {
    sessionIdRef.current += 1;
    setConversation([]);
    setLastReferences([]);
    setWarnings([]);
    setLastFailedQuestion(null);
    resetAskMutation();
  }, [resetAskMutation]);

  const handleRetryQuestion = useCallback(() => {
    if (!lastFailedQuestion || isAsking) return;
    setConversation((prev) => prev.slice(0, -1));
    handleAskQuestion(lastFailedQuestion);
  }, [lastFailedQuestion, isAsking, handleAskQuestion]);

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
            Phase 7 • Repository Intelligence
          </span>
          <h2 style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0', color: '#f8fafc' }}>
            Lightweight Local Codebase Analysis &amp; Architecture Q&amp;A
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '15px', margin: 0, maxWidth: '800px' }}>
            Local-first codebase intelligence with bounded directory scanning, dependency graphs,
            and evidence-grounded multi-file Q&amp;A powered by qwen2.5-coder:1.5b.
          </p>
        </div>
      </section>

      {/* Repository Selector */}
      {isRepoListLoading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
          Loading approved server repositories...
        </div>
      ) : repoListError ? (
        <div
          role="alert"
          style={{
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#fca5a5',
            marginBottom: '20px',
          }}
        >
          Failed to load approved repositories: {repoListError.message}
        </div>
      ) : (
        <RepositorySelector
          repositories={repoListData?.repositories || []}
          selectedRepoId={activeRepoId}
          onSelectRepo={handleSelectRepo}
          onScan={handleManualScan}
          isScanning={isScanning}
          configured={repoListData?.configured ?? false}
          message={repoListData?.message}
        />
      )}

      {/* Main Analysis Grid if a repository is selected and configured */}
      {repoListData?.configured && activeRepoId && (
        <>
          {scanError && (
            <div
              role="alert"
              style={{
                padding: '14px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#fca5a5',
                marginBottom: '20px',
              }}
            >
              Scan Error: {scanError.message}
            </div>
          )}

          {scanData?.summary && (
            <RepositoryOverviewCard summary={scanData.summary} />
          )}

          {/* Two-column layout: Tree on Left, Q&A and Dependencies on Right */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 1fr) minmax(400px, 2fr)',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            {/* Left Column: File Tree */}
            <div>
              <RepositoryFileTree
                tree={scanData?.tree || []}
                selectedFilePath={selectedFilePath}
                onSelectFile={handleSelectFile}
              />
            </div>

            {/* Right Column: Dependency Viewer & Q&A */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <RepositoryDependencyViewer
                selectedFilePath={selectedFilePath}
                dependencies={depData || null}
                isLoading={isDepLoading}
                error={depError ? new Error(depError.message) : null}
                onClose={() => setSelectedFilePath(null)}
              />

              <RepositoryQASection
                conversation={conversation}
                onAsk={handleAskQuestion}
                onClear={handleClearConversation}
                isPending={isAsking}
                error={askError ? new Error(askError.message) : null}
                onRetry={handleRetryQuestion}
                lastReferences={lastReferences}
                warnings={warnings}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
