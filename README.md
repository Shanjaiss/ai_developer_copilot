# AI Developer Copilot

[![Python](https://img.shields.io/badge/Python-3.14-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Pytest](https://img.shields.io/badge/Pytest-190%20Passed-0A9EDC?style=flat&logo=pytest&logoColor=white)](https://pytest.org/)
[![Vitest](https://img.shields.io/badge/Vitest-125%20Passed-729B1B?style=flat&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Ollama](https://img.shields.io/badge/Ollama-Qwen2.5--Coder%201.5B-black?style=flat&logo=ollama&logoColor=white)](https://ollama.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**AI Developer Copilot** is a production-grade, local-first developer productivity assistant and codebase intelligence platform. Built for privacy-conscious engineering environments, it executes 100% on-device using a local Large Language Model (`qwen2.5-coder:1.5b` via Ollama) — guaranteeing that zero proprietary code, prompts, chat dialogues, or credentials ever leave your machine.

Optimized for consumer hardware (Apple Silicon Mac M1 with 8GB unified memory), the platform bridges high-throughput asynchronous Python microservices (FastAPI + Pydantic v2) with a responsive, accessible single-page application (React 19 + TypeScript + TanStack Query v5) and zero-dependency SVG performance telemetry.

---

> [!IMPORTANT]
> **100% Local-First Privacy Boundary**  
> AI Developer Copilot is purposefully built as an on-device local development tool, **not a cloud-hosted SaaS**. All AI inferences, prompt evaluations, AST code parsing, and telemetry collection run entirely within your local machine via Ollama. No subscription, cloud API keys, or external network requests are required or permitted.

---

## 🎥 Video Demonstration

<!-- DEMO VIDEO PLACEHOLDER: Insert YouTube, Loom, or Vimeo walkthrough link below -->
> 📺 **Demo Walkthrough Video**: `[Insert Loom / YouTube Walkthrough Link Here]`
> 
> *A 5-7 minute demonstration showcasing all 10 AI productivity engines, local Ollama pair programming, AST repository intelligence, and real-time SVG telemetry charts.*

---

## 📸 Application Screenshots

<!-- SCREENSHOTS PLACEHOLDER: Place captured image files in docs/screenshots/ and link them here -->

| Feature View | Description | Screenshot Reference |
|---|---|---|
| **System Dashboard** | Real-time health probes, latency indicators, API contracts, and technology matrix. | `docs/screenshots/01-dashboard.png` *(Add screenshot)* |
| **Conversational AI Chat** | Multi-turn pair programming with context pinning and active dialogue memory. | `docs/screenshots/02-ai-chat.png` *(Add screenshot)* |
| **Repository Intelligence** | AST dependency inspection, bounded repository file tree, and grounded Q&A. | `docs/screenshots/03-repo-intel.png` *(Add screenshot)* |
| **Code Review & Optimizer** | Static flaw inspection, severity ratings, and before/after Big-O comparison. | `docs/screenshots/04-review-optimizer.png` *(Add screenshot)* |
| **Bug Detection & Debugger** | Traceback parsing, root-cause investigation, and contextual fix generation. | `docs/screenshots/05-debugger.png` *(Add screenshot)* |
| **Productivity Dashboard** | Real-time circular telemetry buffer, P95 latency percentiles, and SVG charts. | `docs/screenshots/06-productivity.png` *(Add screenshot)* |

---

## 🚀 Key Capabilities (Phases 1-12)

| Phase | Feature | Operational Scope | Live Status |
|:---:|---|---|:---:|
| **Phase 1** | **System Diagnostics & API Contracts** | Real-time health probes, service discovery, and automated contract verification. | **Verified** |
| **Phase 2** | **AI Code Explanation Engine** | High-level logical summaries, sequential line-by-line breakdown, and Big-O estimates. | **Verified** |
| **Phase 3** | **AI Code Review & Bug Detection** | Heuristic static flaw inspection, vulnerability detection, and hardened code fixes. | **Verified** |
| **Phase 4** | **AI Code Optimization Engine** | Algorithmic tuning targeting performance, memory, or readability with Big-O diffs. | **Verified** |
| **Phase 5** | **AI Unit Test Generator** | Automated test suites (pytest for Python, vitest for TypeScript/JavaScript). | **Verified** |
| **Phase 6** | **Conversational Coding Assistant** | Multi-turn dialog pair programmer with bounded sliding context history and code context. | **Verified** |
| **Phase 7** | **AI Repository Intelligence** | Read-only codebase indexing, AST dependency inspection, and grounded multi-file Q&A. | **Verified** |
| **Phase 8** | **AI Bug Detection & Debugging** | Stack trace parsing (Python, JS, React, FastAPI 422), root-cause investigation, and fixes. | **Verified** |
| **Phase 9** | **AI Code Refactoring Assistant** | Code smell detection (nesting, long functions, duplication) and unified diff previews. | **Verified** |
| **Phase 10** | **AI Documentation Generator** | Multi-mode technical documentation (READMEs, OpenAPI endpoint docs, docstrings). | **Verified** |
| **Phase 11** | **Productivity Dashboard & Observability** | In-memory telemetry buffer (maxlen=5,000), P95/Median latency, and responsive SVG charts. | **Verified** |
| **Phase 12** | **System Integration & Security Hardening** | 12-vector security model, path traversal guards, secret redaction, and portfolio release. | **Verified** |

---

## 🏛️ System Architecture

The platform enforces a strict unidirectional local-first communication pipeline with zero cloud dependencies:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT TIER (React 19 SPA)                     │
│  • React 19 + TypeScript + Vite 6 (Strict Mode)                        │
│  • TanStack Query v5 + Centralized Axios Client (60s Timeout)          │
│  • Responsive Design Tokens (Mobile, Tablet, Laptop, Desktop)          │
│  • Zero-Dependency SVG Telemetry Visualizations                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST / JSON (Port 5173 -> 8000)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND TIER (FastAPI ASGI)                     │
│  • FastAPI Asynchronous Pipeline (Python 3.14)                         │
│  • Pydantic v2 Request/Response Validation & Schema Sanitization       │
│  • AST Codebase Scanner & Dependency Graph Engine                      │
│  • Security Perimeter: Canonical Path Traversal & Symlink Guards       │
│  • In-Memory Circular Telemetry Buffer (maxlen=5,000, P95 / Median)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPX Async Client (Port 8000 -> 11434)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     LOCAL AI INFERENCE TIER (Ollama)                   │
│  • Local Ollama Daemon (http://localhost:11434)                        │
│  • Model: qwen2.5-coder:1.5b (Q4_K_M Quantized GGUF, 986 MB)          │
│  • 100% On-Device CPU/GPU Execution (Zero Cloud Data Transmission)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔒 Security Hardening & Threat Model

The application enforces a multi-tier defense-in-depth model across all layers:

1. **Path Traversal Prevention**: Canonical path resolution via `pathlib.Path.resolve()`. Any request attempting to escape the approved repository root via `../`, nested traversals, or absolute system paths is rejected immediately with HTTP 400.
2. **Symlink Escape Mitigation**: Symlinks resolving outside the canonical repository root are detected and excluded from scanning and file retrieval.
3. **Automated Secret Exclusion**: Patterns including `.env*`, `*.pem`, `*.key`, `id_rsa`, `*.p12`, `credentials.json`, and database binaries are barred from indexing and cannot be read by the AI assistant.
4. **Prompt Injection Containment**: All user-submitted code and repository files are treated as untrusted data. Prompts are structured with strict delimiter boundaries to prevent untrusted code comments from overriding system directives.
5. **Zero Arbitrary Code Execution**: The application operates exclusively as a static analysis and synthesis tool. Neither user code nor AI-generated suggestions or unit tests are executed on the host system (`eval`, `exec`, and `subprocess` calls are prohibited).
6. **Strict Telemetry Privacy Isolation**: The productivity metrics ring buffer records only operational metadata (`duration_ms`, `outcome`, `feature`, `model`). Prompts, source code snippets, chat messages, file contents, and API keys are strictly excluded from logging.

---

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI (Asynchronous Python 3.14)
- **Validation**: Pydantic v2 (Strict request/response validation, language alias normalization, size bounds)
- **Local AI Inference**: Ollama HTTP API (`/api/generate` and `/api/chat`)
- **HTTP Client**: HTTPX (Async connection pooling, 60s timeout normalization)
- **Testing**: Pytest, AnyIO, Starlette TestClient

### Frontend
- **Framework**: React 19 + TypeScript (Strict mode enabled)
- **Build Tool**: Vite 6 (Fast HMR and Rolldown-optimized client bundling)
- **Server State & Caching**: TanStack Query v5 (`useFetchQuery`, `useCreateQuery`)
- **HTTP Client**: Axios (Centralized interceptor, 60s client timeout, unified error normalization)
- **Visualizations**: Zero-dependency pure SVG charts (responsive, accessible, lightweight)
- **Testing**: Vitest, React Testing Library, JSDOM

### Local AI Model
- **Model**: `qwen2.5-coder:1.5b` (Q4_K_M quantized)
- **Runtime**: Local Ollama Daemon (`http://localhost:11434`)
- **Hardware Profile**: Apple Silicon Mac M1 (8GB unified memory)

---

## 🏁 Quick Start & Local Setup

### Prerequisites
- macOS (Apple Silicon M1/M2/M3 recommended) or Linux
- Python 3.11+ (Tested on Python 3.14)
- Node.js 18+ and npm
- Ollama installed and running (`ollama serve`)

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
Backend API will be accessible at: `http://localhost:8000` (Interactive Swagger docs at `/docs`).

### 3. Frontend Installation & Startup
```bash
cd frontend
npm install

# Start Vite development server
npm run dev
```
Frontend interface will open at: `http://localhost:5173`.

### 4. Repository Intelligence Configuration
To allow the Repository Intelligence Engine to analyze a local codebase, configure `APPROVED_REPOSITORY_ROOTS` in `.env`:
```bash
# Format: repository_id:/absolute/path/to/repo
APPROVED_REPOSITORY_ROOTS="my-project:/Users/username/Projects/my-project"
```
> [!NOTE]
> The server allowlist uses canonical path resolution (`pathlib.Path.resolve()`). Directory traversals (`../`) or symlinks resolving outside the approved root are rejected immediately. Sensitive files (`.env*`, `*.pem`, `*.key`, `credentials.json`) are automatically excluded from indexing.

---

## 🧪 Automated Test Suite & Quality Assurance

The application maintains a dual-framework test suite with **100% pass rate** across all layers:

### Running Backend Tests (Pytest)
```bash
cd backend
.venv/bin/pytest -v
```
**Results**: **190 passed, 0 failed, 0 skipped** (1.16s execution time).

### Running Frontend Tests (Vitest)
```bash
cd frontend
npm test -- --run
```
**Results**: **125 passed, 0 failed** across 19 test suites (5.39s execution time).

### Running Static Checks & Production Build
```bash
cd frontend
npm run lint          # Oxlint (0 warnings, 0 errors across 111 files in 49ms)
npm run build         # TypeScript typecheck (tsc -b) & Vite production build
```
**Results**: Clean production compilation in ~130ms (`dist/index.html`, `dist/assets/*.css`, `dist/assets/*.js`).

### Live Real Ollama AI Endpoints Verification
All 8 AI endpoints have been verified live against the local Ollama daemon:
- **Code Explain** (`POST /api/v1/ai/explain`): `200 OK` (~4.95s)
- **Code Review** (`POST /api/v1/ai/review`): `200 OK` (~4.44s)
- **Code Optimize** (`POST /api/v1/ai/optimize`): `200 OK` (~3.67s)
- **Generate Tests** (`POST /api/v1/ai/generate-tests`): `200 OK` (~6.53s)
- **AI Chat** (`POST /api/v1/ai/chat`): `200 OK` (~0.70s - 18s multi-turn)
- **Bug Detection** (`POST /api/v1/ai/debug`): `200 OK` (~6.55s)
- **Code Refactor** (`POST /api/v1/ai/refactor`): `200 OK` (~8.10s)
- **Generate Documentation** (`POST /api/v1/ai/generate-documentation`): `200 OK` (~6.76s)

---

## ⚡ Performance Benchmarks (Mac M1, 8GB RAM)

- **Frontend Production Bundle**: 537 kB minified (140 kB gzip)
- **Frontend Build Time**: ~125 - 136 ms
- **Backend Test Suite Time**: 1.16 seconds for 190 tests
- **Frontend Test Suite Time**: 5.39 seconds for 125 tests across 19 suites
- **Metrics Ingestion Throughput**: ~192,500 operations/sec
- **Telemetry Query Latency**: < 1.05 ms for 5,000 circular buffer events
- **Local AI Inference Latency**: ~0.7s - 8.1s on `qwen2.5-coder:1.5b` (Q4_K_M)

---

## 🔮 Future Enhancements Roadmap

- **PostgreSQL Persistence**: Migrate from the in-memory circular telemetry buffer to persistent relational storage for historical trends.
- **Advanced Embeddings & Vector RAG**: Integrate local ChromaDB or pgvector for multi-million-line codebase semantic indexing.
- **Containerized Deployment**: Multi-container Docker orchestration (`docker-compose`) for unified backend, frontend, and Ollama service deployment.

---

## 📄 License

MIT License. Designed and developed as a production-quality full-stack AI engineering portfolio project.
