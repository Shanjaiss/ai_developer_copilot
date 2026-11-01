# AI Developer Copilot

[![Python](https://img.shields.io/badge/Python-3.14-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Pytest](https://img.shields.io/badge/Pytest-190%20Passed-0A9EDC?style=flat&logo=pytest&logoColor=white)](https://pytest.org/)
[![Vitest](https://img.shields.io/badge/Vitest-107%20Passed-729B1B?style=flat&logo=vitest&logoColor=white)](https://vitest.dev/)

**AI Developer Copilot** is a production-grade, local-first developer productivity assistant and codebase intelligence platform. Designed specifically for privacy-sensitive engineering environments, it runs completely offline using a local Large Language Model (`qwen2.5-coder:1.5b` via Ollama), ensuring that zero proprietary source code, prompts, chat dialogues, or credentials ever leave your machine.

Optimized for Apple Silicon (Mac M1, 8GB unified memory), the application combines high-throughput asynchronous Python processing (FastAPI) with a reactive, accessible single-page interface (React 19 + TypeScript + TanStack Query v5) and zero-dependency SVG visualizations.

---

## Key Capabilities (Phases 1-12)

| Phase | Feature | Description |
|---|---|---|
| **Phase 1** | **System Diagnostics & API Contracts** | Real-time health probes, service metadata discovery, and automated contract verification. |
| **Phase 2** | **AI Code Explanation Engine** | High-level logical summaries, sequential line-by-line breakdown, Big-O algorithmic complexity estimates, and typing recommendations. |
| **Phase 3** | **AI Code Review & Bug Detection** | Heuristic static flaw inspection, vulnerability detection, severity classifications, and hardened before/after code corrections. |
| **Phase 4** | **AI Code Optimization Engine** | Algorithmic tuning targeting performance, memory efficiency, readability, or maintainability with Big-O before/after comparisons. |
| **Phase 5** | **AI Unit Test Generator** | Automatic generation of framework-compatible test suites (pytest for Python, vitest for TypeScript/JavaScript) covering edge cases and happy paths. |
| **Phase 6** | **Conversational Coding Assistant** | Multi-turn dialog pair programmer with bounded sliding context history and code-context pinning. |
| **Phase 7** | **AI Repository Intelligence** | Server-allowlisted read-only codebase indexing, AST dependency inspection, entry-point detection, and multi-file contextual Q&A with grounded source citations. |
| **Phase 8** | **AI Bug Detection & Debugging Assistant** | Stack trace parsing (Python, JavaScript, React, FastAPI 422), root-cause hypothesis generation, and actionable diff recommendations. |
| **Phase 9** | **AI Code Refactoring Assistant** | Code smell detection (long functions, excessive nesting, duplication) and safe unified diff suggestions with cross-file caller impact analysis. |
| **Phase 10** | **AI Documentation Generator** | Multi-mode technical documentation generator (READMEs, OpenAPI/FastAPI endpoint docs, function/class docstrings, architecture summaries) with verified facts and assumptions. |
| **Phase 11** | **Productivity Dashboard & Observability** | High-throughput in-memory telemetry circular buffer (maxlen=5000), latency percentiles (Mean, Median, P95), time filtering (24h, 7d, 30d, all), and pure SVG performance charts. |
| **Phase 12** | **System Integration & Security Hardening** | 12-vector security verification, cross-feature workflow testing, strict privacy isolation, and interview/portfolio packaging. |

---

## Technology Stack

### Backend
- **Framework**: FastAPI (Asynchronous Python 3.14)
- **Validation**: Pydantic v2 (Strict request/response validation, language alias normalization, size bounds)
- **Local AI Inference**: Ollama HTTP API (POST /api/generate and /api/chat)
- **HTTP Client**: HTTPX (Async connection pooling, timeout normalization)
- **Testing**: Pytest, AnyIO, Starlette TestClient

### Frontend
- **Framework**: React 19 + TypeScript (Strict mode enabled)
- **Build Tool**: Vite 6 (Fast HMR and Rolldown-optimized client bundling)
- **Server State & Caching**: TanStack Query v5 (useFetchQuery, useCreateQuery)
- **HTTP Client**: Axios (Centralized interceptor, unified error normalization)
- **Visualizations**: Zero-dependency pure SVG charts (responsive, accessible, lightweight)
- **Testing**: Vitest, React Testing Library, JSDOM

### Local AI Model
- **Model**: qwen2.5-coder:1.5b (Q4_K_M quantized)
- **Runtime**: Local Ollama Daemon (http://localhost:11434)
- **Hardware Profile**: Apple Silicon Mac M1 (8GB unified memory)

---

## Security Hardening & Threat Model

The application enforces a multi-tier defense-in-depth model across all layers:

1. **Path Traversal Prevention**: Canonical path resolution via pathlib.Path.resolve(). Any request attempting to escape the approved repository root via ../, nested traversals, or absolute system paths is rejected immediately.
2. **Symlink Escape Mitigation**: Symlinks resolving outside the canonical repository root are detected and excluded from scanning and file retrieval.
3. **Automated Secret Exclusion**: Patterns including .env*, *.pem, *.key, id_rsa, *.p12, credentials.json, and database binaries are barred from indexing and cannot be read by the AI assistant.
4. **Prompt Injection Containment**: All user-submitted code and repository files are treated as untrusted data. Prompts are structured with strict delimiter boundaries to prevent untrusted code comments from overriding system instructions.
5. **Zero Arbitrary Code Execution**: The application operates exclusively as a static analysis and synthesis tool. Neither user code nor AI-generated suggestions or unit tests are executed on the host system (eval, exec, and subprocess calls are prohibited).
6. **Strict Telemetry Privacy Isolation**: The productivity metrics ring buffer records only operational metadata (duration_ms, outcome, feature, model). Prompts, source code snippets, chat messages, file contents, and API keys are strictly excluded from logging.

---

## Quick Start & Local Setup

### Prerequisites
- macOS (Apple Silicon M1/M2/M3 recommended) or Linux
- Python 3.11+ (Tested on Python 3.14)
- Node.js 18+ and npm
- Ollama installed and running (ollama serve)

### 1. Model Setup
Download the target code-specialized model:
```bash
ollama pull qwen2.5-coder:1.5b
```

### 2. Backend Installation & Startup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
Backend API will be accessible at: http://localhost:8000 (Swagger docs at /docs).

### 3. Frontend Installation & Startup
```bash
cd frontend
npm install

# Start Vite development server
npm run dev
```
Frontend interface will open at: http://localhost:5173.

### 4. Configuration (Optional)
To allow the Repository Intelligence Engine to analyze a local repository, configure APPROVED_REPOSITORY_ROOTS in .env:
```bash
APPROVED_REPOSITORY_ROOTS=myproject:/Users/username/Projects/myproject
```

---

## Automated Test Suite

### Running Backend Tests (Pytest)
```bash
cd backend
.venv/bin/pytest -v
```
**Results**: **190 passed, 0 failed** (1.21s execution time).

### Running Frontend Tests (Vitest)
```bash
cd frontend
npm test -- --run
```
**Results**: **107 passed, 0 failed** across 17 test suites (4.99s execution time).

### Running Static Checks & Production Build
```bash
cd frontend
npm run lint          # Oxlint (0 warnings, 0 errors across 106 files)
npm run build         # TypeScript typecheck (tsc -b) & Vite production build
```

---

## Performance Benchmarks (Mac M1, 8GB RAM)

- **Frontend Bundle Size**: 533 kB minified (139 kB gzip).
- **Frontend Build Time**: 143 ms.
- **Backend Test Suite Time**: 1.21 seconds for 190 tests.
- **Metrics Ingestion Throughput**: ~192,500 operations/sec.
- **Telemetry Query Latency**: < 1.05 ms for 5,000 capacity events.
- **Average Local Inference Latency**: ~1.8 - 3.2 seconds for code explanation & review on qwen2.5-coder:1.5b.

---

## Known Limitations & Future Improvements

- **Single Model Profile**: Currently pre-configured for qwen2.5-coder:1.5b. While other Ollama models work via environment settings, token generation limits and prompts are optimized for the 1.5B coder architecture.
- **In-Memory Telemetry Buffer**: Telemetry events are stored in a circular memory buffer (up to 5,000 events) and reset upon backend process restart. Persistent SQLite or DuckDB storage is slated for a future release.
- **Context Window Budget**: To prevent memory pressure on 8GB machines, repository multi-file context is capped at 8,000 characters and 5 priority files per query.

---

## License

MIT License. Designed and developed as a production-quality full-stack AI engineering portfolio project.
