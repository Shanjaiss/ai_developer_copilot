"""
Automated unit and integration tests for AI Unit Test Generator (Phase 5).
Mocks Ollama HTTP responses to verify edge cases, input validation, framework compatibility,
error handling, and security constraints (guaranteeing no arbitrary code execution).
"""
import json
import os
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
import httpx

from app.main import app

client = TestClient(app)

MOCK_PYTEST_SUCCESS_RESPONSE = {
    "model": "qwen2.5-coder:1.5b",
    "created_at": "2026-10-27T18:00:00.000Z",
    "response": json.dumps({
        "summary": "Generated comprehensive unit tests for add function.",
        "language": "python",
        "framework": "pytest",
        "test_focus": "comprehensive",
        "generated_test_code": "import pytest\n\ndef test_add_positive_numbers():\n    assert add(2, 3) == 5\n\ndef test_add_negative_numbers():\n    assert add(-2, -3) == -5\n\ndef test_add_zero():\n    assert add(0, 0) == 0\n",
        "test_cases": [
            {
                "name": "test_add_positive_numbers",
                "category": "normal",
                "description": "Checks addition of two positive integers.",
                "expected_behavior": "Returns the correct sum."
            },
            {
                "name": "test_add_negative_numbers",
                "category": "edge_case",
                "description": "Checks addition of negative integers.",
                "expected_behavior": "Returns the negative sum."
            },
            {
                "name": "test_add_zero",
                "category": "boundary",
                "description": "Checks addition with zeroes.",
                "expected_behavior": "Returns zero."
            }
        ],
        "coverage_notes": [
            "Positive, negative, and zero inputs represented."
        ],
        "assumptions": [
            "Arguments a and b support arithmetic addition."
        ],
        "warnings": [
            "Generated tests have not been executed or verified against the source code."
        ]
    }),
    "done": True,
}

MOCK_VITEST_JS_SUCCESS_RESPONSE = {
    "model": "qwen2.5-coder:1.5b",
    "created_at": "2026-10-27T18:01:00.000Z",
    "response": json.dumps({
        "summary": "Generated Vitest unit tests for multiply function.",
        "language": "javascript",
        "framework": "vitest",
        "test_focus": "comprehensive",
        "generated_test_code": "import { describe, it, expect } from 'vitest';\n\ndescribe('multiply', () => {\n  it('multiplies positive numbers', () => {\n    expect(multiply(3, 4)).toBe(12);\n  });\n});\n",
        "test_cases": [
            {
                "name": "multiplies positive numbers",
                "category": "normal",
                "description": "Verifies multiplication of two positive numbers.",
                "expected_behavior": "Returns product 12."
            }
        ],
        "coverage_notes": [
            "Covers standard multiplication."
        ],
        "assumptions": [
            "Operands are numeric."
        ],
        "warnings": [
            "Generated tests have not been executed or verified against the source code."
        ]
    }),
    "done": True,
}

MOCK_VITEST_TS_SUCCESS_RESPONSE = {
    "model": "qwen2.5-coder:1.5b",
    "created_at": "2026-10-27T18:02:00.000Z",
    "response": json.dumps({
        "summary": "Generated Vitest unit tests for greet function.",
        "language": "typescript",
        "framework": "vitest",
        "test_focus": "basic",
        "generated_test_code": "import { describe, it, expect } from 'vitest';\n\ndescribe('greet', () => {\n  it('returns greeting string', () => {\n    expect(greet('Alice')).toBe('Hello, Alice');\n  });\n});\n",
        "test_cases": [
            {
                "name": "returns greeting string",
                "category": "normal",
                "description": "Checks greeting string construction.",
                "expected_behavior": "Returns 'Hello, Alice'."
            }
        ],
        "coverage_notes": [
            "Covers standard string input."
        ],
        "assumptions": [
            "Name is a non-empty string."
        ],
        "warnings": []
    }),
    "done": True,
}


