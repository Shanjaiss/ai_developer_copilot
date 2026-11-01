import type { CrossFileImpact } from '../../../types';

export interface CrossFileImpactCardProps {
  impacts: CrossFileImpact[];
}

export function CrossFileImpactCard({ impacts }: CrossFileImpactCardProps) {
  if (!impacts || impacts.length === 0) {
    return null;
  }

  const callers = impacts.filter((i) => i.impact_type === 'caller' || i.impact_type === 'imported_by');
  const dependencies = impacts.filter((i) => i.impact_type === 'dependency');

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '1.2rem' }}>🔗</span>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Repository Cross-File Impact Analysis
        </h3>
        <span
          style={{
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: '12px',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-muted)',
            marginLeft: 'auto',
          }}
        >
          {impacts.length} Related {impacts.length === 1 ? 'Module' : 'Modules'}
        </span>
      </div>

      <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Identified downstream callers and dependencies within the approved repository that may be affected by changes to public signatures or module interfaces.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {callers.length > 0 && (
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Potential Callers (Import this file):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {callers.map((caller, cIdx) => (
                <div
                  key={cIdx}
                  data-testid={`caller-impact-${cIdx}`}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem' }}>📄</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {caller.file_path}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {caller.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {dependencies.length > 0 && (
          <div style={{ marginTop: callers.length > 0 ? '10px' : 0 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Local Dependencies (Imported by this file):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {dependencies.map((dep, dIdx) => (
                <div
                  key={dIdx}
                  data-testid={`dep-impact-${dIdx}`}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem' }}>📦</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                      {dep.file_path}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {dep.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

