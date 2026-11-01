import type {
  DocumentationAssumption,
  DocumentationSourceReference,
  DocumentationVerifiedFact,
} from '../../../types';

export interface DocumentationFactsAndAssumptionsProps {
  verifiedFacts: DocumentationVerifiedFact[];
  assumptions: DocumentationAssumption[];
  sources: DocumentationSourceReference[];
  warnings: string[];
}

export function DocumentationFactsAndAssumptions({
  verifiedFacts,
  assumptions,
  sources,
  warnings,
}: DocumentationFactsAndAssumptionsProps) {
  const hasContent =
    verifiedFacts.length > 0 || assumptions.length > 0 || sources.length > 0 || warnings.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
      {/* 1. Statically Verified Facts */}
      {verifiedFacts.length > 0 && (
        <div className="card" data-testid="verified-facts-section" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ color: '#10b981', fontSize: '1.1rem' }}>✓</span>
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Statically Verified Facts ({verifiedFacts.length})
            </h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {verifiedFacts.map((fact, idx) => (
              <div
                key={`fact-${idx}`}
                data-testid={`verified-fact-${idx}`}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                    }}
                  >
                    {fact.category}
                  </span>
                </div>
                <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {fact.fact}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Evidence: {fact.evidence}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Assumptions & Items Requiring Verification */}
      {assumptions.length > 0 && (
        <div className="card" data-testid="assumptions-section" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ color: '#f59e0b', fontSize: '1.1rem' }}>⚠️</span>
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Assumptions & Items Requiring Verification ({assumptions.length})
            </h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {assumptions.map((item, idx) => (
              <div
                key={`assump-${idx}`}
                data-testid={`assumption-item-${idx}`}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: 'rgba(245, 158, 11, 0.05)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                }}
              >
                <div style={{ fontSize: '0.86rem', color: '#f59e0b', fontWeight: 600 }}>
                  {item.claim}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Basis: {item.basis}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Verification Action: {item.verification_needed}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Source References */}
      {sources.length > 0 && (
        <div className="card" data-testid="sources-section" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ color: 'var(--accent-color, #38bdf8)', fontSize: '1.1rem' }}>📁</span>
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Grounded Source References ({sources.length})
            </h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sources.map((src, idx) => (
              <div
                key={`src-${idx}`}
                data-testid={`source-ref-${idx}`}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem', color: 'var(--accent-color, #38bdf8)' }}>
                    {src.path}
                  </span>
                  {src.start_line && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                      (L{src.start_line}{src.end_line ? `–L${src.end_line}` : ''})
                    </span>
                  )}
                  {src.reason && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {src.reason}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

