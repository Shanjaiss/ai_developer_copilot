"""
Comprehensive automated test suite for Phase 8: AI Bug Detection & Debugging Assistant.
Verifies stack trace parsing, error classification, repository-aware evidence extraction,
standalone debugging, secret redaction, safety bounds, and Ollama error handling.
"""
import json
from pathlib import Path
from unittest.mock import AsyncMock, patch
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.services.debugging_service import debugging_service
from app.services.stack_trace_parser import stack_trace_parser
from app.schemas.debugging import DebugRequest, DebugResponse

client = TestClient(app)


# ---------------------------------------------------------------------------
# Unit Tests: StackTraceParser
# ---------------------------------------------------------------------------

def test_stack_trace_parser_python_traceback():
    trace = """Traceback (most recent call last):
  File "/app/services/user_service.py", line 42, in get_user
    user_id = data["user_id"]
KeyError: 'user_id'"""

    err_type, clean_msg, lang, frames = stack_trace_parser.parse(
        error_message="KeyError: 'user_id'",
        stack_trace=trace,
    )

    assert err_type == "KeyError"
    assert clean_msg == "'user_id'"
    assert lang == "python"
    assert len(frames) == 1
    assert frames[0].file_path == "/app/services/user_service.py"
    assert frames[0].line_number == 42
    assert frames[0].function_name == "get_user"
    assert frames[0].code_line == 'user_id = data["user_id"]'


def test_stack_trace_parser_js_traceback():
    trace = """TypeError: Cannot read properties of undefined (reading 'map')
    at UserList (src/components/UserList.tsx:18:24)
    at renderWithHooks (node_modules/react-dom/cjs/react-dom.development.js:14985:18)"""

    err_type, clean_msg, lang, frames = stack_trace_parser.parse(
        error_message="TypeError: Cannot read properties of undefined (reading 'map')",
        stack_trace=trace,
    )

    assert err_type == "TypeError"
    assert "Cannot read properties of undefined" in clean_msg
    assert lang == "typescript"
    assert len(frames) >= 2
    assert frames[0].file_path == "src/components/UserList.tsx"
    assert frames[0].line_number == 18
    assert frames[0].column_number == 24
    assert frames[0].function_name == "UserList"


def test_stack_trace_parser_fastapi_422():
    msg = "422 Unprocessable Entity: [{'loc': ['body', 'email'], 'msg': 'value is not a valid email', 'type': 'value_error.email'}]"
    err_type, clean_msg, lang, frames = stack_trace_parser.parse(error_message=msg)

    assert err_type == "HTTPException (422)"
    assert lang == "python"
    assert len(frames) == 0


def test_stack_trace_parser_react_error():
    msg = "Error: Too many re-renders. React limits the number of renders to prevent an infinite loop."
    err_type, clean_msg, lang, frames = stack_trace_parser.parse(error_message=msg)

    assert err_type == "ReactRenderError"
    assert lang == "typescript"


