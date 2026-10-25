import json
import os
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
import httpx

from app.main import app

client = TestClient(app)

MOCK_OLLAMA_SUCCESS_RESPONSE = {
    "model": "qwen2.5-coder:1.5b",
    "created_at": "2026-10-25T16:45:00.000Z",
    "response": json.dumps({
        "summary": "This function computes the square of a given integer n.",
        "line_by_line": [
            "def square(n): Defines function square accepting parameter n.",
            "return n * n: Multiplies n by itself and returns result."
        ],
        "time_complexity": "O(1) - Constant arithmetic time",
        "space_complexity": "O(1) - No extra memory allocated",
        "improvements": [
            "Add type hint: def square(n: float) -> float:"
        ]
    }),
    "done": True,
}


@pytest.mark.anyio
async def test_explain_code_success():
    """Verify POST /api/v1/ai/explain succeeds with structured explanation."""
    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json=MOCK_OLLAMA_SUCCESS_RESPONSE,
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/explain",
            json={
                "code": "def square(n):\n    return n * n",
                "language": "python",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "square of a given integer n" in data["summary"]
    assert isinstance(data["line_by_line"], list)
    assert len(data["line_by_line"]) == 2
    assert "O(1)" in data["time_complexity"]
    assert "O(1)" in data["space_complexity"]
    assert isinstance(data["improvements"], list)
    assert len(data["improvements"]) >= 1


def test_explain_code_invalid_empty_code():
    """Verify empty code produces 422 validation error."""
    response = client.post(
        "/api/v1/ai/explain",
        json={"code": "   ", "language": "python"},
    )
    assert response.status_code == 422


def test_explain_code_invalid_code_too_long():
    """Verify code exceeding 5000 characters is rejected with 422."""
    giant_code = "x = 1\n" * 1500  # > 5000 chars
    response = client.post(
        "/api/v1/ai/explain",
        json={"code": giant_code, "language": "python"},
    )
    assert response.status_code == 422


def test_explain_code_invalid_unsupported_language():
    """Verify unsupported programming language returns 422."""
    response = client.post(
        "/api/v1/ai/explain",
        json={"code": "print(1)", "language": "unsupported_lang_xyz"},
    )
    assert response.status_code == 422
    assert "Unsupported language" in response.text


@pytest.mark.anyio
async def test_explain_code_normalizes_language_alias():
    """Verify common aliases like 'py' normalize to 'python'."""
    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json=MOCK_OLLAMA_SUCCESS_RESPONSE,
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/explain",
            json={"code": "print('hello')", "language": "py"},
        )

    assert response.status_code == 200


@pytest.mark.anyio
async def test_explain_code_ollama_unavailable():
    """Verify 503 Service Unavailable when Ollama is unreachable."""
    mock_post = AsyncMock(side_effect=httpx.ConnectError("Connection refused by localhost:11434"))

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/explain",
            json={"code": "def foo(): pass", "language": "python"},
        )

    assert response.status_code == 503
    assert "Ollama AI service is unavailable" in response.json()["detail"]


@pytest.mark.anyio
async def test_explain_code_timeout():
    """Verify 504 Gateway Timeout when Ollama inference times out."""
    mock_post = AsyncMock(side_effect=httpx.TimeoutException("Model read timed out after 60s"))

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/explain",
            json={"code": "def foo(): pass", "language": "python"},
        )

    assert response.status_code == 504
    assert "timed out" in response.json()["detail"]


@pytest.mark.anyio
async def test_explain_code_malformed_model_response():
    """Verify 502 Bad Gateway when Ollama returns non-JSON text."""
    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json={
            "model": "qwen2.5-coder:1.5b",
            "response": "This is plain text with no JSON structure at all.",
            "done": True,
        },
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/explain",
            json={"code": "def foo(): pass", "language": "python"},
        )

    assert response.status_code == 502
    assert "could not be parsed as JSON" in response.json()["detail"]


@pytest.mark.anyio
async def test_explain_code_markdown_wrapped_json():
    """Verify markdown code-fence wrapped JSON from Ollama is sanitized and parsed."""
    wrapped_json = (
        "```json\n"
        + json.dumps({
            "summary": "Sanitized markdown json explanation",
            "line_by_line": ["Line 1: Pass"],
            "time_complexity": "O(1)",
            "space_complexity": "O(1)",
            "improvements": ["None"],
        })
        + "\n```"
    )

    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json={"model": "qwen2.5-coder:1.5b", "response": wrapped_json, "done": True},
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/explain",
            json={"code": "pass", "language": "python"},
        )

    assert response.status_code == 200
    assert response.json()["summary"] == "Sanitized markdown json explanation"


@pytest.mark.anyio
async def test_no_code_execution_security():
    """
    CRITICAL SECURITY TEST: Ensure submitted code is never executed.
    Submits code that would create a canary file if executed.
    """
    canary_path = "/tmp/test_ai_copilot_canary_should_never_exist.txt"
    if os.path.exists(canary_path):
        os.remove(canary_path)

    malicious_code = f"""
import os
os.system("touch {canary_path}")
"""

    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json=MOCK_OLLAMA_SUCCESS_RESPONSE,
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/explain",
            json={"code": malicious_code, "language": "python"},
        )

    assert response.status_code == 200
    # Canary file MUST NOT exist
    assert not os.path.exists(canary_path), "SECURITY BREACH: Submitted code was executed on the host system!"
