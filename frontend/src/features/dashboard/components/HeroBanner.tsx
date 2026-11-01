import { formatLocalTime, formatLatency } from '../../../utils/formatters';

export interface HeroBannerProps {
  apiBaseUrl: string;
  latencyMs?: number | null;
  lastChecked?: Date | null;
  environment?: string;
}

export function HeroBanner({
  apiBaseUrl,
  latencyMs,
  lastChecked,
  environment = 'development',
}: HeroBannerProps) {
  return (
    <section className="hero-banner">
      <div className="hero-content">
        <span className="hero-tag">12-Phase Development Project • Complete Full-Stack Release</span>
        <h2>AI Developer Copilot Engineering Platform</h2>
        <p>
          A local-first, privacy-focused developer copilot and codebase intelligence platform. Unites a responsive
          React 19 single-page application with high-throughput asynchronous FastAPI microservices and on-device
          Ollama LLM inference (Qwen2.5-Coder 1.5B).
        </p>

        <div className="hero-meta-strip">
          <div className="meta-item">
            <span className="meta-label">Configured API Base</span>
            <span className="meta-val">{apiBaseUrl}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Round-Trip Latency</span>
            <span
              className="meta-val"
              style={{ color: latencyMs ? '#34d399' : '#94a3b8' }}
            >
              {formatLatency(latencyMs)}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Last Heartbeat</span>
            <span className="meta-val">{formatLocalTime(lastChecked)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Environment</span>
            <span className="meta-val">{environment}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroBanner;