@pytest.mark.anyio
async def test_generate_tests_python_pytest_success():
    """Verify POST /api/v1/ai/generate-tests succeeds for Python + pytest."""
    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json=MOCK_PYTEST_SUCCESS_RESPONSE,
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/generate-tests",
            json={
                "code": "def add(a, b):\n    return a + b",
                "language": "python",
                "framework": "pytest",
                "test_focus": "comprehensive",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "python"
    assert data["framework"] == "pytest"
    assert data["test_focus"] == "comprehensive"
    assert "import pytest" in data["generated_test_code"]
    assert len(data["test_cases"]) == 3
    assert data["test_cases"][0]["name"] == "test_add_positive_numbers"
    assert isinstance(data["coverage_notes"], list)
    assert isinstance(data["assumptions"], list)
    assert isinstance(data["warnings"], list)
    # Ensure unexecuted safety advisory is present
    assert any("not been executed" in w.lower() or "review assertions" in w.lower() for w in data["warnings"])


@pytest.mark.anyio
async def test_generate_tests_javascript_vitest_success():
    """Verify POST /api/v1/ai/generate-tests succeeds for JavaScript + vitest."""
    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json=MOCK_VITEST_JS_SUCCESS_RESPONSE,
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/generate-tests",
            json={
                "code": "function multiply(a, b) {\n  return a * b;\n}",
                "language": "javascript",
                "framework": "vitest",
                "test_focus": "comprehensive",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "javascript"
    assert data["framework"] == "vitest"
    assert "describe('multiply'" in data["generated_test_code"]
    assert len(data["test_cases"]) == 1


@pytest.mark.anyio
async def test_generate_tests_typescript_vitest_success():
    """Verify POST /api/v1/ai/generate-tests succeeds for TypeScript + vitest."""
    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json=MOCK_VITEST_TS_SUCCESS_RESPONSE,
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/generate-tests",
            json={
                "code": "export function greet(name: string): string {\n  return `Hello, ${name}`;\n}",
                "language": "typescript",
                "framework": "vitest",
                "test_focus": "basic",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "typescript"
    assert data["framework"] == "vitest"
    assert data["test_focus"] == "basic"
    assert "greet" in data["generated_test_code"]


@pytest.mark.anyio
async def test_generate_tests_all_supported_focuses():
    """Verify all 4 supported test focuses (basic, edge_cases, error_handling, comprehensive) are accepted."""
    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json=MOCK_PYTEST_SUCCESS_RESPONSE,
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    for focus in ["basic", "edge_cases", "error_handling", "comprehensive"]:
        with patch("httpx.AsyncClient.post", mock_post):
            response = client.post(
                "/api/v1/ai/generate-tests",
                json={
                    "code": "def add(a, b): return a + b",
                    "language": "python",
                    "framework": "pytest",
                    "test_focus": focus,
                },
            )
        assert response.status_code == 200


def test_generate_tests_invalid_empty_code():
    """Verify empty or whitespace-only code produces 422 error."""
    response = client.post(
        "/api/v1/ai/generate-tests",
        json={"code": "   ", "language": "python", "framework": "pytest", "test_focus": "basic"},
    )
    assert response.status_code == 422


def test_generate_tests_invalid_code_too_long():
    """Verify code exceeding 5000 characters is rejected with 422."""
    giant_code = "def foo(): pass\n" * 1500  # > 5000 chars
    response = client.post(
        "/api/v1/ai/generate-tests",
        json={"code": giant_code, "language": "python", "framework": "pytest", "test_focus": "basic"},
    )
    assert response.status_code == 422


def test_generate_tests_invalid_unsupported_language():
    """Verify unsupported language returns 422."""
    response = client.post(
        "/api/v1/ai/generate-tests",
        json={"code": "fn main() {}", "language": "rust", "framework": "pytest", "test_focus": "basic"},
    )
    assert response.status_code == 422
    assert "not supported for test generation" in response.text or "incompatible" in response.text


def test_generate_tests_invalid_unsupported_framework():
    """Verify unsupported testing framework returns 422."""
    response = client.post(
        "/api/v1/ai/generate-tests",
        json={"code": "def foo(): pass", "language": "python", "framework": "unittest_mock_xyz", "test_focus": "basic"},
    )
    assert response.status_code == 422
    assert "Unsupported framework" in response.text


def test_generate_tests_invalid_incompatible_pairing():
    """Verify incompatible language/framework pairing (e.g. Python with Vitest) is rejected with 422."""
    response = client.post(
        "/api/v1/ai/generate-tests",
        json={"code": "def foo(): pass", "language": "python", "framework": "vitest", "test_focus": "basic"},
    )
    assert response.status_code == 422
    assert "incompatible with language 'python'" in response.text


def test_generate_tests_invalid_test_focus():
    """Verify unsupported test focus returns 422."""
    response = client.post(
        "/api/v1/ai/generate-tests",
        json={"code": "def foo(): pass", "language": "python", "framework": "pytest", "test_focus": "astronomical_focus"},
    )
    assert response.status_code == 422
    assert "Invalid test focus" in response.text


@pytest.mark.anyio
async def test_generate_tests_ollama_unavailable():
    """Verify 503 Service Unavailable when Ollama is unreachable."""
    mock_post = AsyncMock(side_effect=httpx.ConnectError("Connection refused by localhost:11434"))

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/generate-tests",
            json={"code": "def foo(): pass", "language": "python", "framework": "pytest", "test_focus": "basic"},
        )

    assert response.status_code == 503
    assert "Ollama AI service is unavailable" in response.json()["detail"]


@pytest.mark.anyio
async def test_generate_tests_timeout():
    """Verify 504 Gateway Timeout when Ollama inference times out."""
    mock_post = AsyncMock(side_effect=httpx.TimeoutException("Model inference timed out after 60s"))

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/generate-tests",
            json={"code": "def foo(): pass", "language": "python", "framework": "pytest", "test_focus": "basic"},
        )

    assert response.status_code == 504
    assert "timed out" in response.json()["detail"]


@pytest.mark.anyio
async def test_generate_tests_malformed_json():
    """Verify 502 Bad Gateway when Ollama outputs non-parseable JSON."""
    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json={
            "model": "qwen2.5-coder:1.5b",
            "response": "This is non-JSON text output from the model.",
            "done": True,
        },
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/generate-tests",
            json={"code": "def foo(): pass", "language": "python", "framework": "pytest", "test_focus": "basic"},
        )

    assert response.status_code == 502
    assert "could not be parsed as JSON" in response.json()["detail"]


