# Phase 9 — AI Code Refactoring Assistant

## 1. Overview & Architectural Purpose

Phase 9 introduces the **AI Code Refactoring Assistant** to the AI Developer Copilot suite. Designed as an additive, local-first, privacy-preserving engineering tool, this feature helps developers identify maintainability problems, discover refactoring opportunities, review code smell evidence, and inspect deterministic before/after diffs before manually applying improvements.

### Key Capabilities
- **Dual Refactoring Modes**:
  - **Mode A (Pasted Code)**: Instant analysis and refactoring of arbitrary developer-supplied code snippets across Python, JavaScript, TypeScript, and React with zero repository setup required.
  - **Mode B (Repository-Aware File Refactoring)**: In-depth refactoring of server-allowlisted repository files with automatic cross-file impact analysis (callers and dependencies) leveraging Phase 7 Repository Intelligence.
- **Hybrid Code Smell Detection**:
  - **Python AST Visitor**: Inspects Abstract Syntax Trees (`ast.parse`) for deep nesting (>3), long functions (>40 lines), high parameter coupling (>4 parameters), complex boolean conditionals (>3 operators), and duplicated constants.
  - **JS / TS / React Heuristics**: Deterministically detects deeply nested indentation, long functions, nested ternary operator chains, and monolithic multi-state React components.
  - **Graceful Syntax Tolerance**: Degrades gracefully to heuristic pattern matching if code has intentional syntax fragments or incomplete snippets.
- **Deterministic In-Memory Unified Diffs**:
  - Computes standard line-by-line unified diffs via Python's standard library `difflib.unified_diff`.
  - Zero disk writes, zero git subprocess invocations, and zero file modification.
- **Bounded Interactive Dialogue**:
  - Supports iterative follow-up questions and alternative refactoring strategies (up to 6 conversational turns, capped at 8000 characters).
- **Strictly Advisory Security Model**:
  - **Never modifies source files**: All refactorings are presented as read-only proposals.
  - **Never executes AI code**: Model suggestions are treated purely as passive text.
  - **In-memory secret redaction**: Eliminates API keys, passwords, and private tokens prior to LLM dispatch.
  - **Hardware Optimized**: Fully bounded memory and context footprints tailored for Apple Silicon Mac M1 (8GB unified memory) running `qwen2.5-coder:1.5b`.

---

## 2. API Contract Specification

### `POST /api/v1/ai/refactor`

#### Request Payload (`RefactorRequest`)
| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `mode` | string | No | `'pasted_code'` \| `'repository_file'` (defaults to `'pasted_code'`) | Analysis and retrieval mode |
| `code` | string | Mode A | <= 10000 chars | Source code snippet to analyze (required in pasted mode) |
| `language` | string | No | <= 50 chars (defaults to `'python'`) | Programming language identifier or alias |
| `refactor_goal` | string | No | <= 1000 chars | Targeted refactoring objective (e.g., extract helper functions) |
| `repository_id` | string | Mode B | <= 100 chars | Server-approved repository ID (required in repo mode) |
| `file_path` | string | Mode B | <= 500 chars | Relative path to repository target file (required in repo mode) |
| `code_range` | string | No | e.g. `'10-50'` | Optional 1-indexed line range to isolate within file |
| `conversation` | array | No | <= 6 turns | Bounded previous dialogue turns for iterative refinement |

#### Response Payload (`RefactorResponse`)
| Field | Type | Description |
|---|---|---|
| `summary` | string | Architectural summary of the refactoring strategy and improvements |
| `language` | string | Confirmed programming language |
| `mode` | string | Mode used for analysis (`pasted_code` or `repository_file`) |
| `code_smells` | array | List of detected code smells with severity, line number, and evidence |
| `refactorings` | array | List of concrete refactoring proposals with diffs, benefits, and risks |
| `cross_file_impacts` | array | Cross-file dependency analysis identifying callers and dependencies |
| `references` | array | Grounded file references and line citations |
| `warnings` | array | Advisory notices regarding context truncation, syntax errors, or parsing limits |
| `model` | string | LLM model identifier (`qwen2.5-coder:1.5b`) |
| `repository_used` | string \| null | Approved repository identifier if repo mode was executed |
| `file_path_used` | string \| null | Target file path if repo mode was executed |

---

## 3. Code Smell Detection Engine

The `CodeSmellAnalyzer` in `backend/app/services/code_smell_analyzer.py` provides deterministic static code analysis prior to LLM invocation:

1. **Python AST Analysis**:
   - `long_function`: Identifies functions exceeding 40 lines of code.
   - `excessive_nesting`: Walks control structures (`If`, `For`, `While`, `Try`, `With`) to flag blocks nested deeper than 3 levels.
   - `high_coupling`: Detects functions with more than 4 positional/keyword parameters.
   - `complex_conditional`: Flags `If` statements with boolean operation counts exceeding 2 (e.g. `a and b and c and d`).
   - `repeated_constants`: Identifies string or integer literals repeated across the code snippet, recommending constant extraction.
   - `SyntaxError` Fallback: If `ast.parse` fails (e.g. partial snippet or JSX in Python mode), falls back to regex and indentation heuristic scanning without crashing.

