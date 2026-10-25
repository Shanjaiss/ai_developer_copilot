"""
Automated unit and integration tests for AI Code Review Engine (Day 3).
Mocks Ollama and HTTP responses to test all edge cases, validations, and security constraints.
"""
import json
import os
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
import httpx

from app.main import app

client = TestClient(app)

MOCK_REVIEW_SUCCESS_RESPONSE = {
    "model": "qwen2.5-coder:1.5b",
    "created_at": "2026-10-25T20:00:00.000Z",
    "response": json.dumps({
        "summary": "Code review identified 1 potential division by zero correctness issue.",
        "overall_risk": "medium",
        "issues": [
            {
                "title": "Potential division by zero",
                "severity": "medium",
                "category": "correctness",
                "line": 2,
                "description": "Division may fail when b is zero.",
                "suggestion": "Validate denominator before division.",
            }
        ],
        "improved_code": "def divide(a, b):\n    if b == 0:\n        raise ValueError('Denominator cannot be zero')\n    return a / b",
    }),
    "done": True,
}

MOCK_REVIEW_CLEAN_RESPONSE = {
    "model": "qwen2.5-coder:1.5b",
    "created_at": "2026-10-25T20:01:00.000Z",
    "response": json.dumps({
        "summary": "The submitted code is clean, robust, and has no detected issues.",
        "overall_risk": "clean",
        "issues": [],
        "improved_code": "def add(a: int, b: int) -> int:\n    return a + b",
    }),
    "done": True,
}


@pytest.mark.anyio
async def test_review_code_success():
    """Verify POST /api/v1/ai/review succeeds with structured issues and risk level."""
    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json=MOCK_REVIEW_SUCCESS_RESPONSE,
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/review",
            json={
                "code": "def divide(a, b):\n    return a / b",
                "language": "python",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert data["overall_risk"] == "medium"
    assert isinstance(data["issues"], list)
    assert len(data["issues"]) == 1
    issue = data["issues"][0]
    assert issue["title"] == "Potential division by zero"
    assert issue["severity"] == "medium"
    assert issue["category"] == "correctness"
    assert issue["line"] == 2
    assert "improved_code" in data
    assert "raise ValueError" in data["improved_code"]


@pytest.mark.anyio
async def test_review_code_clean_empty_issues():
    """Verify clean code returns empty issues array and 'clean' overall risk."""
    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json=MOCK_REVIEW_CLEAN_RESPONSE,
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/review",
            json={
                "code": "def add(a: int, b: int) -> int:\n    return a + b",
                "language": "python",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data["overall_risk"] == "clean"
    assert data["issues"] == []


def test_review_code_invalid_empty_code():
    """Verify empty or whitespace-only code produces 422 validation error."""
    response = client.post(
        "/api/v1/ai/review",
        json={"code": "   ", "language": "python"},
    )
    assert response.status_code == 422


def test_review_code_invalid_code_too_long():
    """Verify code exceeding 5000 characters is rejected with 422."""
    giant_code = "a = 1\n" * 1500  # > 5000 chars
    response = client.post(
        "/api/v1/ai/review",
        json={"code": giant_code, "language": "python"},
    )
    assert response.status_code == 422


def test_review_code_invalid_unsupported_language():
    """Verify unsupported programming language returns 422."""
    response = client.post(
        "/api/v1/ai/review",
        json={"code": "print(1)", "language": "fake_lang_xyz"},
    )
    assert response.status_code == 422
    assert "Unsupported language" in response.text


@pytest.mark.anyio
async def test_review_code_ollama_unavailable():
    """Verify 503 Service Unavailable when Ollama server is unreachable."""
    mock_post = AsyncMock(side_effect=httpx.ConnectError("Connection refused by localhost:11434"))

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/review",
            json={"code": "def divide(a, b): return a / b", "language": "python"},
        )

    assert response.status_code == 503
    assert "Ollama AI service is unavailable" in response.json()["detail"]


@pytest.mark.anyio
async def test_review_code_timeout():
    """Verify 504 Gateway Timeout when Ollama inference times out."""
    mock_post = AsyncMock(side_effect=httpx.TimeoutException("Model inference timed out after 60s"))

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/review",
            json={"code": "def divide(a, b): return a / b", "language": "python"},
        )

    assert response.status_code == 504
    assert "timed out" in response.json()["detail"]


@pytest.mark.anyio
async def test_review_code_malformed_json():
    """Verify 502 Bad Gateway when Ollama outputs non-parseable JSON."""
    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json={
            "model": "qwen2.5-coder:1.5b",
            "response": "Here is my review: There are no issues. (Invalid non-json format)",
            "done": True,
        },
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/review",
            json={"code": "def divide(a, b): return a / b", "language": "python"},
        )

    assert response.status_code == 502
    assert "could not be parsed as JSON" in response.json()["detail"]


@pytest.mark.anyio
async def test_review_code_invalid_severity_fallback():
    """Verify invalid severity from model output falls back gracefully to 'low'."""
    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json={
            "model": "qwen2.5-coder:1.5b",
            "response": json.dumps({
                "summary": "Review with invalid severity level",
                "overall_risk": "apocalyptic",  # invalid risk
                "issues": [
                    {
                        "title": "Minor formatting issue",
                        "severity": "super_critical_danger",  # invalid severity
                        "category": "unknown_category",  # invalid category
                        "line": 1,
                        "description": "Spacing is irregular.",
                        "suggestion": "Fix formatting.",
                    }
                ],
                "improved_code": "def divide(a, b): return a / b",
            }),
            "done": True,
        },
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/review",
            json={"code": "def divide(a, b): return a / b", "language": "python"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["issues"][0]["severity"] == "low"
    assert data["issues"][0]["category"] == "correctness"
    assert data["overall_risk"] in {"clean", "low", "medium", "high", "critical"}


@pytest.mark.anyio
async def test_review_code_out_of_range_line_number():
    """Verify out-of-range or negative line numbers are coerced to None/null."""
    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json={
            "model": "qwen2.5-coder:1.5b",
            "response": json.dumps({
                "summary": "Review with invalid line numbers",
                "overall_risk": "low",
                "issues": [
                    {
                        "title": "Out of range line number test",
                        "severity": "low",
                        "category": "maintainability",
                        "line": 999,  # Code only has 2 lines!
                        "description": "Invalid line.",
                        "suggestion": "None.",
                    },
                    {
                        "title": "Negative line number test",
                        "severity": "low",
                        "category": "maintainability",
                        "line": -5,
                        "description": "Negative line.",
                        "suggestion": "None.",
                    },
                ],
                "improved_code": "def foo(): pass",
            }),
            "done": True,
        },
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/review",
            json={"code": "def foo():\n    pass", "language": "python"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["issues"][0]["line"] is None
    assert data["issues"][1]["line"] is None


@pytest.mark.anyio
async def test_review_code_no_execution_security():
    """
    CRITICAL SECURITY TEST: Ensure submitted code is never executed.
    Submits code that attempts to create a canary file on the host filesystem.
    """
    canary_path = "/tmp/test_ai_copilot_review_canary_should_never_exist.txt"
    if os.path.exists(canary_path):
        os.remove(canary_path)

    malicious_code = f"""
import os
os.system("touch {canary_path}")
"""

    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json=MOCK_REVIEW_SUCCESS_RESPONSE,
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/review",
            json={"code": malicious_code, "language": "python"},
        )

    assert response.status_code == 200
    # Canary file MUST NOT exist under any circumstances
    assert not os.path.exists(canary_path), "SECURITY BREACH: Submitted code was executed on host!"
