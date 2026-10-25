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
        <span className="hero-tag">System Phase 1 • Initialization Complete</span>
        <h2>AI Developer Copilot Core Architecture</h2>
        <p>
          A production-ready full-stack portfolio workspace uniting modern client-side rendering with high-throughput
          asynchronous Python web services. Structured for extensibility into Generative AI, Retrieval-Augmented
          Generation (RAG), and containerized cloud deployment.
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