# ---------------------------------------------------------------------------
# Integration Tests: POST /api/v1/ai/debug
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_debug_standalone_python_keyerror():
    mock_model_response = {
        "summary": "KeyError occurred because 'user_id' was not present in the dictionary.",
        "error_type": "KeyError",
        "root_causes": [
            {
                "title": "Missing 'user_id' key in input dictionary",
                "description": "The payload dictionary lacks the expected 'user_id' key prior to access.",
                "confidence": "high",
                "evidence": ["KeyError: 'user_id'", "data['user_id'] on line 42"],
            }
        ],
        "suggested_fixes": [
            {
                "title": "Use dict.get() with fallback",
                "explanation": "Safely access 'user_id' with dict.get('user_id') or provide a default value.",
                "code_example": "user_id = data.get('user_id')\nif not user_id:\n    raise ValueError('Missing user_id')",
                "verification_steps": ["Verify function behavior when data lacks 'user_id'", "Run unit tests"],
            }
        ],
    }

    with patch("app.services.ollama_service.ollama_service._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_model_response

        payload = {
            "error_message": "KeyError: 'user_id'",
            "stack_trace": "File \"user_service.py\", line 42, in get_user\n    user_id = data[\"user_id\"]",
            "language": "python",
        }

        response = client.post("/api/v1/ai/debug", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["error_type"] == "KeyError"
        assert data["language"] == "python"
        assert len(data["root_causes"]) == 1
        assert data["root_causes"][0]["confidence"] == "high"
        assert len(data["suggested_fixes"]) == 1
        assert ".get" in data["suggested_fixes"][0]["code_example"]
        assert any("advisory" in w.lower() for w in data["warnings"])
        assert data["repository_used"] is None


@pytest.mark.anyio
async def test_debug_standalone_js_typeerror():
    mock_model_response = {
        "summary": "TypeError: Cannot read properties of undefined occurred because the array was null/undefined before .map() was called.",
        "error_type": "TypeError",
        "root_causes": [
            {
                "title": "Undefined items array before rendering",
                "description": "Async fetch has not completed, so items is undefined when map is invoked.",
                "confidence": "high",
                "evidence": ["Cannot read properties of undefined (reading 'map')"],
            }
        ],
        "suggested_fixes": [
            {
                "title": "Add optional chaining or default empty array",
                "explanation": "Safely access items using optional chaining or a fallback array.",
                "code_example": "{items?.map((item) => <Item key={item.id} {...item} />)}",
                "verification_steps": ["Test component rendering when items is undefined", "Check loading state handling"],
            }
        ],
    }

    with patch("app.services.ollama_service.ollama_service._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_model_response

        payload = {
            "error_message": "TypeError: Cannot read properties of undefined (reading 'map')",
            "stack_trace": "at UserList (src/components/UserList.tsx:18:24)",
        }

        response = client.post("/api/v1/ai/debug", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["error_type"] == "TypeError"
        assert data["language"] == "typescript"
        assert len(data["parsed_frames"]) == 1
        assert data["parsed_frames"][0]["line_number"] == 18
        assert len(data["suggested_fixes"]) == 1


@pytest.mark.anyio
async def test_debug_with_code_context():
    mock_model_response = {
        "summary": "ZeroDivisionError in calculate_average function.",
        "error_type": "ZeroDivisionError",
        "root_causes": [
            {
                "title": "Division by zero when list is empty",
                "description": "len(items) evaluates to 0 on empty input, resulting in division by zero.",
                "confidence": "high",
                "evidence": ["total / len(items)"],
            }
        ],
        "suggested_fixes": [
            {
                "title": "Guard against empty list",
                "explanation": "Return 0.0 or raise ValueError if items is empty.",
                "code_example": "if not items:\n    return 0.0\nreturn sum(items) / len(items)",
                "verification_steps": ["Call calculate_average([])", "Verify it returns 0.0 without raising error"],
            }
        ],
    }

    with patch("app.services.ollama_service.ollama_service._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_model_response

        payload = {
            "error_message": "ZeroDivisionError: division by zero",
            "code_context": "def calculate_average(items):\n    return sum(items) / len(items)",
            "language": "python",
        }

        response = client.post("/api/v1/ai/debug", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["error_type"] == "ZeroDivisionError"
        assert len(data["references"]) == 1
        assert data["references"][0]["path"] == "provided_code_context"
        assert "calculate_average" in data["references"][0]["snippet"]


@pytest.mark.anyio
async def test_debug_with_repository_match(tmp_path: Path):
    repo_dir = tmp_path / "sample_repo"
    repo_dir.mkdir()
    src_file = repo_dir / "calculator.py"
    src_file.write_text("def divide(a, b):\n    return a / b\n", encoding="utf-8")

    approved_map = {"sample_repo": repo_dir}

    mock_model_response = {
        "summary": "ZeroDivisionError in calculator.py divide function.",
        "error_type": "ZeroDivisionError",
        "root_causes": [
            {
                "title": "Unchecked zero divisor",
                "description": "b argument is 0 in a / b.",
                "confidence": "high",
                "evidence": ["line 2 in calculator.py"],
            }
        ],
        "suggested_fixes": [
            {
                "title": "Add divisor check",
                "explanation": "Validate b != 0 before division.",
                "code_example": "if b == 0:\n    raise ValueError('Divisor cannot be zero')\nreturn a / b",
                "verification_steps": ["Test divide(10, 0) raises ValueError"],
            }
        ],
    }

    with patch("app.core.config.settings.get_approved_repositories", return_value=approved_map), \
         patch("app.services.ollama_service.ollama_service._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_model_response

        payload = {
            "error_message": "ZeroDivisionError: division by zero",
            "stack_trace": f'File "{src_file}", line 2, in divide\n    return a / b',
            "repository_id": "sample_repo",
        }

        response = client.post("/api/v1/ai/debug", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["repository_used"] == "sample_repo"
        assert len(data["references"]) == 1
        assert data["references"][0]["path"] == "calculator.py"
        assert "return a / b" in data["references"][0]["snippet"]
        assert data["parsed_frames"][0]["is_in_repository"] is True


@pytest.mark.anyio
async def test_debug_with_repository_path_traversal_rejected(tmp_path: Path):
    repo_dir = tmp_path / "sample_repo"
    repo_dir.mkdir()
    approved_map = {"sample_repo": repo_dir}

    mock_model_response = {
        "summary": "Runtime error diagnosis.",
        "error_type": "RuntimeError",
        "root_causes": [],
        "suggested_fixes": [],
    }

    with patch("app.core.config.settings.get_approved_repositories", return_value=approved_map), \
         patch("app.services.ollama_service.ollama_service._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_model_response

        payload = {
            "error_message": "FileNotFoundError: No such file",
            "stack_trace": 'File "../../../etc/passwd", line 1, in read_data\n    data = f.read()',
            "repository_id": "sample_repo",
        }

        response = client.post("/api/v1/ai/debug", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["parsed_frames"][0]["is_in_repository"] is False
        assert len(data["references"]) == 0


def test_debug_unapproved_repository_rejected():
    with patch("app.core.config.settings.get_approved_repositories", return_value={}):
        payload = {
            "error_message": "KeyError: 'id'",
            "repository_id": "unapproved_repo",
        }
        response = client.post("/api/v1/ai/debug", json=payload)
        assert response.status_code == 404
        assert "not in the server-approved" in response.json()["detail"] or "No approved repositories" in response.json()["detail"]


def test_debug_empty_error_message_rejected():
    response = client.post("/api/v1/ai/debug", json={"error_message": "   "})
    assert response.status_code == 422


def test_debug_oversized_error_message_rejected():
    response = client.post("/api/v1/ai/debug", json={"error_message": "E" * 2001})
    assert response.status_code == 422


def test_debug_oversized_stack_trace_rejected():
    response = client.post(
        "/api/v1/ai/debug",
        json={"error_message": "Error", "stack_trace": "Trace " * 2000},
    )
    assert response.status_code == 422


def test_debug_oversized_code_context_rejected():
    response = client.post(
        "/api/v1/ai/debug",
        json={"error_message": "Error", "code_context": "x = 1\n" * 1500},
    )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_debug_secret_redaction():
    mock_model_response = {
        "summary": "Authentication failure with invalid credentials.",
        "error_type": "AuthError",
        "root_causes": [],
        "suggested_fixes": [],
    }

    captured_prompt = None

    async def mock_generate(prompt: str, temperature: float = 0.2):
        nonlocal captured_prompt
        captured_prompt = prompt
        return mock_model_response

    with patch("app.services.ollama_service.ollama_service._generate_json", side_effect=mock_generate):
        secret_key = "AKIA1234567890ABCDEF"
        payload = {
            "error_message": f"Auth failed with key {secret_key}",
            "stack_trace": f'File "auth.py", line 10\n    api_key = "{secret_key}"',
        }
        response = client.post("/api/v1/ai/debug", json=payload)
        assert response.status_code == 200

        # Verify secret was redacted in the captured prompt
        assert captured_prompt is not None
        assert secret_key not in captured_prompt
        assert "[REDACTED_SECRET]" in captured_prompt


@pytest.mark.anyio
async def test_debug_multi_turn_conversation_ordering():
    mock_model_response = {
        "summary": "Follow-up question answered.",
        "error_type": "KeyError",
        "root_causes": [],
        "suggested_fixes": [],
    }

    captured_prompt = None

    async def mock_generate(prompt: str, temperature: float = 0.2):
        nonlocal captured_prompt
        captured_prompt = prompt
        return mock_model_response

    with patch("app.services.ollama_service.ollama_service._generate_json", side_effect=mock_generate):
        payload = {
            "error_message": "KeyError: 'user_id'",
            "conversation": [
                {"role": "user", "content": "How do I fix this in Python 3.12?"},
                {"role": "assistant", "content": "Use dict.get()"},
                {"role": "user", "content": "Can I use defaultdict instead?"},
            ],
        }
        response = client.post("/api/v1/ai/debug", json=payload)
        assert response.status_code == 200

        assert captured_prompt is not None
        assert "User: How do I fix this in Python 3.12?" in captured_prompt
        assert "Assistant: Use dict.get()" in captured_prompt
        assert "User: Can I use defaultdict instead?" in captured_prompt


def test_debug_blank_conversation_message_rejected():
    payload = {
        "error_message": "KeyError: 'user_id'",
        "conversation": [
            {"role": "user", "content": "   "},
        ],
    }
    response = client.post("/api/v1/ai/debug", json=payload)
    assert response.status_code == 422


@pytest.mark.anyio
async def test_debug_ollama_unavailable_503():
    with patch(
        "app.services.ollama_service.ollama_service._generate_json",
        side_effect=HTTPException(status_code=503, detail="Ollama unavailable"),
    ):
        payload = {"error_message": "KeyError: 'user_id'"}
        response = client.post("/api/v1/ai/debug", json=payload)
        assert response.status_code == 503


@pytest.mark.anyio
async def test_debug_ollama_timeout_504():
    with patch(
        "app.services.ollama_service.ollama_service._generate_json",
        side_effect=HTTPException(status_code=504, detail="Inference timed out"),
    ):
        payload = {"error_message": "KeyError: 'user_id'"}
        response = client.post("/api/v1/ai/debug", json=payload)
        assert response.status_code == 504


@pytest.mark.anyio
async def test_debug_ollama_malformed_json_fallback():
    # If the returned dictionary has empty or unexpected values, fallback normalization applies cleanly
    with patch("app.services.ollama_service.ollama_service._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = {
            "summary": "",
            "error_type": "",
            "root_causes": "not_a_list",
            "suggested_fixes": None,
        }

        payload = {"error_message": "KeyError: 'test'"}
        response = client.post("/api/v1/ai/debug", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["error_type"] == "KeyError"
        assert len(data["root_causes"]) >= 1
        assert len(data["suggested_fixes"]) >= 1


@pytest.mark.anyio
async def test_debug_no_arbitrary_code_execution():
    mock_model_response = {
        "summary": "Malicious code payload parsed inertly.",
        "error_type": "SyntaxError",
        "root_causes": [],
        "suggested_fixes": [],
    }

    with patch("app.services.ollama_service.ollama_service._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_model_response

        malicious_input = "__import__('os').system('echo pwned > /tmp/pwned.txt')"
        payload = {
            "error_message": malicious_input,
            "stack_trace": f"File \"exploit.py\", line 1\n    {malicious_input}",
        }

        response = client.post("/api/v1/ai/debug", json=payload)
        assert response.status_code == 200

        # Verify no file created
        assert not Path("/tmp/pwned.txt").exists()


def test_debug_language_normalization():
    req1 = DebugRequest(error_message="err", language="py")
    assert req1.language == "python"

    req2 = DebugRequest(error_message="err", language="ts")
    assert req2.language == "typescript"

    req3 = DebugRequest(error_message="err", language="auto")
    assert req3.language is None
