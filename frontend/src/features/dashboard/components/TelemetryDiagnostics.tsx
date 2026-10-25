import { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { StatusPill } from '../../../components/ui/StatusPill';
import { JsonInspector } from '../../../components/ui/JsonInspector';
import { formatLatency } from '../../../utils/formatters';
import type { ConnectionStatus, HealthResponse, WelcomeResponse } from '../../../types';

export interface TelemetryDiagnosticsProps {
  healthData?: HealthResponse | null;
  welcomeData?: WelcomeResponse | null;
  connectionStatus: ConnectionStatus;
  latencyMs?: number | null;
}

export function TelemetryDiagnostics({
  healthData,
  welcomeData,
  connectionStatus,
  latencyMs,
}: TelemetryDiagnosticsProps) {
  const [activeInspector, setActiveInspector] = useState<'health' | 'welcome'>('health');

  const statusLabel =
    healthData?.status?.toUpperCase() ||
    (connectionStatus === 'checking' ? 'CHECKING' : 'OFFLINE');

  return (
    <Card
      span={7}
      title="Backend Telemetry & Diagnostics"
      icon="⚡"
      headerAction={
        <StatusPill
          status={connectionStatus}
          id="diagnostics-status-pill"
          label={statusLabel}
        />
      }
    >
      <div className="telemetry-row">
        <div className="stat-box">
          <span className="stat-title">Service ID</span>
          <span className="stat-value" style={{ fontSize: '0.95rem' }}>
            {healthData?.service || 'backend-service'}
          </span>
          <span className="stat-sub">FastAPI ASGI</span>
        </div>
        <div className="stat-box">
          <span className="stat-title">API Version</span>
          <span className="stat-value">{healthData?.version || '0.1.0'}</span>
          <span className="stat-sub">SemVer 2.0</span>
        </div>
        <div className="stat-box">
          <span className="stat-title">Ping Latency</span>
          <span
            className="stat-value"
            style={{ color: latencyMs ? '#34d399' : '#94a3b8' }}
          >
            {formatLatency(latencyMs)}
          </span>
          <span className="stat-sub">Client to Server</span>
        </div>
      </div>

      <div className="diagnostics-list">
        <div className="diag-item">
          <span className="diag-label">CORS Origin Security</span>
          <span className="diag-code">Allowed: http://localhost:5173</span>
        </div>
        <div className="diag-item">
          <span className="diag-label">Server Timestamp (UTC)</span>
          <span className="diag-code">{healthData?.timestamp || 'Unavailable'}</span>
        </div>
        <div className="diag-item">
          <span className="diag-label">Client Host Origin</span>
          <span className="diag-code">{window.location.origin}</span>
        </div>
      </div>

      {/* JSON Telemetry Payload Inspector */}
      <JsonInspector
        title={`LIVE JSON PAYLOAD (${activeInspector.toUpperCase()})`}
        data={activeInspector === 'health' ? healthData : welcomeData}
        headerControls={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              style={{
                background:
                  activeInspector === 'health'
                    ? 'rgba(99, 102, 241, 0.4)'
                    : 'transparent',
                color: '#e2e8f0',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.72rem',
              }}
              onClick={() => setActiveInspector('health')}
            >
              /health
            </button>
            <button
              style={{
                background:
                  activeInspector === 'welcome'
                    ? 'rgba(99, 102, 241, 0.4)'
                    : 'transparent',
                color: '#e2e8f0',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.72rem',
              }}
              onClick={() => setActiveInspector('welcome')}
            >
              /
            </button>
          </div>
        }
      />
    </Card>
  );
}

export default TelemetryDiagnostics;
