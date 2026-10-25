import { Card } from '../../../components/ui/Card';
import { API_ENDPOINTS } from '../../../services/apiEndpoints';

export interface ApiContractVerifierProps {
  apiBaseUrl: string;
}

export function ApiContractVerifier({ apiBaseUrl }: ApiContractVerifierProps) {
  return (
    <Card
      span={5}
      title="API Contract Endpoints"
      icon="🔌"
      headerAction={
        <span
          style={{
            fontSize: '0.78rem',
            color: '#94a3b8',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Day 1 Scope
        </span>
      }
    >
      <div className="endpoint-list">
        <div className="endpoint-item">
          <div className="endpoint-info">
            <span className="method-tag">GET</span>
            <div>
              <div className="endpoint-path">{API_ENDPOINTS.HEALTH}</div>
              <div className="endpoint-desc">Live health probe &amp; uptime</div>
            </div>
          </div>
          <a
            href={`${apiBaseUrl}${API_ENDPOINTS.HEALTH}`}
            target="_blank"
            rel="noreferrer"
            className="endpoint-action-btn"
          >
            Inspect ↗
          </a>
        </div>

        <div className="endpoint-item">
          <div className="endpoint-info">
            <span className="method-tag">GET</span>
            <div>
              <div className="endpoint-path">{API_ENDPOINTS.WELCOME}</div>
              <div className="endpoint-desc">Welcome &amp; API discovery metadata</div>
            </div>
          </div>
          <a
            href={`${apiBaseUrl}${API_ENDPOINTS.WELCOME}`}
            target="_blank"
            rel="noreferrer"
            className="endpoint-action-btn"
          >
            Inspect ↗
          </a>
        </div>

        <div className="endpoint-item">
          <div className="endpoint-info">
            <span
              className="method-tag"
              style={{
                background: 'rgba(56, 189, 248, 0.18)',
                color: '#38bdf8',
                borderColor: 'rgba(56, 189, 248, 0.3)',
              }}
            >
              DOCS
            </span>
            <div>
              <div className="endpoint-path">{API_ENDPOINTS.DOCS}</div>
              <div className="endpoint-desc">FastAPI Swagger UI interactive schema</div>
            </div>
          </div>
          <a
            href={`${apiBaseUrl}${API_ENDPOINTS.DOCS}`}
            target="_blank"
            rel="noreferrer"
            className="endpoint-action-btn"
          >
            Open ↗
          </a>
        </div>
      </div>

      <div
        style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(15, 23, 42, 0.4)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <h4 style={{ fontSize: '0.88rem', color: '#f8fafc', marginBottom: '8px' }}>
          📚 Scalable TanStack Query Architecture
        </h4>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.5' }}>
          Endpoints are accessed through generic CRUD hooks (<code style={{ color: '#38bdf8' }}>useFetchQuery</code>,{' '}
          <code style={{ color: '#38bdf8' }}>useCreateQuery</code>, <code style={{ color: '#38bdf8' }}>useUpdateQuery</code>,{' '}
          <code style={{ color: '#38bdf8' }}>useDeleteQuery</code>) backed by centralized Axios client interceptors.
        </p>
      </div>
    </Card>
  );
}

export default ApiContractVerifier;
