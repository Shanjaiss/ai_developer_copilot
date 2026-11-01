"""
Comprehensive automated test suite for Phase 9: AI Code Refactoring Assistant.
Verifies code smell detection, safe refactoring suggestions, deterministic unified diffs,
repository-file mode, cross-file impact analysis, secret redaction, and error handling.
"""
from pathlib import Path
from unittest.mock import AsyncMock, patch
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.services.code_smell_analyzer import code_smell_analyzer
from app.services.refactoring_service import compute_unified_diff, refactoring_service
from app.schemas.refactoring import RefactorRequest, RefactorResponse

client = TestClient(app)


# ---------------------------------------------------------------------------
# Unit Tests: Static Code Smell Analyzer & Diff Computation
# ---------------------------------------------------------------------------

def test_code_smell_analyzer_python_long_function():
    func_lines = ["def process_batch():"] + [f"    x_{i} = {i}" for i in range(35)]
    code = "\n".join(func_lines)

    smells = code_smell_analyzer.analyze(code, language="python")
    long_func_smells = [s for s in smells if s.type == "long_function"]
    assert len(long_func_smells) >= 1
    assert "process_batch" in long_func_smells[0].title


def test_code_smell_analyzer_python_excessive_nesting():
    code = """def deeply_nested(a, b, c, d):
    if a:
        for x in b:
            while c:
                try:
                    return d[x]
                except Exception:
                    pass
"""
    smells = code_smell_analyzer.analyze(code, language="python")
    nesting_smells = [s for s in smells if s.type == "excessive_nesting"]
    assert len(nesting_smells) >= 1
    assert nesting_smells[0].severity in {"medium", "high"}


def test_code_smell_analyzer_python_excessive_parameters():
    code = "def create_account(name, email, phone, address, city, state, zip_code):\n    pass\n"
    smells = code_smell_analyzer.analyze(code, language="python")
    param_smells = [s for s in smells if s.type == "high_coupling"]
    assert len(param_smells) >= 1
    assert "Excessive parameters" in param_smells[0].title


def test_code_smell_analyzer_python_complex_conditional():
    code = """def validate_user(u):
    if u.is_active and u.has_role and u.is_verified and not u.is_suspended:
        return True
    return False
"""
    smells = code_smell_analyzer.analyze(code, language="python")
    cond_smells = [s for s in smells if s.type == "complex_conditional"]
    assert len(cond_smells) >= 1


def test_code_smell_analyzer_python_repeated_constants():
    code = """def render():
    endpoint_a = "https://api.example.com/v1"
    endpoint_b = "https://api.example.com/v1"
    endpoint_c = "https://api.example.com/v1"
"""
    smells = code_smell_analyzer.analyze(code, language="python")
    const_smells = [s for s in smells if s.type == "repeated_constants"]
    assert len(const_smells) >= 1
    assert "https://api.example.com/v1" in const_smells[0].title


def test_code_smell_analyzer_python_syntax_error_fallback():
    # Incomplete/syntax error python code should fall back to generic heuristics without crashing
    bad_code = "def incomplete_func(\n    x = 1\n    if (y >"
    smells = code_smell_analyzer.analyze(bad_code, language="python")
    assert isinstance(smells, list)


def test_code_smell_analyzer_js_nested_ternary():
    code = """const status = isValid ? (hasPermission ? 'allowed' : 'forbidden') : 'invalid';"""
    smells = code_smell_analyzer.analyze(code, language="javascript")
    ternary_smells = [s for s in smells if s.type == "complex_conditional"]
    assert len(ternary_smells) >= 1
    assert "Nested ternary" in ternary_smells[0].title


def test_compute_unified_diff():
    original = "def calculate(a, b):\n    return a + b\n"
    refactored = "def calculate(a: int, b: int) -> int:\n    \"\"\"Sum two integers.\"\"\"\n    return a + b\n"

    diff = compute_unified_diff(original, refactored)
    assert "--- original" in diff
    assert "+++ refactored" in diff
    assert "-def calculate(a, b):" in diff
    assert "+def calculate(a: int, b: int) -> int:" in diff