@pytest.mark.anyio
async def test_generate_tests_fallback_on_missing_fields():
    """Verify missing fields in JSON are safely defaulted without crashing."""
    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json={
            "model": "qwen2.5-coder:1.5b",
            "response": json.dumps({
                # Missing summary, generated_test_code, test_cases, coverage_notes, assumptions, warnings
            }),
            "done": True,
        },
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/generate-tests",
            json={"code": "def foo(): pass", "language": "python", "framework": "pytest", "test_focus": "basic"},
        )

    assert response.status_code == 200
    data = response.json()
    assert "Generated pytest unit tests" in data["summary"]
    assert "pytest" in data["generated_test_code"]
    assert isinstance(data["test_cases"], list)
    assert len(data["warnings"]) >= 1


@pytest.mark.anyio
async def test_generate_tests_no_code_execution_security():
    """
    CRITICAL SECURITY TEST: Ensure submitted code or generated test code is NEVER executed.
    Submits code that attempts to create a canary file on the host filesystem.
    """
    canary_path = "/tmp/test_ai_copilot_test_generator_canary_should_never_exist.txt"
    if os.path.exists(canary_path):
        os.remove(canary_path)

    malicious_code = f"""
import os
os.system("touch {canary_path}")
"""

    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json=MOCK_PYTEST_SUCCESS_RESPONSE,
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/generate-tests",
            json={"code": malicious_code, "language": "python", "framework": "pytest", "test_focus": "basic"},
        )

    assert response.status_code == 200
    # Canary file MUST NOT exist under any circumstances
    assert not os.path.exists(canary_path), "SECURITY BREACH: Submitted code was executed on host!"
