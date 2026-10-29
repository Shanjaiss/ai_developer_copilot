import type { RepositoryDependenciesResponse } from '../../../types/repository';

export interface RepositoryDependencyViewerProps {
  selectedFilePath: string | null;
  dependencies: RepositoryDependenciesResponse | null;
  isLoading: boolean;
  error: Error | null;
  onClose?: () => void;
}

export function RepositoryDependencyViewer({
  selectedFilePath,
  dependencies,
  isLoading,
  error,
  onClose,
}: RepositoryDependencyViewerProps) {
  if (!selectedFilePath) {
    return (
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.4)',
          border: '1px dashed rgba(255, 255, 255, 0.15)',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: '13px',
        }}
      >
        <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🔗</span>
        Select any file in the file tree to inspect local dependencies, external packages, and reverse imports.
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '12px',
        padding: '18px 20px',
        marginBottom: '20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🔗</span>
          <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px' }}>
            Dependency Insights:
          </span>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.1)',
              padding: '2px 8px',
              borderRadius: '6px',
            }}
          >
            {selectedFilePath}
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dependency viewer"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ color: '#94a3b8', fontSize: '13px', padding: '12px 0' }}>
          Analyzing imports and reverse dependencies...
        </div>
      ) : error ? (
        <div style={{ color: '#f87171', fontSize: '13px', padding: '12px 0' }}>
          Could not load dependencies: {error.message}
        </div>
      ) : dependencies ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Local Dependencies */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              borderRadius: '8px',
              padding: '12px 14px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#818cf8',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>📦</span> Local Imports ({dependencies.local_dependencies.length})
            </div>
            {dependencies.local_dependencies.length === 0 ? (
              <span style={{ fontSize: '12px', color: '#64748b' }}>None</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
                {dependencies.local_dependencies.map((dep) => (
                  <div
                    key={dep}
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: '#cbd5e1',
                      wordBreak: 'break-all',
                    }}
                  >
                    • {dep}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* External Dependencies */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              borderRadius: '8px',
              padding: '12px 14px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#34d399',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🌐</span> External Packages ({dependencies.external_dependencies.length})
            </div>
            {dependencies.external_dependencies.length === 0 ? (
              <span style={{ fontSize: '12px', color: '#64748b' }}>None</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
                {dependencies.external_dependencies.map((pkg) => (
                  <div
                    key={pkg}
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: '#cbd5e1',
                      wordBreak: 'break-all',
                    }}
                  >
                    • {pkg}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Imported By (Reverse Dependencies) */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              borderRadius: '8px',
              padding: '12px 14px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#fbbf24',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>⬅️</span> Imported By ({dependencies.imported_by.length})
            </div>
            {dependencies.imported_by.length === 0 ? (
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                No other scanned files import this
              </span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
                {dependencies.imported_by.map((importer) => (
                  <div
                    key={importer}
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: '#fef08a',
                      wordBreak: 'break-all',
                    }}
                  >
                    • {importer}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

