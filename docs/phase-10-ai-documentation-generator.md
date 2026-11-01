# Phase 10 — AI Documentation Generator

## 1. Feature Overview & Architectural Purpose

Phase 10 introduces the **AI Documentation Generator** to the AI Developer Copilot suite. Designed as an additive, local-first, privacy-preserving engineering tool, this feature generates grounded, developer-friendly documentation from pasted code or server-allowlisted repositories, powered by the local Ollama model (`qwen2.5-coder:1.5b`) and the Phase 7 Repository Intelligence engine.

### Core Capabilities
- **Multi-Mode Documentation Synthesis**:
  - **Mode A (Pasted Code)**: Immediate extraction and documentation of functions, classes, and modules with zero repository configuration needed.
  - **Mode B (Repository README)**: Generates comprehensive project READMEs reflecting verified technology stacks, package scripts, entry points, and directory layouts.
  - **Mode C (API Endpoint Reference)**: Identifies HTTP methods, route paths, parameters, and request/response contracts from pasted API code or repository routing modules.
  - **Mode D (Architecture Summary)**: Synthesizes high-level system boundaries, module relationships, and data-flow explanations using Phase 7 repository metadata and dependency maps.
  - **Mode E (Selected File)**: Provides deep documentation for an individual repository source file, linking its exports with internal callers and dependencies.
- **Deterministic Static Extraction**:
  - Python AST visitor extracts functions, parameter type annotations, return types, class hierarchies, docstrings, and FastAPI route decorators.
  - JavaScript / TypeScript scanner extracts exported functions, classes, interfaces, types, and route definitions.
  - Manifest parser inspects `package.json`, `pyproject.toml`, and `requirements.txt` to verify confirmed dependencies and scripts.
- **Strict Evidence Grounding**:
  - Separates verified facts (supported by concrete code/manifest evidence) from reasonable assumptions and unknown information.
  - Never invents endpoints, configuration variables, installation commands, database schemas, or deployment instructions.
  - Explicitly states: *"Not verified from the available source files"* when evidence is absent.
- **Safe Markdown Rendering & Export**:
  - Interactive tabbed viewer featuring a **Rendered Markdown Preview** (without arbitrary script execution) and **Raw Markdown**.
  - One-click **Copy Markdown** and **Download .md** file (via client-side Blob URL generation).
- **Advisory Preview Security Model**:
  - Strictly read-only: Never modifies repository files, commits to Git, or executes code.
  - Automatic in-memory secret redaction (`redact_secrets`) strips API keys and credentials prior to model inference.
  - Memory-bounded token budgets (<= 8000 chars) optimized for Apple Silicon Mac M1 (8GB unified memory).

---

## 2. Architecture & Data Flow

