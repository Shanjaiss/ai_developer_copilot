import { Card } from '../../../components/ui/Card';

export function TechStackMatrix() {
  return (
    <Card
      span={12}
      title="Technology Stack & Future Roadmap"
      icon="🛠️"
      headerAction={
        <span
          style={{
            fontSize: '0.78rem',
            color: '#10b981',
            fontWeight: 600,
          }}
        >
          ● 12-PHASE ARCHITECTURE OPERATIONAL
        </span>
      }
    >
      <div className="stack-grid">
        <div className="stack-card">
          <div className="stack-title">Frontend Tier</div>
          <div className="stack-tech">React 19 + TypeScript + Vite</div>
          <div className="stack-detail">
            TanStack Query v5 + Axios centralized generic hooks, responsive design tokens, and zero-dependency SVG charts.
          </div>
        </div>

        <div className="stack-card">
          <div className="stack-title">Backend Tier</div>
          <div className="stack-tech">FastAPI + Uvicorn + Pydantic v2</div>
          <div className="stack-detail">
            Asynchronous ASGI pipeline, CORS origin security, typed JSON schemas, and path traversal security guards.
          </div>
        </div>

        <div className="stack-card">
          <div className="stack-title">AI & Intelligence Tier</div>
          <div className="stack-tech">Local Ollama + Qwen2.5-Coder 1.5B</div>
          <div className="stack-detail">
            On-device LLM inference, AST dependency analysis, bounded multi-file context, and zero cloud data leakage.
          </div>
        </div>

        <div className="stack-card">
          <div className="stack-title">Quality Assurance</div>
          <div className="stack-tech">Pytest, Vitest & Strict TS</div>
          <div className="stack-detail">
            190 backend pytest tests, 125 frontend Vitest tests, and Oxlint static analysis with zero warnings.
          </div>
        </div>

        <div className="stack-card" style={{ opacity: 0.85 }}>
          <div className="stack-title">Future Enhancements</div>
          <div className="stack-tech">PostgreSQL + Advanced RAG + Docker</div>
          <div className="stack-detail">
            Persistent telemetry storage in PostgreSQL, vector embeddings for larger codebases, and multi-container Docker deployment.
          </div>
        </div>
      </div>
    </Card>
  );
}

export default TechStackMatrix;
