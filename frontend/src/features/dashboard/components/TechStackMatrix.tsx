import { Card } from '../../../components/ui/Card';

export function TechStackMatrix() {
  return (
    <Card
      span={12}
      title="Portfolio Technology Matrix (Active & Future Phases)"
      icon="🛠️"
      headerAction={
        <span
          style={{
            fontSize: '0.78rem',
            color: '#10b981',
            fontWeight: 600,
          }}
        >
          ● GENERIC CRUD ARCHITECTURE OPERATIONAL
        </span>
      }
    >
      <div className="stack-grid">
        <div className="stack-card">
          <div className="stack-title">Frontend Tier</div>
          <div className="stack-tech">React 19 + TypeScript + Vite</div>
          <div className="stack-detail">
            TanStack Query v5 + Axios centralized generic CRUD hooks, glassmorphism design tokens.
          </div>
        </div>

        <div className="stack-card">
          <div className="stack-title">Backend Tier</div>
          <div className="stack-tech">FastAPI + Uvicorn + Pydantic v2</div>
          <div className="stack-detail">
            Asynchronous ASGI pipeline, CORS origin security, and typed JSON schemas.
          </div>
        </div>

        <div className="stack-card">
          <div className="stack-title">Quality Assurance</div>
          <div className="stack-tech">Pytest, Vitest & Strict TS</div>
          <div className="stack-detail">
            Automated unit, integration, and cancellation testing with mock networks.
          </div>
        </div>

        <div className="stack-card" style={{ opacity: 0.7 }}>
          <div className="stack-title">Upcoming Phase 2+</div>
          <div className="stack-tech">PostgreSQL + Local LLM + RAG</div>
          <div className="stack-detail">
            Vector store embeddings, conversational AI copilot, and Docker orchestration.
          </div>
        </div>
      </div>
    </Card>
  );
}

export default TechStackMatrix;
