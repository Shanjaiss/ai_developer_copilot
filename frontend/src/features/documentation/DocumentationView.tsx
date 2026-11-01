import { useState, useRef, useCallback } from 'react';
import { useFetchQuery } from '../../hooks/api/useFetchQuery';
import { useCreateQuery } from '../../hooks/api/useCreateQuery';
import { API_ENDPOINTS } from '../../services/apiEndpoints';
import { DocumentationInputPanel } from './components/DocumentationInputPanel';
import { DocumentationMarkdownViewer } from './components/DocumentationMarkdownViewer';
import { DocumentationFactsAndAssumptions } from './components/DocumentationFactsAndAssumptions';
import type {
  DocumentationAudience,
  DocumentationDetailLevel,
  DocumentationMode,
  DocumentationRequest,
  DocumentationResponse,
  DocumentationType,
  RepositoryListResponse,
} from '../../types';

export function DocumentationView() {
  const sessionIdRef = useRef<number>(0);

  // Form State
  const [mode, setMode] = useState<DocumentationMode>('pasted_code');
  const [docType, setDocType] = useState<DocumentationType>('function');
  const [language, setLanguage] = useState<string>('python');
  const [audience, setAudience] = useState<DocumentationAudience>('developer');
  const [detailLevel, setDetailLevel] = useState<DocumentationDetailLevel>('standard');
  const [code, setCode] = useState<string>('');
  const [repositoryId, setRepositoryId] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string>('');

  // Results & Error State
  const [docResult, setDocResult] = useState<DocumentationResponse | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // 1. Fetch Approved Repositories
  const { data: repoListData, isPending: isLoadingRepos } = useFetchQuery<RepositoryListResponse>({
    queryKey: ['approved-repositories'],
    url: API_ENDPOINTS.REPOSITORIES,
  });

  const repositories = repoListData?.repositories || [];

  // 2. Documentation Mutation
  const {
    mutate: executeGenerate,
    isPending: isSubmitting,
  } = useCreateQuery<DocumentationResponse, DocumentationRequest>({
    url: API_ENDPOINTS.AI_GENERATE_DOCUMENTATION,
  });

  // Mode Change Handler
  const handleModeChange = useCallback((newMode: DocumentationMode) => {
    sessionIdRef.current += 1;
    setMode(newMode);
    setErrorBanner(null);
  }, []);

  // Repository Change Handler
  const handleRepositoryChange = useCallback((newRepoId: string | null) => {
    sessionIdRef.current += 1;
    setRepositoryId(newRepoId);
    setErrorBanner(null);
  }, []);

  // Clear Handler
  const handleClear = useCallback(() => {
    sessionIdRef.current += 1;
    setCode('');
    setFilePath('');
    setDocResult(null);
    setErrorBanner(null);
  }, []);

  // Submit Handler
  const handleSubmit = useCallback(() => {
    const currentSession = ++sessionIdRef.current;
    setErrorBanner(null);

    const payload: DocumentationRequest = {
      mode,
      documentation_type: docType,
      language: mode === 'pasted_code' || mode === 'api_documentation' ? language : undefined,
      code: code.trim() ? code : undefined,
      repository_id: repositoryId || undefined,
      file_path: filePath.trim() ? filePath.trim() : undefined,
      audience,
      detail_level: detailLevel,
    };

    executeGenerate(payload, {
      onSuccess: (response) => {
        // Drop response if user changed mode or cleared during flight
        if (currentSession !== sessionIdRef.current) {
          return;
        }
        setDocResult(response);
      },
      onError: (err: any) => {
        if (currentSession !== sessionIdRef.current) {
          return;
        }
        const errorMsg =
          err?.message ||
          err?.response?.data?.detail ||
          'Failed to generate documentation. Please check input parameters.';
        setErrorBanner(errorMsg);
      },
    });
  }, [mode, docType, language, code, repositoryId, filePath, audience, detailLevel, executeGenerate]);

  return (
    <div className="documentation-view" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Input Configuration Panel */}
      <DocumentationInputPanel
        mode={mode}
        onModeChange={handleModeChange}
        docType={docType}
        onDocTypeChange={setDocType}
        language={language}
        onLanguageChange={setLanguage}
        audience={audience}
        onAudienceChange={setAudience}
        detailLevel={detailLevel}
        onDetailLevelChange={setDetailLevel}
        code={code}
        onCodeChange={setCode}
        repositoryId={repositoryId}
        onRepositoryIdChange={handleRepositoryChange}
        filePath={filePath}
        onFilePathChange={setFilePath}
        repositories={repositories}
        isLoadingRepos={isLoadingRepos}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onClear={handleClear}
      />

      {/* Error Alert Banner */}
      {errorBanner && (
        <div
          role="alert"
          data-testid="doc-error-banner"
          style={{
            padding: '14px 18px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <strong>Documentation Generation Error:</strong> {errorBanner}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State Indicator */}
      {isSubmitting && (
        <div
          data-testid="doc-loading-indicator"
          style={{
            padding: '36px',
            textAlign: 'center',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            marginBottom: '24px',
          }}
        >
          <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>📖</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Synthesizing Grounded Technical Documentation...
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Running static AST / manifest extraction and local AI inference ({settings_model_name}).
          </div>
        </div>
      )}

      {/* Output Results Section */}
      {docResult && !isSubmitting && (
        <div data-testid="doc-results-section">
          {/* Markdown Preview & Export Viewer */}
          <DocumentationMarkdownViewer
            title={docResult.title}
            markdown={docResult.markdown}
            docType={docResult.documentation_type}
            model={docResult.model}
          />

          {/* Statically Verified Facts, Assumptions, and Sources */}
          <DocumentationFactsAndAssumptions
            verifiedFacts={docResult.verified_facts}
            assumptions={docResult.assumptions}
            sources={docResult.sources}
            warnings={docResult.warnings}
          />
        </div>
      )}
    </div>
  );
}

const settings_model_name = 'qwen2.5-coder:1.5b';
