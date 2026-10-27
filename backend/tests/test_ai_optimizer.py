"""
Automated unit and integration tests for AI Code Optimization Engine (Phase 4).
Mocks Ollama HTTP responses to verify edge cases, input validation, error handling,
complexity parsing, behavior preservation invariants, and security constraints.
"""
import json
import os
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
import httpx

from app.main import app

client = TestClient(app)

MOCK_OPTIMIZE_PERFORMANCE_RESPONSE = {
    "model": "qwen2.5-coder:1.5b",
    "created_at": "2026-10-26T18:00:00.000Z",
    "response": json.dumps({
        "summary": "Optimized duplicate detection from O(n^2) nested loops to O(n) hash set lookup.",
        "original_complexity": {
            "time": "O(n^2)",
            "space": "O(1)"
        },
        "optimized_complexity": {
            "time": "O(n)",
            "space": "O(n)"
        },
        "optimized_code": "def find_duplicates(items):\n    seen = set()\n    duplicates = set()\n    for item in items:\n        if item in seen:\n            duplicates.add(item)\n        else:\n            seen.add(item)\n    return list(duplicates)",
        "changes": [
            {
                "title": "Use Hash Set for O(1) Membership Testing",
                "reason": "Replaces nested linear search with constant-time set lookups.",
                "tradeoff": "Increases auxiliary memory consumption from O(1) to O(n)."
            }
        ],
        "warnings": [
            "Requires elements in items to be hashable."
        ]
    }),
    "done": True,
}

MOCK_OPTIMIZE_NO_IMPROVEMENT_RESPONSE = {
    "model": "qwen2.5-coder:1.5b",
    "created_at": "2026-10-26T18:01:00.000Z",
    "response": json.dumps({
        "summary": "The function is already optimal; single constant-time arithmetic operation.",
        "original_complexity": {
            "time": "O(1)",
            "space": "O(1)"
        },
        "optimized_complexity": {
            "time": "O(1)",
            "space": "O(1)"
        },
        "optimized_code": "def square(n):\n    return n * n",
        "changes": [],
        "warnings": [
            "No safe optimization identified without changing semantics or adding unnecessary overhead."
        ]
    }),
    "done": True,
}


