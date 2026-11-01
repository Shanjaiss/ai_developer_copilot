import type {
  ApprovedRepository,
  DocumentationAudience,
  DocumentationDetailLevel,
  DocumentationMode,
  DocumentationType,
} from '../../../types';

interface DocPreset {
  name: string;
  code: string;
  language: string;
  docType: DocumentationType;
  mode: DocumentationMode;
}

const DOC_PRESETS: DocPreset[] = [
  {
    name: 'Python: Data Pipeline Function',
    language: 'python',
    docType: 'function',
    mode: 'pasted_code',
    code: `def process_user_metrics(users: list[dict], threshold: float = 0.5) -> dict[str, float]:
    """
    Filters users above the activity threshold and computes aggregate engagement scores.
    """
    active = [u for u in users if u.get('engagement', 0.0) >= threshold]
    if not active:
        return {'total': 0.0, 'average': 0.0}
    total_score = sum(u.get('engagement', 0.0) for u in active)
    return {
        'total': total_score,
        'average': round(total_score / len(active), 3),
        'count': len(active),
    }`,
  },
  {
    name: 'React: Metric Card Component',
    language: 'typescript',
    docType: 'class',
    mode: 'pasted_code',
    code: `interface MetricCardProps {
  label: string;
  value: number | string;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
}

export function MetricCard({ label, value, trend = 'neutral', onClick }: MetricCardProps) {
  return (
    <div className="metric-card" onClick={onClick} role="region" aria-label={label}>
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
      {trend && <span className={\`metric-trend \${trend}\`}>{trend}</span>}
    </div>
  );
}`,
  },
  {
    name: 'FastAPI: Catalog Endpoint',
    language: 'python',
    docType: 'api',
    mode: 'pasted_code',
    code: `from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/catalog", tags=["Catalog"])

class Product(BaseModel):
    id: str
    name: str
    price: float

@router.get("/products", response_model=list[Product])
def list_products(category: str = Query("all", description="Product category filter")):
    """List and filter catalog products."""
    return []`,
  },
];

export interface DocumentationInputPanelProps {
  mode: DocumentationMode;
  onModeChange: (mode: DocumentationMode) => void;
  docType: DocumentationType;
  onDocTypeChange: (docType: DocumentationType) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  audience: DocumentationAudience;
  onAudienceChange: (audience: DocumentationAudience) => void;
  detailLevel: DocumentationDetailLevel;
  onDetailLevelChange: (level: DocumentationDetailLevel) => void;
  code: string;
  onCodeChange: (code: string) => void;
  repositoryId: string | null;
  onRepositoryIdChange: (repoId: string | null) => void;
  filePath: string;
  onFilePathChange: (path: string) => void;
  repositories: ApprovedRepository[];
  isLoadingRepos: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  onClear: () => void;
}

