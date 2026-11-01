import type { FC } from 'react';
import type { ProductivityHealthResponse } from '../../../types';

export interface SystemHealthCardsProps {
  health: ProductivityHealthResponse | null;
  isLoading?: boolean;
}

export const SystemHealthCards: FC<SystemHealthCardsProps> = ({
  health,
  isLoading = false,
}) => {
  const backendHealthy = health?.backend_healthy ?? false;
  const ollamaReachable = health?.ollama_reachable ?? false;
  const modelReady = health?.configured_model_available ?? false;
  const collectorActive = health?.metrics_collector_active ?? false;
  const modelName = health?.model_name || 'qwen2.5-coder:1.5b';
  const ollamaUrl = health?.ollama_url || 'http://127.0.0.1:11434';
  const retainedCount = health?.retained_events_count ?? 0;

  return (
    <div className="system-health-grid" data-testid="system-health-grid">
      {/* 1. Backend Service */}
      <div className="health-card" data-testid="health-backend">
        <div className="health-card-header">
          <span className="health-card-title">Backend API</span>
          <span
            className={`health-status-dot ${backendHealthy ? 'status-ok' : 'status-err'}`}
            data-testid="status-dot-backend"
          />
        </div>
        <div className="health-card-body">
          <span className="health-value">
            {isLoading ? 'Checking...' : backendHealthy ? 'Online (FastAPI)' : 'Offline'}
          </span>
          <span className="health-detail">Local Python 3.14 • Async Engine</span>
        </div>
      </div>

      {/* 2. Ollama Inference Engine */}
      <div className="health-card" data-testid="health-ollama">
        <div className="health-card-header">
          <span className="health-card-title">Ollama Engine</span>
          <span
            className={`health-status-dot ${ollamaReachable ? 'status-ok' : 'status-warn'}`}
            data-testid="status-dot-ollama"
          />
        </div>
        <div className="health-card-body">
          <span className="health-value">
            {isLoading ? 'Probing...' : ollamaReachable ? 'Reachable' : 'Offline / Standby'}
          </span>
          <span className="health-detail">{ollamaUrl}</span>
        </div>
      </div>

      {/* 3. AI Model Readiness */}
      <div className="health-card" data-testid="health-model">
        <div className="health-card-header">
          <span className="health-card-title">Configured LLM</span>
          <span
            className={`health-status-dot ${modelReady ? 'status-ok' : 'status-warn'}`}
            data-testid="status-dot-model"
          />
        </div>
        <div className="health-card-body">
          <span className="health-value">
            {isLoading ? 'Checking...' : modelReady ? 'Ready' : 'Not Loaded'}
          </span>
          <span className="health-detail">{modelName}</span>
        </div>
      </div>

      {/* 4. Telemetry Collector */}
      <div className="health-card" data-testid="health-collector">
        <div className="health-card-header">
          <span className="health-card-title">Metrics Subsystem</span>
          <span
            className={`health-status-dot ${collectorActive ? 'status-ok' : 'status-err'}`}
            data-testid="status-dot-collector"
          />
        </div>
        <div className="health-card-body">
          <span className="health-value">
            {isLoading ? 'Active' : collectorActive ? 'Active (In-Memory)' : 'Inactive'}
          </span>
          <span className="health-detail">
            {retainedCount.toLocaleString()} events in ring buffer
          </span>
        </div>
      </div>
    </div>
  );
};
