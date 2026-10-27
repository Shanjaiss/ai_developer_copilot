export interface TestCoverageNotesSectionProps {
  coverageNotes: string[];
  assumptions: string[];
  warnings: string[];
}

export function TestCoverageNotesSection({
  coverageNotes,
  assumptions,
  warnings,
}: TestCoverageNotesSectionProps) {
  const hasCoverageNotes = coverageNotes && coverageNotes.length > 0;
  const hasAssumptions = assumptions && assumptions.length > 0;
  const hasWarnings = warnings && warnings.length > 0;

  if (!hasCoverageNotes && !hasAssumptions && !hasWarnings) {
    return null;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px',
        marginTop: '16px',
      }}
    >
      {/* Coverage Intentions */}
      {hasCoverageNotes && (
        <div
          className="card"
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            borderColor: 'rgba(99, 102, 241, 0.25)',
          }}
        >
          <div className="card-header" style={{ paddingBottom: '8px' }}>
            <h4
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#a5b4fc',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: 0,
              }}
            >
              <span>🎯</span> Coverage Intentions
            </h4>
          </div>
          <ul
            style={{
              margin: '8px 0 0',
              paddingLeft: '20px',
              fontSize: '0.82rem',
              color: '#cbd5e1',
              lineHeight: 1.6,
            }}
          >
            {coverageNotes.map((note, idx) => (
              <li key={`cov-${idx}`}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Assumptions */}
      {hasAssumptions && (
        <div
          className="card"
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            borderColor: 'rgba(59, 130, 246, 0.25)',
          }}
        >
          <div className="card-header" style={{ paddingBottom: '8px' }}>
            <h4
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#93c5fd',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: 0,
              }}
            >
              <span>💡</span> Synthesizer Assumptions
            </h4>
          </div>
          <ul
            style={{
              margin: '8px 0 0',
              paddingLeft: '20px',
              fontSize: '0.82rem',
              color: '#cbd5e1',
              lineHeight: 1.6,
            }}
          >
            {assumptions.map((asm, idx) => (
              <li key={`asm-${idx}`}>{asm}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings & Limitations */}
      {hasWarnings && (
        <div
          className="card"
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            borderColor: 'rgba(245, 158, 11, 0.3)',
          }}
        >
          <div className="card-header" style={{ paddingBottom: '8px' }}>
            <h4
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: 0,
              }}
            >
              <span>⚠️</span> Limitations &amp; Caveats
            </h4>
          </div>
          <ul
            style={{
              margin: '8px 0 0',
              paddingLeft: '20px',
              fontSize: '0.82rem',
              color: '#fde68a',
              lineHeight: 1.6,
            }}
          >
            {warnings.map((warn, idx) => (
              <li key={`warn-${idx}`}>{warn}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default TestCoverageNotesSection;
