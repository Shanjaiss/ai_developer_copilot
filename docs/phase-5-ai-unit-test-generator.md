# Phase 5 — AI Unit Test Generator

## 1. What Unit Testing Is

Unit testing is the disciplined software engineering practice of isolating the smallest testable parts of an application (individual functions, methods, procedures, or classes) and systematically verifying that their observable behaviors match precise expectations across normal, boundary, and error conditions.

A true unit test exhibits the following properties:
- **Isolation**: The unit under test is decoupled from external infrastructure such as physical disks, live databases, network sockets, third-party APIs, and environmental side effects. External collaborators are substituted with test doubles (stubs, mocks, fakes, or spies).
- **Determinism**: Given identical inputs and mock states, the test yields the exact same pass/fail outcome on every execution, completely independent of execution order or system clock quirks.
- **Speed**: Executed in milliseconds in-memory, enabling developers to run hundreds of tests on every file save without interrupting the flow of development.
- **Single Reason to Fail**: Each individual test case asserts a single behavioral invariant. When a test fails, the defect location is immediately obvious.

---

## 2. Why Unit Tests Matter in Product Companies

In modern software product companies, automated unit testing is not merely a quality assurance mechanism; it is an economic and architectural necessity:

1. **Defect Cost Reduction (Shift-Left Testing)**: According to empirical industry benchmarks (Boehm's Law), fixing a defect caught in a local unit test costs $10\times$ to $100\times$ less than remediating the same bug in production or staging environments.
2. **Refactoring Safety Net**: High unit test coverage empowers engineers to optimize algorithms, refactor technical debt, and upgrade dependencies with confidence that existing contracts remain unbroken.
3. **Executable Documentation & Living Specifications**: High-quality unit tests serve as authoritative, always-up-to-date documentation explaining how functions are intended to be consumed, what inputs are legal, and what exceptions are thrown.
4. **Continuous Integration & Delivery (CI/CD)**: Rapid unit test suites gate git merges and deployments, preventing regressions from leaking into staging and production branches.
5. **Decoupled Architecture**: Code that is difficult to unit test almost always suffers from excessive coupling, hidden dependencies, and violated Single Responsibility principles. Designing for testability drives clean architecture.

---

## 3. Python pytest Fundamentals

`pytest` is the de facto standard testing framework in the modern Python ecosystem.

### Core Mechanisms
- **Zero-Boilerplate Test Discovery**: Automatically discovers any file matching `test_*.py` or `*_test.py`, running functions prefixed with `test_*`. No need to inherit from `unittest.TestCase`.
- **Idiomatic Python Assertions**: Uses standard Python `assert <expression>, <optional_message>`. Pytest inspects the Abstract Syntax Tree (AST) to provide rich expression introspection upon failure, showing variable values on either side of the operator.
- **Dependency Injection via Fixtures**:
  ```python
  import pytest

  @pytest.fixture
  def sample_user():
      return {"id": "usr_101", "role": "admin"}

  def test_user_permission(sample_user):
      assert sample_user["role"] == "admin"
  ```
- **Parametrized Testing**:
  ```python
  @pytest.mark.parametrize("val,expected", [(2, True), (3, False), (0, True)])
  def test_is_even(val, expected):
      assert is_even(val) == expected
  ```
- **Exception Verification**:
  ```python
  def test_divide_by_zero():
      with pytest.raises(ZeroDivisionError):
          divide(10, 0)
  ```

---

## 4. JavaScript & TypeScript Vitest Fundamentals

`Vitest` is a next-generation, high-performance unit test runner engineered natively on top of Vite.

### Core Mechanisms
- **Instant HMR & Native ESM / TypeScript Execution**: Out of the box, Vitest executes TypeScript, JSX, and modern ESM syntax without requiring separate transpilation steps like Babel or ts-node.
- **Jest-Compatible API**: Implements standard BDD syntax:
  ```typescript
  import { describe, it, expect, vi } from 'vitest';
  import { greet } from './greet';

  describe('greet function', () => {
    it('returns a formatted greeting message', () => {
      const result = greet('Alice');
      expect(result).toBe('Hello, Alice');
    });
  });
  ```
- **Built-in Mocking (`vi`)**:
  ```typescript
  const mockCallback = vi.fn((x: number) => x * 2);
  mockCallback(5);
  expect(mockCallback).toHaveBeenCalledWith(5);
  expect(mockCallback).toHaveReturnedWith(10);
  ```
- **Snapshot Testing & In-Source Testing**: Supports instant regression catching via inline and file-based snapshots.

---

## 5. AI-Assisted Test Generation

Traditional manual test authoring is often neglected under tight delivery schedules. AI-assisted test generation bridges this gap by reading source code contracts and automating boilerplate test creation.

### Antigravity Copilot Synthesis Paradigm
Rather than generating opaque code blobs, Antigravity decomposes test generation into structured semantic artifacts:
1. **Observable Behavior Identification**: Identifies the primary function contract, expected return values, and parameters.
2. **Boundary Condition Probing**: Evaluates extreme inputs (zeros, negative integers, null/empty collections, floating-point precision limits).
3. **Structured Test Case Catalog**: Extracts discrete metadata (`name`, `category`, `description`, `expected_behavior`) alongside full code.
4. **Coverage Intentions & Assumptions**: Details the reasoning behind chosen assertions and assumptions made regarding types.
5. **Mandatory Unexecuted Caveats**: Transparently notes that AI-generated tests are unexecuted draft candidates requiring human engineering review.

---

## 6. Backend Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Backend Engine                          │
│                                                                        │
│  [POST /api/v1/ai/generate-tests]                                      │
│           │                                                            │
│           ▼                                                            │
│  app/routers/ai.py                                                     │
│    - Validates GenerateTestsRequest                                    │
│    - Rejects incompatible pairings (e.g. Python + Vitest -> HTTP 422)  │
│           │                                                            │
│           ▼                                                            │
│  app/services/ollama_service.py (OllamaService)                        │
│    - build_test_generation_prompt(...)                                 │
│    - Enforces format="json"                                            │
│    - Dispatches to shared _generate_json()                             │
│    - Cleans markdown fences & repairs malformed model output           │
│    - Extracts test cases, notes, assumptions, & disclaimers            │
│           │                                                            │
│           ▼ HTTP POST /api/generate                                    │
│  Local Ollama Daemon (Port 11434, qwen2.5-coder:1.5b)                  │
│    - Pure inert text synthesis (ZERO host execution)                  │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Modules:
- **`app/schemas/ai.py`**:
  - `TestFramework`: Enum / Literal (`"pytest"`, `"vitest"`)
  - `TestFocus`: Enum / Literal (`"basic"`, `"edge_cases"`, `"error_handling"`, `"comprehensive"`)
  - `GenerateTestsRequest`: Validates code length ($\le 5000$ chars), non-empty code, and enforces language/framework pairing via `@model_validator(mode="after")`.
  - `GeneratedTestCase`: Encapsulates `name`, `category`, `description`, `expected_behavior`.
  - `GenerateTestsResponse`: Typed envelope with summary, structured test cases, complete code, coverage notes, assumptions, and warnings.
- **`app/services/ollama_service.py`**:
  - `build_test_generation_prompt()`: Contextualizes role as Principal QA Automation Engineer, injecting target framework rules (e.g., standard `assert` vs `expect().toBe()`), test focus instructions, and JSON schema requirements.
  - `generate_tests()`: Calls shared HTTP client, validates model response, and guarantees security disclaimers.
- **`app/routers/ai.py`**: Registers endpoint under `/api/v1/ai/generate-tests`.

---

## 7. Frontend Architecture

The frontend follows the clean feature-based architecture in `frontend/src/features/test-generator/`:

```
src/features/test-generator/
├── TestGeneratorView.tsx               # Orchestrator & TanStack Query coordinator
├── components/
│   ├── TestGeneratorInputSection.tsx   # Code editor, language/framework selectors, focus pills, presets
│   ├── GeneratedTestCasesSection.tsx   # Structured test case cards with category badges
│   ├── GeneratedTestCodeSection.tsx    # Syntax code block, line counter, copy to clipboard
│   └── TestCoverageNotesSection.tsx    # Coverage intentions, synthesizer assumptions, security warning
└── __tests__/
    └── TestGeneratorView.test.tsx      # Comprehensive Vitest integration suite
```

### State & Hook Integration:
- Uses the project's standard `useCreateQuery<GenerateTestsResponse, GenerateTestsRequest>({ url: API_ENDPOINTS.AI_GENERATE_TESTS })`.
- Auto-syncs framework selection when language changes (Python $\to$ `pytest`, JavaScript/TypeScript $\to$ `vitest`).
- Tracks `submittedCode` to display a subtle alert if the user modifies code in the editor after generating tests.
- Reusable UI buttons and accessibility attributes (`aria-label`, `role="radiogroup"`, `role="tab"`).

---

## 8. API Request/Response Contract

### Request: `POST /api/v1/ai/generate-tests`

```json
{
  "code": "def add(a, b):\n    return a + b",
  "language": "python",
  "framework": "pytest",
  "test_focus": "comprehensive"
}
```

#### Field Specifications:
- `code` (*string, required*): 1–5,000 characters of source code to generate unit tests for.
- `language` (*string, required*): Target programming language (`"python"`, `"javascript"`, `"typescript"`).
- `framework` (*string, required*): Testing framework (`"pytest"`, `"vitest"`).
- `test_focus` (*string, optional*): Focus dimension (`"basic"`, `"edge_cases"`, `"error_handling"`, `"comprehensive"`). Defaults to `"comprehensive"`.

### Response: `HTTP 200 OK`

```json
{
  "summary": "Generated 3 pytest unit tests covering normal arithmetic addition and boundary values.",
  "language": "python",
  "framework": "pytest",
  "test_focus": "comprehensive",
  "generated_test_code": "import pytest\n\ndef test_add_positive_numbers():\n    assert add(2, 3) == 5\n\ndef test_add_negative_numbers():\n    assert add(-2, -3) == -5\n\ndef test_add_zero():\n    assert add(0, 0) == 0\n",
  "test_cases": [
    {
      "name": "test_add_positive_numbers",
      "category": "normal",
      "description": "Checks addition of two positive integers.",
      "expected_behavior": "Returns the arithmetic sum of both inputs."
    },
    {
      "name": "test_add_negative_numbers",
      "category": "edge_case",
      "description": "Checks negative number inputs.",
      "expected_behavior": "Returns the correct negative sum."
    },
    {
      "name": "test_add_zero",
      "category": "edge_case",
      "description": "Checks zero boundary inputs.",
      "expected_behavior": "Returns 0 when both operands are 0."
    }
  ],
  "coverage_notes": [
    "Positive, negative, and zero inputs are tested.",
    "Normal execution path verified."
  ],
  "assumptions": [
    "The function accepts numeric arguments."
  ],
  "warnings": [
    "Generated tests have not been executed or verified against the source code."
  ]
}
```

---

## 9. Ollama Prompt Strategy

Generating high-quality unit tests with a compact local model (`qwen2.5-coder:1.5b`) on an 8GB M1 Mac requires disciplined prompt engineering:

1. **Role Contextualization**: Positions the model as a Senior QA Automation Engineer and Software Architect.
2. **Untrusted Data Isolation**: Encloses user source code inside distinct `<source_code>` XML-like delimiters to prevent prompt injection and instruction confusion.
3. **Strict Idiom Instructions**:
   - For `pytest`: Require plain `def test_*():` functions using Python's native `assert` statement and `with pytest.raises(ExpectedException):`. Forbid importing nonexistent libraries.
   - For `vitest`: Require `describe`, `it`, `expect` syntax from `'vitest'`. Require idiomatic assertions like `.toBe()`, `.toEqual()`.
4. **Behavioral Grounding**: Instructs the model to test only observable behavior. Explicitly forbids inventing hallucinated exceptions, external network calls, real credentials, or arbitrary dependencies.
5. **JSON Schema Enforcement**: Requests strict JSON matching the Pydantic schema, with fallback repair mechanisms in Python if minor JSON markdown fences or trailing commas occur.

---

## 10. Security Limitations & Non-Execution Guarantee

### The Critical Security Principle
**Under NO circumstances does the backend, frontend, or test suite execute arbitrary user-submitted or AI-generated code.**

- **Zero Host Execution**: No use of `exec()`, `eval()`, `subprocess.run()`, shell spawning, dynamic imports, or background runner containers.
- **Inert Text Storage**: Model output is parsed purely as text data, validated through Pydantic models, and rendered as static text code blocks in React.
- **Automated Test Isolation**: Pytest and Vitest test suites exclusively use controlled mock fixtures. A dedicated canary security test (`test_no_arbitrary_code_execution_of_generated_code`) verifies that executable constructs (such as file creation or OS deletion calls) injected into model mocks are never triggered.
- **No Sensitive Leakage**: Prompts do not log source code or secret credentials.

---

## 11. Testing and Verification Results

### Backend Pytest Suite
- **52 passed** in 0.65s (100% pass rate).
- Full regression verification across all 5 phases:
  - Phase 1: `test_main.py` (5 passed)
  - Phase 2: `test_ai_router.py` (10 passed)
  - Phase 3: `test_ai_review.py` (11 passed)
  - Phase 4: `test_ai_optimizer.py` (11 passed)
  - Phase 5: `test_ai_test_generator.py` (15 passed)

### Frontend Vitest Suite
- **50 passed** across 10 test files in 3.07s.
- Includes 9 feature integration tests for `TestGeneratorView.test.tsx`:
  - Initial view rendering & component mounting
  - Language and framework selection
  - Automatic language/framework compatibility synchronization
  - Test focus selection (Basic, Edge Cases, Error Handling, Comprehensive)
  - Payload submission and response schema rendering
  - Skeleton loading state and button disablement
  - API error handling with retry trigger
  - Clipboard copy action with temporary visual confirmation
  - Presets loading and input clearing

### Static Analysis & Build
- `oxlint`: 0 warnings, 0 errors across 59 files.
- `tsc -b && vite build`: Production bundle compiled cleanly in 120ms.

---

## 12. Example Requests and Responses

### Example A: Python `add()`
- **Request**:
  ```json
  {
    "code": "def add(a, b):\n    return a + b",
    "language": "python",
    "framework": "pytest",
    "test_focus": "comprehensive"
  }
  ```
- **Generated Test**:
  ```python
  import pytest

  def test_add_positive_numbers():
      assert add(2, 3) == 5

  def test_add_negative_numbers():
      assert add(-2, -3) == -5

  def test_add_zero():
      assert add(0, 0) == 0
  ```

### Example B: TypeScript `greet()`
- **Request**:
  ```json
  {
    "code": "export function greet(name: string): string {\n  return `Hello, ${name}`;\n}",
    "language": "typescript",
    "framework": "vitest",
    "test_focus": "comprehensive"
  }
  ```
- **Generated Test**:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { greet } from './greet';

  describe('greet', () => {
    it('returns formatted greeting message', () => {
      expect(greet('Alice')).toBe('Hello, Alice');
    });
  });
  ```

---

## 13. Common AI Test-Generation Mistakes & Mitigations

| AI Mistake | Why It Happens | Antigravity Mitigation |
|:---|:---|:---|
| **Hallucinated Assertions** | Model assumes unstated business logic (e.g. asserting `add("a", "b")` throws an error). | System prompt instructs: *"Assert only behavior supported by the source code. Do not invent unprompted exceptions."* |
| **Framework Mismatch** | Model outputs `unittest.TestCase` or `jest.fn()` instead of requested framework. | Strict framework instructions in prompt: *"For vitest: import from 'vitest'. For pytest: use def test_*() and plain assert."* |
| **Testing Implementation Details** | Tests private internal variables rather than public observable inputs and outputs. | Model instructed to test observable function contracts and return values. |
| **Fabricated Coverage Claims** | Claiming "100% line and branch coverage" without executing code. | Response schema substitutes fabricated percentages with qualitative `coverage_notes` and mandatory unexecuted disclaimers. |
| **Missing Negative / Edge Cases** | Defaulting to only standard happy-path cases. | Four explicit test focuses (`basic`, `edge_cases`, `error_handling`, `comprehensive`) with distinct system instructions. |

---

## 14. Technical Interview Questions & Answers

### Q1: Why should an AI unit test generator never execute generated code automatically?
**Answer**:
Executing AI-generated code without containerized, capability-restricted sandboxing presents a severe Remote Code Execution (RCE) risk. A malicious user could submit code or prompt injections that prompt the AI to generate destructive disk operations (e.g., `os.remove`), shell commands, or unauthorized network requests. Even without malicious intent, hallucinated loops can cause Denial of Service (DoS) by consuming all host CPU and memory. Generated tests must remain static draft text until the engineer inspects and authorizes execution in a sandboxed test runner.

### Q2: How does Vitest differ from Jest in architecture and performance?
**Answer**:
Jest requires a separate transpilation layer (ts-jest or Babel) to convert TypeScript and ESM into CommonJS before execution, resulting in significant overhead in modern projects. Vitest leverages Vite's dev server architecture: it shares Vite's transform pipeline, plugins, and module resolution, directly evaluating ES modules and TypeScript using esbuild. This provides sub-second startup times, instant Hot Module Replacement (HMR) for test files, and native multi-threading via worker threads.

### Q3: How do you enforce strict API request validation in FastAPI using Pydantic v2?
**Answer**:
Pydantic v2 provides field constraints (`Field(min_length=1, max_length=5000)`), enum validation, and the `@model_validator(mode="after")` decorator. For cross-field validation (such as ensuring that Python is only paired with pytest, and JavaScript/TypeScript with vitest), `model_validator` inspects the populated model instance and raises a `ValueError` if an incompatible pair is detected. FastAPI intercepts this and returns a structured `422 Unprocessable Entity` response with exact error locations.

---

## 15. Future Improvements

1. **Sandboxed Test Runner Integration**: Optional user-authorized execution inside isolated, ephemeral WebAssembly (Wasm) or Docker sandboxes with CPU/memory limits.
2. **Test Mutation Analysis**: Incorporate mutation testing (e.g., `mutmut` or `Stryker`) to verify that generated test assertions actually fail when bugs are injected into the source code.
3. **Dynamic Mock Generation**: Automatically generate mock stubs for complex database connections and API clients using AST parsing.
4. **Interactive Test Refinement**: Allow developers to click on a generated test case card to tweak its inputs and expected outputs interactively.