export function DocumentationInputPanel({
  mode,
  onModeChange,
  docType,
  onDocTypeChange,
  language,
  onLanguageChange,
  audience,
  onAudienceChange,
  detailLevel,
  onDetailLevelChange,
  code,
  onCodeChange,
  repositoryId,
  onRepositoryIdChange,
  filePath,
  onFilePathChange,
  repositories,
  isLoadingRepos,
  isSubmitting,
  onSubmit,
  onClear,
}: DocumentationInputPanelProps) {
  const handleApplyPreset = (preset: DocPreset) => {
    onModeChange(preset.mode);
    onDocTypeChange(preset.docType);
    onLanguageChange(preset.language);
    onCodeChange(preset.code);
  };

  const isFormValid =
    mode === 'pasted_code'
      ? code.trim().length > 0
      : mode === 'selected_file'
      ? Boolean(repositoryId && filePath.trim().length > 0)
      : mode === 'api_documentation'
      ? Boolean(code.trim().length > 0 || repositoryId)
      : Boolean(repositoryId);

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            📖 AI Documentation Generator
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Generate grounded READMEs, API contracts, code documentation, and architecture summaries.
          </p>
        </div>

        {/* Quick Presets for Pasted Code */}
        {mode === 'pasted_code' && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Presets:</span>
            {DOC_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="btn-preset"
                data-testid={`preset-${preset.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                onClick={() => handleApplyPreset(preset)}
                disabled={isSubmitting}
                style={{
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mode Switcher */}
      <div
        role="group"
        aria-label="Documentation mode switcher"
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          padding: '4px',
          background: 'var(--bg-tertiary)',
          borderRadius: '8px',
          width: 'fit-content',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          data-testid="mode-pasted-btn"
          onClick={() => onModeChange('pasted_code')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '0.84rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: mode === 'pasted_code' ? 'var(--accent-color, #38bdf8)' : 'transparent',
            color: mode === 'pasted_code' ? '#ffffff' : 'var(--text-secondary)',
            transition: 'all 0.2s',
          }}
        >
          📝 Pasted Code
        </button>

        <button
          type="button"
          data-testid="mode-readme-btn"
          onClick={() => {
            onModeChange('repository_readme');
            onDocTypeChange('readme');
          }}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '0.84rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: mode === 'repository_readme' ? 'var(--accent-color, #38bdf8)' : 'transparent',
            color: mode === 'repository_readme' ? '#ffffff' : 'var(--text-secondary)',
            transition: 'all 0.2s',
          }}
        >
          📂 Repo README
        </button>

        <button
          type="button"
          data-testid="mode-api-btn"
          onClick={() => {
            onModeChange('api_documentation');
            onDocTypeChange('api');
          }}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '0.84rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: mode === 'api_documentation' ? 'var(--accent-color, #38bdf8)' : 'transparent',
            color: mode === 'api_documentation' ? '#ffffff' : 'var(--text-secondary)',
            transition: 'all 0.2s',
          }}
        >
          ⚡ API Reference
        </button>

        <button
          type="button"
          data-testid="mode-architecture-btn"
          onClick={() => {
            onModeChange('architecture_documentation');
            onDocTypeChange('architecture');
          }}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '0.84rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: mode === 'architecture_documentation' ? 'var(--accent-color, #38bdf8)' : 'transparent',
            color: mode === 'architecture_documentation' ? '#ffffff' : 'var(--text-secondary)',
            transition: 'all 0.2s',
          }}
        >
          🏛️ Architecture
        </button>

        <button
          type="button"
          data-testid="mode-selected-file-btn"
          onClick={() => onModeChange('selected_file')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '0.84rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: mode === 'selected_file' ? 'var(--accent-color, #38bdf8)' : 'transparent',
            color: mode === 'selected_file' ? '#ffffff' : 'var(--text-secondary)',
            transition: 'all 0.2s',
          }}
        >
          📄 Selected File
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isFormValid && !isSubmitting) {
            onSubmit();
          }
        }}
      >
        {/* Document Configuration Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {/* Target Documentation Type */}
          <div>
            <label
              htmlFor="doc-type-select"
              style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
            >
              Doc Type
            </label>
            <select
              id="doc-type-select"
              data-testid="doc-type-select"
              value={docType}
              onChange={(e) => onDocTypeChange(e.target.value as DocumentationType)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
              }}
            >
              <option value="readme">Project README</option>
              <option value="api">API Endpoint Reference</option>
              <option value="function">Function Documentation</option>
              <option value="class">Class Documentation</option>
              <option value="module">Module Overview</option>
              <option value="architecture">Architecture Summary</option>
              <option value="inline_docstring">Code Comments & Docstrings</option>
            </select>
          </div>

          {/* Target Audience */}
          <div>
            <label
              htmlFor="doc-audience-select"
              style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
            >
              Audience
            </label>
            <select
              id="doc-audience-select"
              data-testid="doc-audience-select"
              value={audience}
              onChange={(e) => onAudienceChange(e.target.value as DocumentationAudience)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
              }}
            >
              <option value="developer">Developer</option>
              <option value="architect">Software Architect</option>
              <option value="technical_writer">Technical Writer</option>
              <option value="beginner">Beginner / Learner</option>
            </select>
          </div>

          {/* Detail Level */}
          <div>
            <label
              htmlFor="doc-detail-select"
              style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
            >
              Detail Level
            </label>
            <select
              id="doc-detail-select"
              data-testid="doc-detail-select"
              value={detailLevel}
              onChange={(e) => onDetailLevelChange(e.target.value as DocumentationDetailLevel)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
              }}
            >
              <option value="concise">Concise Summary</option>
              <option value="standard">Standard Details</option>
              <option value="comprehensive">Comprehensive / Exhaustive</option>
            </select>
          </div>

          {/* Language Selection */}
          {(mode === 'pasted_code' || mode === 'api_documentation') && (
            <div>
              <label
                htmlFor="doc-language-select"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
              >
                Programming Language
              </label>
              <select
                id="doc-language-select"
                data-testid="doc-language-select"
                value={language}
                onChange={(e) => onLanguageChange(e.target.value)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                }}
              >
                <option value="python">Python</option>
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="bash">Bash / Shell</option>
                <option value="other">Other / Text</option>
              </select>
            </div>
          )}
        </div>

        {/* Dynamic Inputs Based on Mode */}
        {mode === 'pasted_code' && (
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="doc-code-input"
              style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
            >
              Source Code <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              id="doc-code-input"
              data-testid="doc-code-input"
              rows={9}
              placeholder="Paste the source code or module you wish to document..."
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              disabled={isSubmitting}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.86rem',
                resize: 'vertical',
              }}
            />
          </div>
        )}

        {(mode === 'repository_readme' || mode === 'architecture_documentation' || mode === 'selected_file' || mode === 'api_documentation') && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label
                htmlFor="doc-repo-select"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
              >
                Approved Repository {mode !== 'api_documentation' && <span style={{ color: '#ef4444' }}>*</span>}
              </label>
              <select
                id="doc-repo-select"
                data-testid="doc-repo-select"
                value={repositoryId || ''}
                onChange={(e) => onRepositoryIdChange(e.target.value || null)}
                disabled={isSubmitting || isLoadingRepos}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                }}
              >
                <option value="">{mode === 'api_documentation' ? 'Select an approved repository (or paste code below)...' : 'Select an approved repository...'}</option>
                {repositories.map((repo) => (
                  <option key={repo.id} value={repo.id}>
                    📁 {repo.name} ({repo.id})
                  </option>
                ))}
              </select>
            </div>

            {mode === 'selected_file' && (
              <div>
                <label
                  htmlFor="doc-file-path-input"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
                >
                  Target File Path <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  id="doc-file-path-input"
                  data-testid="doc-file-path-input"
                  placeholder="e.g. backend/app/routers/items.py"
                  value={filePath}
                  onChange={(e) => onFilePathChange(e.target.value)}
                  disabled={isSubmitting}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Optional code input for API Documentation mode when no repo selected */}
        {mode === 'api_documentation' && !repositoryId && (
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="doc-code-input"
              style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
            >
              Or Paste API Route Code <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              id="doc-code-input"
              data-testid="doc-code-input"
              rows={8}
              placeholder="Paste your FastAPI, Express, or Flask route handler code..."
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.86rem',
                resize: 'vertical',
              }}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="submit"
            id="doc-submit-btn"
            data-testid="doc-submit-btn"
            className="btn btn-primary"
            disabled={!isFormValid || isSubmitting}
            style={{
              padding: '10px 24px',
              fontSize: '0.9rem',
              fontWeight: 600,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: !isFormValid || isSubmitting ? 'not-allowed' : 'pointer',
              opacity: !isFormValid || isSubmitting ? 0.6 : 1,
            }}
          >
            <span>{isSubmitting ? '⏳' : '📖'}</span>
            <span>{isSubmitting ? 'Generating Documentation...' : 'Generate Documentation'}</span>
          </button>

          <button
            type="button"
            id="doc-clear-btn"
            data-testid="doc-clear-btn"
            className="btn btn-secondary"
            onClick={onClear}
            disabled={isSubmitting}
            style={{
              padding: '10px 18px',
              fontSize: '0.88rem',
              borderRadius: '8px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}

