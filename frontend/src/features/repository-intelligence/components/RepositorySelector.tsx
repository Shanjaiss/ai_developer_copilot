import type { ApprovedRepository } from '../../../types/repository';

export interface RepositorySelectorProps {
  repositories: ApprovedRepository[];
  selectedRepoId: string | null;
  onSelectRepo: (repoId: string) => void;
  onScan: () => void;
  isScanning: boolean;
  configured: boolean;
  message?: string;
}

export function RepositorySelector({
  repositories,
  selectedRepoId,
  onSelectRepo,
  onScan,
  isScanning,
  configured,
  message,
}: RepositorySelectorProps) {
  if (!configured || repositories.length === 0) {
    return (
      <div
        className="empty-state-card"
        style={{
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <h3 style={{ margin: 0, color: '#fef08a', fontSize: '18px' }}>
            No Approved Repositories Configured
          </h3>
        </div>
        <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.6, margin: '0 0 16px 0' }}>
          {message ||
            'Repository intelligence requires an explicit server-side allowlist to guarantee host filesystem security.'}
        </p>
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '14px 18px',
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#38bdf8',
          }}
        >
          export APPROVED_REPOSITORY_ROOTS=&quot;ai-copilot:/path/to/ai-developer-copilot&quot;
        </div>
        <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '12px', marginBottom: 0 }}>
          Set the environment variable above in your server startup environment and restart the backend.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <label
          htmlFor="repository-select"
          style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}
        >
          Active Repository:
        </label>
        <select
          id="repository-select"
          aria-label="Select active approved repository"
          value={selectedRepoId || ''}
          onChange={(e) => onSelectRepo(e.target.value)}
          style={{
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {repositories.map((repo) => (
            <option key={repo.id} value={repo.id}>
              {repo.name} ({repo.id})
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={onScan}
          disabled={isScanning || !selectedRepoId}
          aria-label="Re-scan repository"
          className="btn btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            cursor: isScanning ? 'wait' : 'pointer',
          }}
        >
          <span>🔄</span>
          {isScanning ? 'Scanning...' : 'Re-scan Repository'}
        </button>
      </div>
    </div>
  );
}