2. **JavaScript / TypeScript / React Analysis**:
   - Analyzes indentation levels to detect excessive nesting (4+ levels of indentation).
   - Identifies functions exceeding 40 lines.
   - Detects nested ternary operator chains (`? ... : ... ? ... :`).
   - Recognizes complex boolean expressions with multiple logical operators (`&&`, `||`).
   - Detects monolithic React components with 4+ `useState` calls and over 50 lines.

Each detected smell is classified with a severity rating (`high`, `medium`, `low`), line citation, and supporting code evidence.

---

## 4. Repository-Aware Refactoring & Cross-File Impact

In **Repository File Mode** (`mode="repository_file"`), the engine connects seamlessly with Phase 7's `RepositoryIntelligenceService`:

1. **Security & Sandbox Validation**:
   - Resolves target file path against approved repository roots using `is_path_safe`.
   - Rejects path traversal (`..`), symlink escapes, absolute paths, and secret files (`.env`, `.pem`, etc.).
2. **Context Extraction & Line Windowing**:
   - Reads repository file content with bounded byte limits (<= 100KB).
   - If `code_range` is provided (e.g., `20-65`), slices target lines with 10 lines of surrounding context to preserve scope.
3. **Cross-File Impact Analysis**:
   - Uses `RepositoryIntelligenceService.get_file_dependencies()` to retrieve:
     - **Inbound Callers (`imported_by`)**: Files in the repository that import the current module and might be affected by signature changes.
     - **Outbound Dependencies (`local_dependencies`)**: Internal repository modules imported by the target file.
   - Surfaces these impacts in `CrossFileImpact` cards so developers can anticipate ripple effects before refactoring.

---

## 5. Deterministic Unified Line Diff Generation

All code diffs are generated via Python's standard library:
```python
diff_lines = list(
    difflib.unified_diff(
        original.splitlines(keepends=True),
        refactored.splitlines(keepends=True),
        fromfile="original",
        tofile="refactored",
        lineterm="",
    )
)
```
- **Zero subprocess calls**: No `git diff` execution on disk.
- **Frontend Syntax Coloration**: In `RefactoringDiffViewer.tsx`, lines starting with `+` are styled with green additions, `-` with red deletions, `@@` with cyan hunk headers, and ` ` with neutral context.
- **Tabbed Views**: Users can toggle effortlessly between **Unified Diff**, **Proposed Code**, and **Original Code**.

---

## 6. Privacy, Safety & Sandboxing Guarantees

1. **Strict Advisory Disclaimer**: AI suggestions are strictly advisory. The system does not write to the repository, create commits, or execute generated code.
2. **In-Memory Secret Redaction**: Before assembling the LLM prompt, `redact_secrets` strips private keys, AWS tokens, GitHub personal access tokens, JWTs, and passwords.
3. **Prompt Injection Mitigation**: Code and repository content are wrapped in deterministic boundary delimiters (`<<<CODE_TO_REFACTOR>>>`, `<<<REFACTOR_GOAL>>>`) and system instructions prohibit execution.
4. **Context Budget Enforcement**: Total context sent to Ollama is capped at 8000 characters. History is truncated to the most recent 6 dialogue turns.

---

## 7. Frontend User Experience

- **Header Navigation**: Added `🔄 AI Refactor` (`tab-refactoring`) with active tab state and badge update (`Phase 9 • AI Refactor`).
- **Mode Switcher**: Dual-button toggle between **Pasted Code Mode** and **Repository File Mode**.
- **Quick Presets**: Instant one-click presets for common refactorings:
  - Python: Nested Discount Logic (Extract pure helpers).
  - JavaScript: Nested Ternary Elimination (Guard clauses).
  - TypeScript: Duplicate Validation (Extract validation schema).
  - React: Monolithic Component (Sub-component extraction).
- **Code Smells Card**: Displays detected smells with severity badges, line citations, and code evidence.
- **Refactoring Diff Viewer**: Unified line diff with colored additions/deletions, copy-to-clipboard button, benefits list, potential risks, and verification checklist.
- **Cross-File Impact Card**: Highlights inbound callers and dependencies in repository mode.
- **Iterative Dialogue Section**: Follow-up chat panel allowing interactive dialogue with the assistant.
- **Session Isolation**: Switching modes, changing repositories, or clicking "Clear" immediately invalidates in-flight requests using `sessionIdRef`.

---

## 8. Verification & Automated Test Coverage

- **Backend Pytest Suite**: 138 tests (28 dedicated Phase 9 tests in `backend/tests/test_ai_refactoring.py` + 110 existing Phase 1–8 tests), 100% passing.
- **Frontend Vitest Suite**: 86 tests (10 dedicated Phase 9 tests in `frontend/src/features/refactoring/__tests__/RefactoringView.test.tsx` + 76 existing Phase 1–8 tests), 100% passing.
- **Static Analysis & Builds**:
  - TypeScript compiler (`tsc -b --noEmit`): 0 errors.
  - Oxlint (`oxlint`): 0 warnings, 0 errors on 90 files.
  - Vite Production Build (`vite build`): Clean production artifact generation (486 kB JS, 14.9 kB CSS in 121ms).

