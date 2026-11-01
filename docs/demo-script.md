# AI Developer Copilot — 5-7 Minute Demonstration Script

This structured script guides presenters through a compelling live demonstration of the **AI Developer Copilot**, showcasing all 11 features, local Apple Silicon performance, and privacy guarantees.

---

## 1. Demo Prerequisites & Environment Setup

Before starting the presentation, verify that both services are running:

```bash
# Terminal 1: Verify Ollama is running with qwen2.5-coder:1.5b
ollama list
# Should display qwen2.5-coder:1.5b

# Terminal 2: Start Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --port 8000

# Terminal 3: Start Frontend
cd frontend
npm run dev
# Accessible at http://localhost:5173
```

---

## 2. Walkthrough Script & Narration

### Step 1: System Health & Architecture Overview (Time: 0:00 – 0:45)
- **Action**: Open browser to `http://localhost:5173`. Point to the header badge (`Phase 12 • Final Release`) and the top status banner.
- **Presenter Narration**:
  > *"Welcome everyone. Today I'm presenting the AI Developer Copilot—an enterprise-grade coding assistant running 100% locally on this Apple Silicon Mac M1 with 8GB of RAM.
  >
  > Notice the status pill in the top header: our backend is connected to a local Ollama daemon running the `qwen2.5-coder:1.5b` model. There are zero cloud API keys, zero network telemetry calls, and zero external subscriptions. Everything you see today happens completely on-device."*
- **Visual Check**: Green status pill shows `Ollama Connected (qwen2.5-coder:1.5b)`. Hardware and latency indicators are displayed.

---

### Step 2: Code Intelligence — Explain, Review & Optimize (Time: 0:45 – 1:45)
- **Action**: Click **Explain Code** in the sidebar. Paste the following recursive Python snippet:

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

- **Presenter Narration**:
  > *"Let's test our core code intelligence with an unoptimized recursive Fibonacci function. Clicking 'Explain Code' sends the snippet to our local model."*
- **Action**: Click **Explain**. Point to the explanation breakdown and asymptotic complexity ($O(2^N)$ time, $O(N)$ auxiliary stack space).
- **Action**: Click **Review Code** in the sidebar. Click **Review**.
- **Presenter Narration**:
  > *"Next, the Code Review feature inspects the code for algorithmic defects and anti-patterns. Notice it correctly flags exponential time complexity and missing input validation as medium-to-high severity issues."*
- **Action**: Click **Optimize Code** in the sidebar. Click **Optimize**.
- **Presenter Narration**:
  > *"Switching to Code Optimization, the model converts the exponential recursion into an iterative $O(N)$ dynamic programming solution with $O(1)$ space. We see an interactive before/after diff highlighting the exact performance gains."*

---

### Step 3: Automated Unit Testing & Conversational Assistant (Time: 1:45 – 2:30)
- **Action**: Click **Unit Tests** in the sidebar. Select `pytest` framework and paste:

```python
def calculate_discount(price: float, discount_percent: float) -> float:
    if price < 0 or discount_percent < 0 or discount_percent > 100:
        raise ValueError("Invalid price or discount percentage")
    return round(price * (1 - discount_percent / 100), 2)
```

- **Action**: Click **Generate Tests**.
- **Presenter Narration**:
  > *"Our Unit Test Generator writes framework-native tests. Notice how it covers positive test cases, boundary conditions at 0% and 100%, and explicitly tests the `ValueError` exceptions using `pytest.raises`. The generated code is ready to be copied into the project."*
- **Action**: Click **Chat Assistant** in the sidebar. Submit:
  > *"How can I adapt `calculate_discount` to handle multiple tiered discount thresholds?"*
- **Presenter Narration**:
  > *"The Conversational Assistant retains multi-turn context with bounded sliding history, suggesting clean Python data structures like dataclasses or tuples without losing track of previous turns."*

---

### Step 4: Repository Intelligence (Time: 2:30 – 3:30)
- **Action**: Click **Repository Intelligence** in the sidebar.
- **Presenter Narration**:
  > *"Now let's explore our local repository intelligence engine. Unlike cloud tools that upload gigabytes of code, our backend indexes local allowlisted directories using deterministic static analysis."*