```
+---------------------------------------------------------------------------------------------------+
|                                       FRONTEND WORKSPACE                                          |
|                                                                                                   |
|   +-------------------------------------------------------------------------------------------+   |
|   | DocumentationInputPanel                                                                   |   |
|   |  - Mode Switcher (Pasted Code | Repo README | API Reference | Architecture | Selected File)|  |
|   |  - Document Type, Audience, and Detail-Level Selectors                                    |   |
|   |  - Code Textarea / Approved Repository Selector / File Path Input                         |   |
|   +-------------------------------------------------------------------------------------------+   |
|                                                |                                                  |
|                                  HTTP POST /api/v1/ai/generate-documentation                      |
|                                                v                                                  |
+---------------------------------------------------------------------------------------------------+
|                                       BACKEND SERVICES                                            |
|                                                                                                   |
|   +-------------------------------------------------------------------------------------------+   |
|   | FastAPI AI Router (`POST /api/v1/ai/generate-documentation`)                              |   |
|   |  - Pydantic Validation: DocumentationRequest -> mode-specific checks                      |   |
|   +-------------------------------------------------------------------------------------------+   |
|                                                |                                                  |
|                                                v                                                  |
|   +-------------------------------------------------------------------------------------------+   |
|   | DocumentationService                                                                      |   |
|   |  1. Security Verification: Allowlist check & Path Traversal Prevention (`is_path_safe`)  |   |
|   |  2. Secret File Exclusion: Blocks access to `.env`, `.pem`, `.key`, `id_rsa`, etc.        |   |
|   |  3. Context Retrieval: Phase 7 `RepositoryScanner` + `RepositoryIntelligenceService`      |   |
|   |  4. Secret Redaction: `redact_secrets()` sanitizes API keys and tokens in-memory        |   |
|   |  5. Deterministic Static Extraction: `DocumentationExtractor` (AST & Manifest Parser)     |   |
|   |  6. Budget Enforcement: Truncates prompt to <= 8,000 characters                          |   |
|   |  7. Ollama AI Inference: Calls `qwen2.5-coder:1.5b` with strict grounding prompt          |   |
|   |  8. Resilient Fallback: Synthesizes static AST documentation if model repeats or fails    |   |
|   +-------------------------------------------------------------------------------------------+   |
|                                                |                                                  |
|                                                v                                                  |
+---------------------------------------------------------------------------------------------------+
|                                       FRONTEND DISPLAY                                            |
|                                                                                                   |
|   +-------------------------------------------------------------------------------------------+   |
|   | DocumentationMarkdownViewer                                                               |   |
|   |  - Rendered Preview vs Raw Markdown tabs                                                  |   |
|   |  - One-click Copy Markdown & Download .md action                                          |   |
|   +-------------------------------------------------------------------------------------------+   |
|   | DocumentationFactsAndAssumptions                                                          |   |
|   |  - Statically Verified Facts (Category, Fact, Evidence Citation)                          |   |
|   |  - Assumptions & Items Requiring Verification (Claim, Basis, Action)                      |   |
|   |  - Grounded Source References (Path, Lines, Snippet)                                      |   |
|   +-------------------------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Documentation Modes

### Mode A: Pasted Code Documentation (`pasted_code`)
- **Input**: User-pasted source code, language, documentation type, target audience, and detail level.
- **Processing**: Passes code through Python AST or JS/TS regex extractors. Extracts functions, parameters, classes, and docstrings.
- **Output**: Clean Markdown documentation explaining purpose, arguments, return values, and usage.

### Mode B: Repository README Generator (`repository_readme`)
- **Input**: Server-approved repository ID.
- **Processing**: Reuses Phase 7 `RepositoryScanner` to inspect repository structure and manifests (`package.json`, `pyproject.toml`, `requirements.txt`). Identifies confirmed scripts, entry points, and dependencies.
- **Output**: Standard GitHub-style README with project overview, verified tech stack, confirmed scripts, and known structure without fabricated commands.

### Mode C: API Documentation Generator (`api_documentation`)
- **Input**: Pasted API routing code OR an approved repository ID.
- **Processing**: Identifies `@router.get`, `@app.post`, Express routes, and Pydantic schemas. Extracts HTTP methods, URL paths, and query/path parameters.
- **Output**: Structured API endpoint reference with route tables and parameter specifications.

### Mode D: Architecture Documentation (`architecture_documentation`)
- **Input**: Server-approved repository ID.
- **Processing**: Combines repository file tree, language distributions, entry points, and cross-file import relationships.
- **Output**: High-level architectural summary describing primary subsystems, module responsibilities, and structural constraints.

### Mode E: Selected File Documentation (`selected_file`)
- **Input**: Server-approved repository ID + relative file path.
- **Processing**: Validates path safety (`is_path_safe`) and checks secret exclusions. Reads file content, runs static AST analysis, and queries Phase 7 `RepositoryIntelligenceService` for inbound callers (`imported_by`) and dependencies (`local_dependencies`).
- **Output**: Detailed file-level documentation highlighting exports, internal callers, and module boundaries.

---

## 4. API Contract Specification

### `POST /api/v1/ai/generate-documentation`

#### Request Payload (`DocumentationRequest`)
| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `mode` | string | Yes | `'pasted_code'` \| `'repository_readme'` \| `'api_documentation'` \| `'architecture_documentation'` \| `'selected_file'` | Documentation synthesis mode |
| `documentation_type` | string | Yes | `'readme'` \| `'api'` \| `'function'` \| `'class'` \| `'module'` \| `'architecture'` \| `'inline_docstring'` | Output documentation focus |
| `language` | string | No | <= 50 chars (aliases auto-normalized) | Programming language (e.g. `'python'`, `'typescript'`) |
| `code` | string | Conditional | <= 10,000 chars | Source code (required in `pasted_code` mode) |
| `repository_id` | string | Conditional | <= 100 chars | Approved repository ID (required in repo-aware modes) |
| `file_path` | string | Conditional | <= 500 chars | Repository-relative path (required in `selected_file` mode) |
| `audience` | string | No | `'developer'` \| `'architect'` \| `'technical_writer'` \| `'beginner'` (default `'developer'`) | Target reader persona |
| `detail_level` | string | No | `'concise'` \| `'standard'` \| `'comprehensive'` (default `'standard'`) | Depth of documentation |

#### Response Payload (`DocumentationResponse`)
| Field | Type | Description |
|---|---|---|
| `title` | string | Document title |
| `documentation_type` | string | Confirmed documentation type |
| `mode` | string | Confirmed generation mode |
| `language` | string \| null | Programming language analyzed |
| `markdown` | string | Generated GitHub-Flavored Markdown text |
| `sources` | array | Grounded file references with line ranges and reasons |
| `verified_facts` | array | Statically proven observations with citations |
| `assumptions` | array | Inferences, conventions, and items needing verification |
| `warnings` | array | Notices regarding context truncation or missing evidence |
| `model` | string | LLM identifier (`qwen2.5-coder:1.5b`) |
| `repository_used` | string \| null | Approved repository ID if used |
| `file_path_used` | string \| null | Repository-relative file path if used |

---

## 5. Security & Isolation Guarantees

1. **Advisory Preview Only**: Generated documentation is returned to the client as a passive text preview. The engine never modifies, creates, or overwrites files inside user repositories.
2. **Sandbox Path Traversal Prevention**: Every repository file request is checked against `is_path_safe(root, candidate)`. Traversal attempts (e.g. `../../../etc/passwd`), absolute path escapes, and symlink breakouts are strictly rejected with HTTP 400.
3. **Secret File Exclusion**: Sensitive files matching `EXCLUDED_FILE_NAMES` (`.env`, `.env.local`, `id_rsa`, etc.) or `EXCLUDED_PATTERNS` (`*.pem`, `*.key`, `*.sqlite`, `*.db`) are blocked from reading with HTTP 400.
4. **Deterministic In-Memory Secret Redaction**: Before assembling the LLM prompt, `redact_secrets` strips API keys, AWS tokens, GitHub tokens, Bearer tokens, and private keys with `[REDACTED_SECRET]`.
5. **No Arbitrary Code Execution**: Submitted source code and model proposals are handled strictly as inert text strings and are never evaluated or executed.
6. **Safe Client-Side Markdown**: The frontend Markdown viewer parses headings, lists, code blocks, and tables using React elements without invoking `dangerouslySetInnerHTML`.
7. **Session Isolation**: Switching documentation modes, selecting a different repository, or clearing inputs increments `sessionIdRef`, discarding any in-flight responses to prevent race conditions.

---

## 6. Verification & Automated Test Coverage

- **Backend Pytest Suite**: 159 tests (21 dedicated Phase 10 tests in `backend/tests/test_ai_documentation.py` + 138 existing Phase 1–9 tests), **100% passing in 1.16s**.
- **Frontend Vitest Suite**: 96 tests (10 dedicated Phase 10 tests in `frontend/src/features/documentation/__tests__/DocumentationView.test.tsx` + 86 existing Phase 1–9 tests), **100% passing in 4.42s**.
- **TypeScript Compiler**: `npx tsc -b --noEmit` -> **0 errors**.
- **Linter**: `oxlint` -> **0 warnings, 0 errors** across 96 files.
- **Production Build**: `npm run build` -> Clean Vite production bundle in **122ms**.

---

## 7. Live Ollama Verification (`qwen2.5-coder:1.5b`)

Live inference tests conducted against local Ollama (`http://localhost:11434`):

