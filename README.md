# AI Developer Copilot

[![Python](https://img.shields.io/badge/Python-3.14-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Pytest](https://img.shields.io/badge/Tested%20with-Pytest-0A9EDC?style=flat&logo=pytest&logoColor=white)](https://pytest.org/)

**AI Developer Copilot** is a production-quality full-stack AI development companion and portfolio application. The project is designed to master Software Engineering, Full-Stack Architecture, Generative AI, Retrieval-Augmented Generation (RAG), System Design, Automated Testing, and Containerized Cloud Deployment.

---

## 🚀 Milestones Achieved

### Day 1: Foundation Architecture & Generic API Layer
- **Backend**: FastAPI asynchronous application running on Uvicorn with Pydantic v2 schemas and CORS middleware.
- **Frontend**: React 19 + TypeScript single-page application built with Vite and custom obsidian glassmorphism styling.
- **Generic API Layer**: Feature-based frontend architecture powered by TanStack Query v5 and Axios with generic CRUD hooks (`useFetchQuery`, `useCreateQuery`, `useUpdateQuery`, `useDeleteQuery`).
- **Integration**: Real-time frontend-to-backend telemetry verification using the `/health` endpoint.
- **Quality Assurance**: Automated backend test suite with Pytest, comprehensive frontend unit & integration tests with Vitest + Testing Library, and strict TypeScript compilation checks.
- **Documentation**: Comprehensive engineering learning guide in `docs/learning-notes.md` and frontend architecture guide in `docs/frontend-api-architecture.md`.

### Day 2: AI Code Explanation Engine
- **Local LLM Inference**: Direct integration with local Ollama daemon executing `qwen2.5-coder:1.5b` with zero external cloud dependencies or paid APIs.
- **Backend Modular Architecture**: Structured `app/core/`, `app/schemas/`, `app/services/`, and `app/routers/` exposing `POST /api/v1/ai/explain`.
- **Structured JSON Output**: Constrained JSON generation returning summary, line-by-line breakdown, Big-O algorithmic complexity, and suggested improvements.
- **Security & Sandboxing**: Strict static analysis with zero code execution (`eval`/`exec`) and input length safeguards.
- **Frontend Code Explainer**: Interactive developer UI featuring syntax-tailored code editor, multi-language selector, instant sample snippets, skeleton loading, Big-O complexity badges, and error handling.
- **Documentation**: In-depth guide in `docs/day-2-ai-engine.md`.

### Day 3: AI Code Review & Bug Detection Engine
- **Backend Review Endpoint**: Exposed `POST /api/v1/ai/review` returning executive summary, overall risk level, structured issues list with severity and line numbers, and hardened improved code.
- **Service Refactoring**: Extracted shared `_generate_json` client method in `OllamaService` handling HTTP connection errors, timeouts, and resilient JSON fence sanitization for both `/explain` and `/review`.
- **Defensive Line & Risk Validation**: Bounded line number validation against submitted code line counts, severity level normalization, and risk clamping.
- **Frontend Code Review Feature**: Created `src/features/code-review/` featuring code editor, language selector, curated test presets (division by zero, unchecked index, null dereference, clean code), severity pills, line badges, and a "Copy Improved Code" button.
- **Navigation Integration**: Tabbed multi-view navigation across AI Code Review, AI Code Explainer, and System Dashboard.
- **Documentation**: Comprehensive architectural guide, trade-off analysis, and interview preparation in `docs/day-3-code-review.md`.

---

## 📁 Repository Structure

```text
ai-developer-copilot/
├── backend/
│   ├── app/
│   │   ├── core/                # Configuration & settings (Ollama URL, model, limits)
│   │   ├── routers/             # Feature routers (/explain, /review)
│   │   ├── schemas/             # Pydantic v2 request/response schemas
│   │   ├── services/            # Ollama shared async HTTP client & JSON sanitization
│   │   ├── __init__.py
│   │   └── main.py              # FastAPI application & endpoints
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_ai_review.py    # Mocked review edge cases, bounds, and security tests
│   │   ├── test_ai_router.py    # Mocked explain endpoint, timeout, and security tests
│   │   └── test_main.py         # Pytest test suite for welcome, health & CORS
│   ├── .venv/                   # Isolated Python virtual environment
│   ├── pytest.ini               # Pytest configuration
│   └── requirements.txt         # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   └── providers/       # QueryProvider & queryClient
│   │   ├── components/
│   │   │   ├── common/          # ErrorBanner
│   │   │   ├── layout/          # Header with 3-way view switcher, Footer
│   │   │   └── ui/              # Button, Card, StatusPill, JsonInspector
│   │   ├── features/
│   │   │   ├── code-explainer/  # Day 2 AI Code Explainer feature & tests
│   │   │   ├── code-review/     # Day 3 AI Code Review & Bug Detection feature & tests
│   │   │   └── dashboard/       # Day 1 Telemetry Dashboard & tests
│   │   ├── hooks/
│   │   │   └── api/             # Generic CRUD hooks (useFetchQuery, useCreateQuery, etc.)
│   │   ├── services/            # apiClient (Axios) & apiEndpoints
│   │   ├── test/                # Test utilities & Vitest setup
│   │   ├── types/               # TypeScript schemas (ai.ts, api.ts, health.ts)
│   │   ├── utils/               # Formatters
│   │   ├── App.tsx              # Root component mounting QueryProvider
│   │   ├── App.css              # Dashboard, explainer, and code review styles
│   │   ├── index.css            # Obsidian design tokens
│   │   └── main.tsx             # React root mount
│   ├── index.html               # HTML template & typography
│   ├── package.json             # Frontend dependencies & scripts
│   ├── tsconfig.json            # TypeScript configuration
│   ├── vite.config.ts           # Vite & Vitest configuration
│   ├── .env                     # Environment variables (VITE_API_BASE_URL)
│   └�```dian design tokens
│   │   └── main.tsx             # React root mount
│   ├── index.html               # HTML template & typography
│   ├── package.json             # Frontend dependencies & scripts
│   ├── tsconfig.json            # TypeScript configuration
│   ├── vite.config.ts           # Vite & Vitest configuration
│   ├── .env                     # Environment variables (VITE_API_BASE_URL)
│   └── .env.example             # Environment template
├── docs/
│   ├── learning-notes.md        # 10 core engineering topic notes & Q&As
│   ├── frontend-api-architecture.md # TanStack Query & generic CRUD architecture guide
│   └── day-2-ai-engine.md       # Local LLM, Ollama, prompt engineering & security guide
├── .gitignore
└── README.md
```

---

## 🛠️ Getting Started

### Prerequisites
- **Python**: Version 3.10+ (tested on Python 3.14)
- **Node.js**: Version 18+ (tested on Node v22.15.0 and npm 10.9.2)

---

### Backend Setup

1. **Navigate to the backend directory and activate the virtual environment**:
   ```bash
   cd backend
   source .venv/bin/activate
   ```
   *(If initializing from scratch, run `python3 -m venv .venv && pip install -r requirements.txt`)*

2. **Run the backend development server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   - Welcome endpoint: [http://localhost:8000/](http://localhost:8000/)
   - Health check endpoint: [http://localhost:8000/health](http://localhost:8000/health)
   - Interactive Swagger API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

3. **Run backend automated tests**:
   ```bash
   pytest tests/
   ```

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   Access the Developer Dashboard at [http://localhost:5173/](http://localhost:5173/).

4. **Run TypeScript check & production build**:
   ```bash
   npm run build
   ```

---

## 🔌 API Endpoints (Day 1)

| Method | Endpoint | Description | Response Schema |
|---|---|---|---|
| `GET` | `/` | Application welcome & service info | `WelcomeResponse` (`message`, `version`, `status`, `docs_url`) |
| `GET` | `/health` | Live service health & UTC timestamp | `HealthResponse` (`status`, `service`, `environment`, `version`, `timestamp`) |
| `GET` | `/docs` | OpenAPI / Swagger interactive documentation | Interactive HTML UI |

---

## 📚 Engineering Documentation

Detailed notes answering the 10 foundational engineering questions, with beginner explanations, real-world examples, and interview Q&As, are available in [`docs/learning-notes.md`](./docs/learning-notes.md):
1. What is Frontend?
2. What is Backend?
3. What is an API?
4. What is FastAPI?
5. What is React?
6. What is TypeScript?
7. What is JSON?
8. What is CORS?
9. What is a Virtual Environment?
10. How Does the Frontend Communicate with the Backend?

---

## 🗺️ Future Roadmap
- **Phase 2**: Relational database persistence with PostgreSQL & SQLAlchemy/SQLModel.
- **Phase 3**: Local LLM integration & Retrieval-Augmented Generation (RAG) vector search.
- **Phase 4**: Interactive AI coding assistant UI, streaming completions, and multi-file context.
- **Phase 5**: Docker multi-stage containerization & CI/CD deployment pipelines.