# ---------------------------------------------------------------------------
# Integration Tests: POST /api/v1/ai/refactor (Pasted Code Mode)
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_refactor_pasted_code_python_success():
    mock_model_response = {
        "summary": "Extracted nested discount logic into a dedicated pure function.",
        "code_smells": [
            {
                "type": "excessive_nesting",
                "title": "Nested discount calculation",
                "description": "Deeply nested conditional logic reduces maintainability.",
                "severity": "medium",
                "line": 4,
                "evidence": ["if user.is_vip: if cart.total > 100:"],
            }
        ],
        "refactorings": [
            {
                "title": "Extract calculate_discount Helper",
                "reason": "Separates discount calculation rules from checkout orchestration.",
                "original_code": "if user.is_vip:\n    if total > 100:\n        total *= 0.9",
                "refactored_code": "total = apply_vip_discount(user, total)",
                "benefits": ["Improved testability", "Adheres to Single Responsibility"],
                "risks": ["Verify VIP status edge-case handling"],
                "verification_steps": ["Run test_checkout_vip_discount()"],
            }
        ],
    }

    with patch("app.services.ollama_service.ollama_service._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_model_response

        payload = {
            "code": "def checkout(user, total):\n    if user.is_vip:\n        if total > 100:\n            total *= 0.9\n    return total",
            "language": "python",
            "goal": "Extract discount calculation",
        }

        response = client.post("/api/v1/ai/refactor", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["mode"] == "pasted_code"
        assert data["language"] == "python"
        assert len(data["refactorings"]) == 1
        assert "Extract calculate_discount" in data["refactorings"][0]["title"]
        assert "--- original" in data["refactorings"][0]["diff"]
        assert len(data["code_smells"]) >= 1
        assert any("advisory" in w.lower() for w in data["warnings"])
        assert len(data["references"]) == 1
        assert data["references"][0]["path"] == "pasted_code"


@pytest.mark.anyio
async def test_refactor_pasted_code_javascript_success():
    mock_model_response = {
        "summary": "Replaced nested ternaries with explicit early returns.",
        "code_smells": [],
        "refactorings": [
            {
                "title": "Use Guard Clauses",
                "reason": "Eliminates nested ternary conditions for cleaner linear control flow.",
                "original_code": "return isValid ? (isAdmin ? 'full' : 'view') : 'none';",
                "refactored_code": "if (!isValid) return 'none';\nif (isAdmin) return 'full';\nreturn 'view';",
                "benefits": ["Enhanced clarity"],
                "risks": ["Verify falsey values"],
                "verification_steps": ["Unit test permissions with valid/invalid admin combinations"],
            }
        ],
    }

    with patch("app.services.ollama_service.ollama_service._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_model_response

        payload = {
            "code": "function getRole(isValid, isAdmin) { return isValid ? (isAdmin ? 'full' : 'view') : 'none'; }",
            "language": "javascript",
        }

        response = client.post("/api/v1/ai/refactor", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["mode"] == "pasted_code"
        assert len(data["refactorings"]) == 1
        assert "--- original" in data["refactorings"][0]["diff"]


# ---------------------------------------------------------------------------
# Integration Tests: POST /api/v1/ai/refactor (Repository File Mode)
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_refactor_repository_file_success(tmp_path: Path):
    repo_dir = tmp_path / "test_repo"
    repo_dir.mkdir()
    source_file = repo_dir / "order_processor.py"
    source_content = """def process_order(order):
    # Validate order
    if not order.items:
        raise ValueError('No items')
    total = sum(i.price for i in order.items)
    return total
"""
    source_file.write_text(source_content, encoding="utf-8")

    approved_map = {"test_repo": repo_dir}

    mock_model_response = {
        "summary": "Extracted order total calculation to a separate function.",
        "code_smells": [],
        "refactorings": [
            {
                "title": "Extract calculate_order_total",
                "reason": "Improves modularity and simplifies order processing.",
                "original_code": "total = sum(i.price for i in order.items)",
                "refactored_code": "total = calculate_total(order.items)",
                "benefits": ["Reusability across other billing services"],
                "risks": ["Ensure items structure is preserved"],
                "verification_steps": ["Test with populated and empty items lists"],
            }
        ],
    }

    with patch("app.core.config.settings.get_approved_repositories", return_value=approved_map), \
         patch("app.services.ollama_service.ollama_service._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_model_response

        payload = {
            "repository_id": "test_repo",
            "file_path": "order_processor.py",
            "goal": "Improve modularity",
        }

        response = client.post("/api/v1/ai/refactor", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["mode"] == "repository_file"
        assert data["repository_id"] == "test_repo"
        assert data["file_path"] == "order_processor.py"
        assert len(data["references"]) == 1
        assert data["references"][0]["path"] == "order_processor.py"

        # Verify read-only guarantee: source file was untouched on disk
        assert source_file.read_text(encoding="utf-8") == source_content


@pytest.mark.anyio
async def test_refactor_repository_file_with_code_range(tmp_path: Path):
    repo_dir = tmp_path / "test_repo"
    repo_dir.mkdir()
    source_file = repo_dir / "math_utils.py"
    lines = [f"# Line {i}\nx_{i} = {i}" for i in range(1, 20)]
    source_file.write_text("\n".join(lines), encoding="utf-8")

    approved_map = {"test_repo": repo_dir}

    mock_model_response = {
        "summary": "Refactored lines 5-10.",
        "code_smells": [],
        "refactorings": [],
    }

    with patch("app.core.config.settings.get_approved_repositories", return_value=approved_map), \
         patch("app.services.ollama_service.ollama_service._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_model_response

        payload = {
            "repository_id": "test_repo",
            "file_path": "math_utils.py",
            "code_range": "5-10",
        }

        response = client.post("/api/v1/ai/refactor", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["references"][0]["start_line"] == 5
        assert data["references"][0]["end_line"] == 10


@pytest.mark.anyio
async def test_refactor_cross_file_impact(tmp_path: Path):
    repo_dir = tmp_path / "cross_repo"
    repo_dir.mkdir()

    # Module A
    mod_a = repo_dir / "billing.py"
    mod_a.write_text("def compute_bill(): pass\n", encoding="utf-8")

    # Module B imports Module A
    mod_b = repo_dir / "checkout.py"
    mod_b.write_text("from billing import compute_bill\n", encoding="utf-8")

    approved_map = {"cross_repo": repo_dir}

    mock_model_response = {
        "summary": "Refactoring billing module.",
        "code_smells": [],
        "refactorings": [],
    }

    with patch("app.core.config.settings.get_approved_repositories", return_value=approved_map), \
         patch("app.services.ollama_service.ollama_service._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_model_response

        payload = {
            "repository_id": "cross_repo",
            "file_path": "billing.py",
        }

        response = client.post("/api/v1/ai/refactor", json=payload)
        assert response.status_code == 200
        data = response.json()
        # Cross file impact should report checkout.py as caller
        caller_impacts = [i for i in data["cross_file_impacts"] if i["impact_type"] == "caller"]
        assert any("checkout.py" in i["file_path"] for i in caller_impacts)


# ---------------------------------------------------------------------------
# Input Validation & Security Tests
# ---------------------------------------------------------------------------

def test_refactor_empty_pasted_code_rejected():
    response = client.post("/api/v1/ai/refactor", json={"code": "   "})
    assert response.status_code == 422


def test_refactor_mode_validation_missing_file_path():
    response = client.post("/api/v1/ai/refactor", json={"repository_id": "test_repo"})
    assert response.status_code == 422


def test_refactor_mode_validation_missing_both():
    response = client.post("/api/v1/ai/refactor", json={})
    assert response.status_code == 422


def test_refactor_unauthorized_repository_rejected():
    with patch("app.core.config.settings.get_approved_repositories", return_value={}):
        payload = {
            "repository_id": "unapproved_repo",
            "file_path": "main.py",
        }
        response = client.post("/api/v1/ai/refactor", json=payload)
        assert response.status_code == 404


def test_refactor_path_traversal_rejected(tmp_path: Path):
    repo_dir = tmp_path / "test_repo"
    repo_dir.mkdir()
    approved_map = {"test_repo": repo_dir}

    with patch("app.core.config.settings.get_approved_repositories", return_value=approved_map):
        payload = {
            "repository_id": "test_repo",
            "file_path": "../../etc/passwd",
        }
        response = client.post("/api/v1/ai/refactor", json=payload)
        assert response.status_code in {400, 404}


def test_refactor_symlink_escape_rejected(tmp_path: Path):
    repo_dir = tmp_path / "test_repo"
    repo_dir.mkdir()
    outside_dir = tmp_path / "outside"
    outside_dir.mkdir()
    outside_file = outside_dir / "secret.py"
    outside_file.write_text("API_KEY = 'secret'", encoding="utf-8")

    # Create symlink pointing outside approved root
    symlink_file = repo_dir / "escaped_link.py"
    symlink_file.symlink_to(outside_file)

    approved_map = {"test_repo": repo_dir}

    with patch("app.core.config.settings.get_approved_repositories", return_value=approved_map):
        payload = {
            "repository_id": "test_repo",
            "file_path": "escaped_link.py",
        }
        response = client.post("/api/v1/ai/refactor", json=payload)
        assert response.status_code == 400


def test_refactor_secret_files_rejected(tmp_path: Path):
    repo_dir = tmp_path / "test_repo"
    repo_dir.mkdir()
    env_file = repo_dir / ".env"
    env_file.write_text("DATABASE_URL=postgres://...", encoding="utf-8")

    approved_map = {"test_repo": repo_dir}

    with patch("app.core.config.settings.get_approved_repositories", return_value=approved_map):
        payload = {
            "repository_id": "test_repo",
            "file_path": ".env",
        }
        response = client.post("/api/v1/ai/refactor", json=payload)
        assert response.status_code == 400
        assert "sensitive or secret file" in response.json()["detail"]


def test_refactor_oversized_code_rejected():
    response = client.post(
        "/api/v1/ai/refactor",
        json={"code": "x = 1\n" * 2000},
    )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_refactor_secret_redaction():
    mock_model_response = {
        "summary": "Refactored safely.",
        "code_smells": [],
        "refactorings": [],
    }

    captured_prompt = None

    async def mock_generate(prompt: str, temperature: float = 0.2):
        nonlocal captured_prompt
        captured_prompt = prompt
        return mock_model_response

    with patch("app.services.ollama_service.ollama_service._generate_json", side_effect=mock_generate):
        secret_key = "AKIA1234567890ABCDEF"
        payload = {
            "code": f"def connect():\n    token = '{secret_key}'\n",
            "language": "python",
        }
        response = client.post("/api/v1/ai/refactor", json=payload)
        assert response.status_code == 200

        assert captured_prompt is not None
        assert secret_key not in captured_prompt
        assert "[REDACTED_SECRET]" in captured_prompt


@pytest.mark.anyio
async def test_refactor_multi_turn_conversation_ordering():
    mock_model_response = {
        "summary": "Follow-up question answered.",
        "code_smells": [],
        "refactorings": [],
    }

    captured_prompt = None

    async def mock_generate(prompt: str, temperature: float = 0.2):
        nonlocal captured_prompt
        captured_prompt = prompt
        return mock_model_response

    with patch("app.services.ollama_service.ollama_service._generate_json", side_effect=mock_generate):
        payload = {
            "code": "def process(): pass",
            "conversation": [
                {"role": "user", "content": "Why extract this function?"},
                {"role": "assistant", "content": "To reduce nesting."},
                {"role": "user", "content": "Can you provide a smaller diff?"},
            ],
        }
        response = client.post("/api/v1/ai/refactor", json=payload)
        assert response.status_code == 200

        assert captured_prompt is not None
        assert "User: Why extract this function?" in captured_prompt
        assert "Assistant: To reduce nesting." in captured_prompt
        assert "User: Can you provide a smaller diff?" in captured_prompt


@pytest.mark.anyio
async def test_refactor_ollama_unavailable_503():
    with patch(
        "app.services.ollama_service.ollama_service._generate_json",
        side_effect=HTTPException(status_code=503, detail="Ollama unavailable"),
    ):
        payload = {"code": "def test(): pass"}
        response = client.post("/api/v1/ai/refactor", json=payload)
        assert response.status_code == 503


@pytest.mark.anyio
async def test_refactor_ollama_timeout_504():
    with patch(
        "app.services.ollama_service.ollama_service._generate_json",
        side_effect=HTTPException(status_code=504, detail="Inference timed out"),
    ):
        payload = {"code": "def test(): pass"}
        response = client.post("/api/v1/ai/refactor", json=payload)
        assert response.status_code == 504


@pytest.mark.anyio
async def test_refactor_malformed_json_fallback():
    with patch("app.services.ollama_service.ollama_service._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = {
            "summary": "",
            "code_smells": "not_a_list",
            "refactorings": "not_a_list",
        }

        payload = {"code": "def test(): return 1"}
        response = client.post("/api/v1/ai/refactor", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert len(data["refactorings"]) >= 1
        assert "No textual differences" in data["refactorings"][0]["diff"] or "--- original" in data["refactorings"][0]["diff"]


@pytest.mark.anyio
async def test_refactor_no_arbitrary_code_execution():
    mock_model_response = {
        "summary": "Malicious code analyzed inertly.",
        "code_smells": [],
        "refactorings": [],
    }

    with patch("app.services.ollama_service.ollama_service._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_model_response

        malicious_input = "__import__('os').system('echo pwned_refactor > /tmp/pwned_refactor.txt')"
        payload = {"code": malicious_input, "language": "python"}

        response = client.post("/api/v1/ai/refactor", json=payload)
        assert response.status_code == 200

        # Verify no file created
        assert not Path("/tmp/pwned_refactor.txt").exists()


def test_refactor_language_alias_normalized():
    req1 = RefactorRequest(code="x = 1", language="py")
    assert req1.language == "python"

    req2 = RefactorRequest(code="const x = 1;", language="ts")
    assert req2.language == "typescript"