| Test | Target Scenario | Language | Status | Latency | Verified Evidence | Markdown Output Quality |
|---|---|---|---|---|---|---|
| **Test A** | Python Discount Total Function | Python | 200 OK | 14.31s | 2 verified facts, 2 assumptions | Clean Markdown with parameters, logic summary, and return types |
| **Test B** | React Metric Card Component | TypeScript / React | 200 OK | 9.09s | 2 verified facts, 1 source ref | Handled repeat limit via resilient static fallback; produced complete component overview |
| **Test C** | FastAPI Catalog Routes | Python | 200 OK | 3.34s | 2 verified endpoints (`GET`, `POST`) | Generated complete API reference with route specifications and descriptions |
| **Test D** | Repository README | N/A | N/A | N/A | N/A | **NOT TESTED** (No real user repository allowlisted; synthetic test repos verified in automated test suite) |
| **Test E** | Repository Architecture | N/A | N/A | N/A | N/A | **NOT TESTED** (No real user repository allowlisted; synthetic test repos verified in automated test suite) |

---

## 8. Known Limitations & Interview-Ready Explanation

### Known Limitations
1. **Model Context Window**: The local `qwen2.5-coder:1.5b` operates within a strict context budget (<= 8,000 characters). Large repositories are summarized at the module level rather than attempting exhaustive whole-repo multi-file embedding.
2. **Regex-Based Secret Redaction**: Deterministic regex patterns capture common API key and token signatures (AWS, GitHub, JWT, Bearer tokens). High-entropy proprietary secrets without distinct formatting may not be caught.
3. **No Dynamic Runtime Inspection**: API route contracts and types are parsed via static AST and lexical analysis. Dynamic runtime monkey-patching or complex metaprogramming is marked as unverified.

### Interview-Ready Technical Summary
> *"In Phase 10, we built an advisory AI Documentation Generator optimized for privacy and local execution on an 8GB Apple Silicon M1 Mac. Instead of relying on heavy cloud embeddings or external vector databases, we leveraged a hybrid architecture: deterministic static AST analysis (for Python) and manifest parsing (for Node/npm) to extract verified facts upfront, combined with bounded prompt synthesis against the local `qwen2.5-coder:1.5b` model. By separating verified facts from model assumptions, enforcing strict sandbox boundaries (`is_path_safe`, secret file exclusion), and providing safe client-side Markdown rendering and Blob export, the system delivers grounded technical documentation without hallucinating endpoints or modifying source repositories."*

