import type { RepositorySummary } from '../../../types/repository';

export interface RepositoryOverviewCardProps {
  summary: RepositorySummary;
}

export function RepositoryOverviewCard({ summary }: RepositoryOverviewCardProps) {
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      style={{
        background: 'rgba(30, 41, 59, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '16px',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>📊</span> Repository Overview &amp; Telemetry
        </h3>
        {summary.is_partial && (
          <span
            style={{
              background: 'rgba(234, 179, 8, 0.2)',
              color: '#fef08a',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            ⚠️ Bounded Scan Limit Applied
          </span>
        )}
      </div>

      {/* Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '8px',
            padding: '12px 16px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
            Scanned Source Files
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#38bdf8' }}>
            {summary.total_files_scanned}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '8px',
            padding: '12px 16px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
            Total Code Lines
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#4ade80' }}>
            {summary.total_lines.toLocaleString()}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '8px',
            padding: '12px 16px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
            Indexed Source Bytes
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f472b6' }}>
            {formatBytes(summary.total_bytes)}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '8px',
            padding: '12px 16px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
            Detected Entry Points
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#fbbf24' }}>
            {summary.entry_points.length}
          </div>
        </div>
      </div>

      {/* Languages & Entry Points row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Languages:</span>
          {Object.entries(summary.languages).map(([lang, count]) => (
            <span
              key={lang}
              style={{
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#c7d2fe',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              {lang} ({count})
            </span>
          ))}
        </div>

        {summary.entry_points.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
              Entry Points:
            </span>
            {summary.entry_points.map((ep) => (
              <span
                key={ep}
                style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#86efac',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                }}
              >
                ⭐ {ep}
              </span>
            ))}
          </div>
        )}

        {summary.warnings.length > 0 && (
          <div
            style={{
              marginTop: '6px',
              padding: '8px 12px',
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.2)',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#fde047',
            }}
          >
            {summary.warnings.map((w) => (
              <div key={w}>• {w}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

