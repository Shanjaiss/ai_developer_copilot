# Phase 8 — AI Bug Detection & Debugging Assistant

## 1. Overview & Architectural Purpose

Phase 8 introduces the **AI Bug Detection & Debugging Assistant** to AI Developer Copilot. Designed as a lightweight, privacy-preserving, local-first engine, this feature empowers engineers to diagnose runtime errors, exceptions, and stack traces with actionable root cause investigations and evidence-grounded fixes.

Key capabilities:
- **Multi-Runtime Stack Trace Decomposition**: Deterministically parses Python tracebacks, JavaScript/TypeScript/Node.js/V8 frames, FastAPI validation errors, and React rendering loops.
- **Dual-Mode Evidence Retrieval**:
  - **Repository-Aware Mode**: When an approved repository is selected, resolves stack frame paths against server-allowlisted repositories, extracts verified source windows around error line numbers, and binds references into structured grounded evidence.
  - **Standalone Mode**: Operates frictionlessly on arbitrary pasted errors or code snippets without requiring any repository configuration or server-side file access.
- **Confidence-Ranked Root Cause Analysis**: Generates structured hypotheses with qualitative confidence levels (`high`, `medium`, `low`) backed by concrete variable names and line citations.
- **Actionable Fix Synthesis & Verification**: Provides syntactically clean fix snippets with copy-to-clipboard functionality and ordered verification steps.
- **Iterative Debug Dialogue**: Supports bounded multi-turn follow-up conversations (up to 6 turns) to explore alternative solutions and edge-case mitigations.
- **Zero-Trust Security & Apple Silicon Optimization**: Redacts secrets via regex heuristics, validates repository path bounds using canonical resolution (`is_path_safe`), strictly prohibits arbitrary code execution, and operates within bounded token footprints tailored for Mac M1 8GB systems running local `qwen2.5-coder:1.5b`.

---

## 2. API Contract Specification

### `POST /api/v1/ai/debug`

#### Request Payload (`DebugRequest`)
| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `error_message` | string | Yes | 1–2000 chars, non-blank | Primary error message or exception title |
| `stack_trace` | string | No | <= 8000 chars | Raw execution traceback or stack trace |
| `language` | string | No | <= 50 chars | Language specifier (auto-detected if omitted) |
| `code_context` | string | No | <= 5000 chars | Relevant surrounding code snippet |
| `repository_id` | string | No | <= 100 chars | Server-approved repository ID |
| `conversation` | array | No | <= 6 turns | Bounded previous dialogue turns |

#### Response Payload (`DebugResponse`)
| Field | Type | Description |
|---|---|---|
| `summary` | string | High-level diagnostic summary explaining root trigger |
| `error_type` | string | Categorized error type (e.g. `KeyError`, `TypeError`, `HTTPException (422)`) |
| `language` | string | Detected or confirmed programming language |
| `parsed_frames` | array | Structured stack frames extracted from the trace |
| `root_causes` | array | Ranked root cause hypotheses with confidence ratings |
| `suggested_fixes` | array | Actionable fixes, code snippets, and verification checklists |
| `references` | array | Grounded source references supporting the analysis |
| `warnings` | array | Advisory notices and context-budget truncation warnings |
| `model` | string | LLM model identifier (`qwen2.5-coder:1.5b`) |
| `repository_used` | string \| null | Approved repository identifier if repo context was used |

---

## 3. Stack Trace Parsing Engine

The `StackTraceParser` in `backend/app/services/stack_trace_parser.py` implements regex heuristics to extract structured execution context:
1. **Python Tracebacks**:
   - Matches standard `File "<path>", line <line>, in <func>` frames and captures optional code lines.
   - Extracts terminal exception line (e.g. `KeyError: 'user_id'`).
2. **JavaScript / TypeScript / Node / React Traces**:
   - Matches V8 / Chrome format: `at <func> (<path>:<line>:<col>)` or `at <path>:<line>:<col>`.
   - Distinguishes TypeScript from JavaScript based on file extensions (`.ts`, `.tsx`).
   - Recognizes React specific render loop signatures (`Too many re-renders`, `Invalid hook call`).
3. **FastAPI & Validation Traces**:
   - Identifies Pydantic validation errors and HTTP 422 Unprocessable Entity payloads.

---

## 4. Privacy, Safety & Security Guarantees

1. **Strict No-Code-Execution Policy**: Neither user-provided error inputs nor model-suggested fix snippets are ever executed. Prompts and traces are handled strictly as passive strings.
2. **Deterministic In-Memory Secret Redaction**: Before any prompt generation or LLM dispatch, `redact_secrets` strips private keys, AWS access keys (`AKIA...`), GitHub personal access tokens (`ghp_...`), Bearer tokens, and auth credentials with `[REDACTED_SECRET]`.
3. **Filesystem Sandbox Enforcement**: Repository access is strictly confined to `settings.get_approved_repositories()`. Frame paths are validated via `is_path_safe(root, target)` which rejects symlink escapes, parent directory traversal (`..`), and absolute path escapes.
4. **Context & Resource Budgets**:
   - Total context sent to Ollama is capped at 8000 characters.
   - Conversation history is truncated to the most recent 6 turns.
   - Inference timeout is strictly bounded by `OLLAMA_TIMEOUT_SECONDS` (60s default).

---

## 5. Frontend User Experience

- **Header Navigation**: Added `🐛 AI Debugger` (`tab-debugging`) with responsive view switching.
- **Diagnostic Overview Header**: Displays classified error badge, language tag, active repository badge, and diagnostic summary.
- **Quick Sample Presets**: Instant one-click presets for common bugs (Python `KeyError`, JS `TypeError: Cannot read properties of undefined`, FastAPI `422 ValidationError`, React `Too many re-renders`).
- **Ranked Root Cause Cards**: Color-coded confidence badges (`High Confidence` in emerald, `Medium Confidence` in amber, `Low Confidence` in slate) with supporting evidence lists.
- **Actionable Fix Cards**: Formatted code snippets with copy-to-clipboard button and numbered verification steps checklist.
- **Evidence Viewer**: Displays grounded line-range citations and collapsible parsed frames table identifying repository vs external library code.
- **Iterative Dialogue**: Threaded follow-up discussion panel allowing interactive refinement within the same debug session.
- **Session Isolation**: Switching repositories or clicking "Clear" immediately invalidates in-flight responses via `sessionIdRef`.

---

## 6. Verification & Automated Test Coverage

- **Backend Pytest Suite**: 110 tests (22 dedicated Phase 8 tests in `backend/tests/test_ai_debugging.py` + 88 existing Phase 1–7 tests), 100% passing.
- **Frontend Vitest Suite**: 76 tests (8 dedicated Phase 8 tests in `frontend/src/features/debugging/__tests__/DebuggingView.test.tsx` + 68 existing Phase 1–7 tests), 100% passing.
- **Static Analysis & Builds**:
  - TypeScript compiler (`tsc -b --noEmit`): 0 errors.
  - Oxlint (`oxlint`): 0 warnings, 0 errors on 82 files.
  - Vite Production Build (`vite build`): Clean production artifact generation (454 kB JS, 14.9 kB CSS).