- **Action**: Select the current project repository and click **Scan Repository**.
- **Presenter Narration**:
  > *"In under 200 milliseconds, our Python AST parser and polyglot symbol extractor indexed the file tree, symbol declarations, and dependency graphs across the project.
  >
  > Let's ask a repository-wide question: 'Where is the Ollama client defined and how are timeouts handled?'"*
- **Action**: Submit the query in the Repository Q&A input.
- **Presenter Narration**:
  > *"Notice the response: it references the exact file `app/services/ollama_client.py` and cites line numbers and timeout constants. The references are grounded directly in our indexed AST."*

---

### Step 5: Bug Detection & Stack Trace Debugging (Time: 3:30 – 4:15)
- **Action**: Click **Debug Assistant** in the sidebar. Paste the following stack trace and code snippet:

**Error / Stack Trace**:
```text
Traceback (most recent call last):
  File "math_utils.py", line 12, in compute_average
    return total / len(items)
ZeroDivisionError: division by zero
```

**Code Context**:
```python
def compute_average(items):
    total = sum(items)
    return total / len(items)
```

- **Action**: Click **Analyze Error**.
- **Presenter Narration**:
  > *"When a developer encounters an error, the Debug Assistant parses the traceback, identifies the root cause—an empty `items` list causing division by zero—and generates a guarded patch returning `0.0` or raising an informative exception."*

---

### Step 6: Code Refactoring & Documentation Generator (Time: 4:15 – 5:00)
- **Action**: Click **Refactor Code** in the sidebar.
- **Presenter Narration**:
  > *"Our Refactoring Assistant detects code smells such as high cognitive complexity, long parameter lists, and deeply nested conditionals. Crucially, all refactoring suggestions are strictly advisory—the system never alters your repository files without explicit developer action."*
- **Action**: Click **Documentation** in the sidebar. Select **README Generator**.
- **Presenter Narration**:
  > *"The Documentation Generator creates professional Markdown READMEs, OpenAPI specs, and docstrings from repository context or pasted modules in a single click."*

---

### Step 7: Telemetry, Analytics & Security Verification (Time: 5:00 – 6:00)
- **Action**: Click **Analytics** (Productivity Dashboard) in the sidebar.
- **Presenter Narration**:
  > *"In our Developer Productivity Dashboard, notice the pure SVG visualizations tracking query volume, feature usage distributions, and latency percentiles. No heavy charting libraries are used, preserving bundle size and rendering performance.
  >
  > Most importantly, take a look at the Telemetry Privacy notice: all metric events are stored exclusively in a local file. Sensitive credentials, passwords, and tokens are automatically redacted via regex patterns before storage."*

---

### Step 8: Security & Architecture Summary (Time: 6:00 – 6:30)
- **Presenter Narration**:
  > *"To conclude, let's summarize the engineering highlights:
  > - **100% Local & Air-Gapped**: Runs entirely on Apple Silicon with zero external network calls.
  > - **Strict Resource Envelope**: Bounded to 2.45 GB active RAM on an 8GB M1 Mac.
  > - **Defense-in-Depth**: Path traversal prevention via `realpath`, prompt injection fences, and zero code execution.
  > - **297 Passing Tests**: 190 backend pytest tests in 1.21s, 107 frontend Vitest tests in 4.99s, and 0 linting or TypeScript errors.
  >
  > Thank you! I'm happy to take any questions on the architecture or implementation."*

---

## 3. Safe Demo Snippet Quick Reference

| Feature | Input Name | Safe Demo Input Snippet | Expected Output |
| :--- | :--- | :--- | :--- |
| **Explain** | Recursive Fibonacci | `def fib(n): return n if n<=1 else fib(n-1)+fib(n-2)` | $O(2^N)$ time, $O(N)$ space explanation |
| **Review** | Missing input validation | `def get_user(id): return db.query("SELECT * FROM users WHERE id=" + id)` | SQL injection warning (Critical) |
| **Optimize** | O(N) Fibonacci | Recursive Fibonacci snippet | Iterative loop $O(N)$ with $O(1)$ space |
| **Unit Tests** | Division function | `def safe_div(a, b): return a / b if b != 0 else None` | Pytest fixtures, zero-division test, positive tests |
| **Debug** | ZeroDivisionError | Stack trace with `ZeroDivisionError: division by zero` | Root cause identified, guarded patch proposed |
| **Refactor** | Nested if statements | Deeply nested conditionals | Guard clauses and early returns |