@pytest.mark.anyio
async def test_optimize_code_success_performance():
    """Verify POST /api/v1/ai/optimize succeeds with structured optimization breakdown."""
    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json=MOCK_OPTIMIZE_PERFORMANCE_RESPONSE,
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/optimize",
            json={
                "code": "def find_duplicates(items):\n    dups = []\n    for i in range(len(items)):\n        for j in range(i+1, len(items)):\n            if items[i] == items[j] and items[i] not in dups:\n                dups.append(items[i])\n    return dups",
                "language": "python",
                "optimization_goal": "performance",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "O(n^2)" in data["original_complexity"]["time"]
    assert "O(n)" in data["optimized_complexity"]["time"]
    assert "find_duplicates" in data["optimized_code"]
    assert isinstance(data["changes"], list)
    assert len(data["changes"]) == 1
    assert data["changes"][0]["title"] == "Use Hash Set for O(1) Membership Testing"
    assert "tradeoff" in data["changes"][0]
    assert isinstance(data["warnings"], list)
    assert len(data["warnings"]) >= 1
    # Check that benchmark reminder is present
    assert any("benchmark" in w.lower() or "empirical" in w.lower() for w in data["warnings"])


@pytest.mark.anyio
async def test_optimize_code_no_improvement_already_optimal():
    """Verify code with no justified improvement returns original code and appropriate summary."""
    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json=MOCK_OPTIMIZE_NO_IMPROVEMENT_RESPONSE,
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/optimize",
            json={
                "code": "def square(n):\n    return n * n",
                "language": "python",
                "optimization_goal": "performance",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert "def square(n):\n    return n * n" in data["optimized_code"]
    assert len(data["changes"]) == 0
    assert any("optimal" in w.lower() or "no safe optimization" in w.lower() for w in data["warnings"])


def test_optimize_code_invalid_empty_code():
    """Verify empty or whitespace-only code produces 422 error."""
    response = client.post(
        "/api/v1/ai/optimize",
        json={"code": "   ", "language": "python", "optimization_goal": "performance"},
    )
    assert response.status_code == 422


def test_optimize_code_invalid_code_too_long():
    """Verify code exceeding 5000 characters is rejected with 422."""
    giant_code = "print(1)\n" * 1500  # > 5000 chars
    response = client.post(
        "/api/v1/ai/optimize",
        json={"code": giant_code, "language": "python", "optimization_goal": "performance"},
    )
    assert response.status_code == 422


def test_optimize_code_invalid_unsupported_language():
    """Verify unsupported programming language returns 422."""
    response = client.post(
        "/api/v1/ai/optimize",
        json={"code": "print(1)", "language": "brainfuck_xyz", "optimization_goal": "performance"},
    )
    assert response.status_code == 422
    assert "Unsupported language" in response.text


def test_optimize_code_invalid_optimization_goal():
    """Verify invalid optimization goal returns 422."""
    response = client.post(
        "/api/v1/ai/optimize",
        json={"code": "print(1)", "language": "python", "optimization_goal": "extreme_hyper_speed"},
    )
    assert response.status_code == 422
    assert "Invalid optimization goal" in response.text


@pytest.mark.anyio
async def test_optimize_code_all_valid_goals():
    """Verify all 4 supported goals (performance, readability, memory, maintainability) are accepted."""
    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json=MOCK_OPTIMIZE_NO_IMPROVEMENT_RESPONSE,
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    for goal in ["performance", "readability", "memory", "maintainability"]:
        with patch("httpx.AsyncClient.post", mock_post):
            response = client.post(
                "/api/v1/ai/optimize",
                json={
                    "code": "def square(n):\n    return n * n",
                    "language": "python",
                    "optimization_goal": goal,
                },
            )
        assert response.status_code == 200


@pytest.mark.anyio
async def test_optimize_code_ollama_unavailable():
    """Verify 503 Service Unavailable when Ollama is unreachable."""
    mock_post = AsyncMock(side_effect=httpx.ConnectError("Connection refused by localhost:11434"))

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/optimize",
            json={"code": "def foo(): pass", "language": "python", "optimization_goal": "memory"},
        )

    assert response.status_code == 503
    assert "Ollama AI service is unavailable" in response.json()["detail"]


@pytest.mark.anyio
async def test_optimize_code_timeout():
    """Verify 504 Gateway Timeout when Ollama inference times out."""
    mock_post = AsyncMock(side_effect=httpx.TimeoutException("Model inference timed out after 60s"))

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/optimize",
            json={"code": "def foo(): pass", "language": "python", "optimization_goal": "readability"},
        )

    assert response.status_code == 504
    assert "timed out" in response.json()["detail"]


@pytest.mark.anyio
async def test_optimize_code_malformed_json():
    """Verify 502 Bad Gateway when Ollama outputs non-parseable JSON."""
    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json={
            "model": "qwen2.5-coder:1.5b",
            "response": "Here is an optimized version: (not a json object)",
            "done": True,
        },
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/optimize",
            json={"code": "def foo(): pass", "language": "python", "optimization_goal": "performance"},
        )

    assert response.status_code == 502
    assert "could not be parsed as JSON" in response.json()["detail"]


@pytest.mark.anyio
async def test_optimize_code_no_execution_security():
    """
    CRITICAL SECURITY TEST: Ensure submitted code is never executed.
    Submits code that attempts to create a canary file on the host filesystem.
    """
    canary_path = "/tmp/test_ai_copilot_optimize_canary_should_never_exist.txt"
    if os.path.exists(canary_path):
        os.remove(canary_path)

    malicious_code = f"""
import os
os.system("touch {canary_path}")
"""

    mock_post = AsyncMock()
    mock_post.return_value = httpx.Response(
        status_code=200,
        json=MOCK_OPTIMIZE_PERFORMANCE_RESPONSE,
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", mock_post):
        response = client.post(
            "/api/v1/ai/optimize",
            json={"code": malicious_code, "language": "python", "optimization_goal": "performance"},
        )

    assert response.status_code == 200
    # Canary file MUST NOT exist under any circumstances
    assert not os.path.exists(canary_path), "SECURITY BREACH: Submitted code was executed on host!"
