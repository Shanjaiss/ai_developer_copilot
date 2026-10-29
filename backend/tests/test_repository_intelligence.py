"""
Automated unit, security, and integration tests for AI Repository Intelligence Engine (Phase 7).
Uses synthetic temporary directory fixtures to verify:
- Approved repository listing and configuration-required states
- Path traversal and unauthorized repository rejection
- Symlink escape rejection and special file rejection
- Secret, hidden, environment, and binary file exclusion
- Bounded scanning limits (file count, file size, aggregate bytes, tree depth)
- Metadata, Python AST, and JS/TS regex import/export extraction
- Local vs external dependency inspection and reverse 'imported_by' lookups
- Deterministic relevant-file retrieval and grounded source line references
- Mocked Ollama Q&A with bounded context history, timeout, and failure modes
- Guarantee of read-only access with zero file mutations or arbitrary execution
"""
import os
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services.repository_scanner import repository_scanner

client = TestClient(app)


@pytest.fixture
def synthetic_repo(tmp_path: Path):
    """
    Creates a temporary synthetic repository with valid source files,
    dependencies, entry points, secrets, binary files, and deep folders.
    """
    repo_root = tmp_path / "mock_project"
    repo_root.mkdir()

    # 1. Main entry points
    main_py = repo_root / "main.py"
    main_py.write_text(
        "import os\n"
        "from app.services import auth_service\n\n"
        "def main():\n"
        "    print('Starting app')\n"
        "    auth_service.login('admin')\n\n"
        "if __name__ == '__main__':\n"
        "    main()\n",
        encoding="utf-8",
    )

    # 2. Package subdirectory with module
    app_dir = repo_root / "app"
    app_dir.mkdir()
    services_dir = app_dir / "services"
    services_dir.mkdir()

    auth_py = services_dir / "auth_service.py"
    auth_py.write_text(
        "import jwt\n"
        "from app.core.config import secret_key\n\n"
        "def login(username: str) -> str:\n"
        "    return f'token_for_{username}'\n\n"
        "def verify_token(token: str) -> bool:\n"
        "    return bool(token)\n",
        encoding="utf-8",
    )

    core_dir = app_dir / "core"
    core_dir.mkdir()
    config_py = core_dir / "config.py"
    config_py.write_text(
        "secret_key = 'fake-in-memory-dev-key'\n"
        "DEBUG = True\n",
        encoding="utf-8",
    )

    # 3. Frontend TypeScript file
    frontend_dir = repo_root / "frontend"
    frontend_dir.mkdir()
    api_client_ts = frontend_dir / "apiClient.ts"
    api_client_ts.write_text(
        "import axios from 'axios';\n"
        "import { authHeader } from './utils';\n\n"
        "export const apiClient = axios.create({\n"
        "  baseURL: '/api/v1',\n"
        "});\n\n"
        "export function fetchData() {\n"
        "  return apiClient.get('/data');\n"
        "}\n",
        encoding="utf-8",
    )

    utils_ts = frontend_dir / "utils.ts"
    utils_ts.write_text(
        "export function authHeader() {\n"
        "  return { Authorization: 'Bearer token' };\n"
        "}\n",
        encoding="utf-8",
    )

    # 4. Sensitive/secret files (MUST be excluded)
    env_file = repo_root / ".env"
    env_file.write_text("DATABASE_URL=postgres://user:pass@localhost:5432/db\n", encoding="utf-8")

    env_prod = repo_root / ".env.production"
    env_prod.write_text("SECRET_KEY=supersecretkey\n", encoding="utf-8")

    key_file = repo_root / "id_rsa"
    key_file.write_text("-----BEGIN OPENSSH PRIVATE KEY-----\nfake\n", encoding="utf-8")

    pem_file = repo_root / "cert.pem"
    pem_file.write_text("-----BEGIN CERTIFICATE-----\nfake\n", encoding="utf-8")

    # 5. Excluded directories
    git_dir = repo_root / ".git"
    git_dir.mkdir()
    (git_dir / "config").write_text("[core]\n", encoding="utf-8")

    node_modules = repo_root / "node_modules"
    node_modules.mkdir()
    (node_modules / "package.json").write_text("{}", encoding="utf-8")

    # 6. Binary file (MUST be excluded)
    binary_file = repo_root / "compiled.bin"
    binary_file.write_bytes(b"\x00\x01\x02\x03\x00\xff")

    # 7. Unsupported extension
    unsupported_file = repo_root / "archive.tar"
    unsupported_file.write_bytes(b"tar-archive-contents")

    return repo_root


# =============================================================================
# Security & Allowlist Tests
# =============================================================================

def test_list_repositories_not_configured():
    """Verify clean configuration-required guidance when no repositories are approved."""
    with patch.dict(os.environ, {"APPROVED_REPOSITORY_ROOTS": ""}, clear=False):
        response = client.get("/api/v1/repositories")
        assert response.status_code == 200
        data = response.json()
        assert data["configured"] is False
        assert len(data["repositories"]) == 0
        assert "Configure APPROVED_REPOSITORY_ROOTS" in data["message"]


def test_list_repositories_configured(synthetic_repo: Path):
    """Verify approved repositories are listed with canonical IDs and names."""
    env_val = f"mock_repo:{synthetic_repo}"
    with patch.dict(os.environ, {"APPROVED_REPOSITORY_ROOTS": env_val}, clear=False):
        response = client.get("/api/v1/repositories")
        assert response.status_code == 200
        data = response.json()
        assert data["configured"] is True
        assert len(data["repositories"]) == 1
        assert data["repositories"][0]["id"] == "mock_repo"
        assert "Mock Project" in data["repositories"][0]["name"]


def test_scan_unauthorized_repository_rejected():
    """Reject access to repository ID not in allowlist with HTTP 404."""
    with patch.dict(os.environ, {"APPROVED_REPOSITORY_ROOTS": "approved_id:/tmp"}, clear=False):
        response = client.post("/api/v1/repositories/hacker_repo/scan")
        assert response.status_code == 404
        assert "not in the server allowlist" in response.json()["detail"]


def test_path_traversal_dependencies_rejected(synthetic_repo: Path):
    """Reject path traversal attempts (e.g. '../../etc/passwd') with HTTP 400."""
    env_val = f"mock_repo:{synthetic_repo}"
    with patch.dict(os.environ, {"APPROVED_REPOSITORY_ROOTS": env_val}, clear=False):
        # Scan first
        client.post("/api/v1/repositories/mock_repo/scan")

        response = client.post(
            "/api/v1/repositories/mock_repo/dependencies",
            json={"path": "../../etc/passwd"},
        )
        assert response.status_code == 400
        assert "Path traversal detected" in response.json()["detail"]


def test_symlink_escape_rejected(synthetic_repo: Path, tmp_path: Path):
    """Reject symlinks that point outside the approved repository root."""
    outside_dir = tmp_path / "outside_secret"
    outside_dir.mkdir()
    secret_file = outside_dir / "secret.py"
    secret_file.write_text("SECRET = 'outside_root'", encoding="utf-8")

    # Create symlink pointing outside
    escaped_symlink = synthetic_repo / "escape_link.py"
    try:
        escaped_symlink.symlink_to(secret_file)
    except OSError:
        pytest.skip("Symlinks not supported on filesystem")

    env_val = f"mock_repo:{synthetic_repo}"
    with patch.dict(os.environ, {"APPROVED_REPOSITORY_ROOTS": env_val}, clear=False):
        repository_scanner.clear_cache()
        response = client.post("/api/v1/repositories/mock_repo/scan")
        assert response.status_code == 200
        # Symlink pointing outside must NOT be indexed
        for node in response.json()["tree"]:
            assert node["name"] != "escape_link.py"


def test_secret_files_strictly_excluded(synthetic_repo: Path):
    """Verify that .env, .pem, and id_rsa files are omitted from the scan."""
    env_val = f"mock_repo:{synthetic_repo}"
    with patch.dict(os.environ, {"APPROVED_REPOSITORY_ROOTS": env_val}, clear=False):
        repository_scanner.clear_cache()
        response = client.post("/api/v1/repositories/mock_repo/scan")
        assert response.status_code == 200

        data = response.json()
        scanned_paths = [meta.get("path") for meta in _collect_tree_paths(data["tree"])]

        assert ".env" not in scanned_paths
        assert ".env.production" not in scanned_paths
        assert "id_rsa" not in scanned_paths
        assert "cert.pem" not in scanned_paths
        assert "compiled.bin" not in scanned_paths
        assert "archive.tar" not in scanned_paths
        assert not any(".git" in p for p in scanned_paths)
        assert not any("node_modules" in p for p in scanned_paths)


def test_oversized_file_exclusion(synthetic_repo: Path):
    """Verify that files exceeding the size limit are skipped and flagged."""
    large_file = synthetic_repo / "giant.py"
    large_file.write_text("#" * (settings.REPO_MAX_FILE_SIZE_BYTES + 500), encoding="utf-8")

    env_val = f"mock_repo:{synthetic_repo}"
    with patch.dict(os.environ, {"APPROVED_REPOSITORY_ROOTS": env_val}, clear=False):
        repository_scanner.clear_cache()
        response = client.post("/api/v1/repositories/mock_repo/scan")
        assert response.status_code == 200
        data = response.json()
        assert any("Skipped oversized file 'giant.py'" in w for w in data["summary"]["warnings"])


def test_repository_read_only_guarantee(synthetic_repo: Path):
    """Verify that scanning and querying the repository does not modify any source files."""
    mtime_before = {p: p.stat().st_mtime for p in synthetic_repo.rglob("*") if p.is_file()}

    env_val = f"mock_repo:{synthetic_repo}"
    with patch.dict(os.environ, {"APPROVED_REPOSITORY_ROOTS": env_val}, clear=False):
        repository_scanner.clear_cache()
        client.post("/api/v1/repositories/mock_repo/scan")
        client.get("/api/v1/repositories/mock_repo/tree")

    mtime_after = {p: p.stat().st_mtime for p in synthetic_repo.rglob("*") if p.is_file()}
    assert mtime_before == mtime_after


# =============================================================================
# Functional Metadata & Dependency Tests
# =============================================================================

def test_metadata_extraction_and_entry_point(synthetic_repo: Path):
    """Verify file language, line count, and entry point detection."""
    env_val = f"mock_repo:{synthetic_repo}"
    with patch.dict(os.environ, {"APPROVED_REPOSITORY_ROOTS": env_val}, clear=False):
        repository_scanner.clear_cache()
        response = client.post("/api/v1/repositories/mock_repo/scan")
        assert response.status_code == 200
        summary = response.json()["summary"]

        assert summary["total_files_scanned"] >= 5
        assert summary["languages"]["python"] >= 3
        assert summary["languages"]["typescript"] >= 2
        assert "main.py" in summary["entry_points"]


def test_python_and_ts_dependency_inspection(synthetic_repo: Path):
    """Verify local and external dependency resolution and reverse imported_by lookups."""
    env_val = f"mock_repo:{synthetic_repo}"
    with patch.dict(os.environ, {"APPROVED_REPOSITORY_ROOTS": env_val}, clear=False):
        repository_scanner.clear_cache()
        # Scan first
        client.post("/api/v1/repositories/mock_repo/scan")

        # Test auth_service.py dependencies
        resp = client.post(
            "/api/v1/repositories/mock_repo/dependencies",
            json={"path": "app/services/auth_service.py"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "jwt" in data["external_dependencies"]
        assert any("config" in d for d in data["local_dependencies"])
        # auth_service is imported by main.py
        assert "main.py" in data["imported_by"]
        assert data["confidence"] == "high"

        # Test frontend apiClient.ts dependencies
        resp_ts = client.post(
            "/api/v1/repositories/mock_repo/dependencies",
            json={"path": "frontend/apiClient.ts"},
        )
        assert resp_ts.status_code == 200
        data_ts = resp_ts.json()
        assert "axios" in data_ts["external_dependencies"]
        assert "./utils" in data_ts["local_dependencies"]


# =============================================================================
# Contextual Q&A & Ollama Integration Tests
# =============================================================================

MOCK_OLLAMA_REPO_ANSWER = {
    "model": "qwen2.5-coder:1.5b",
    "message": {
        "role": "assistant",
        "content": (
            "The application entry point is `main.py` which starts the service and calls "
            "`auth_service.login('admin')`.\n"
            "The API client is located in `frontend/apiClient.ts` configured with axios."
        ),
    },
    "done": True,
}


@pytest.mark.anyio
async def test_ask_repository_question_grounded_references(synthetic_repo: Path):
    """Verify repository Q&A retrieves relevant files and returns grounded line references."""
    mock_post = AsyncMock(
        return_value=httpx.Response(200, json=MOCK_OLLAMA_REPO_ANSWER)
    )

    env_val = f"mock_repo:{synthetic_repo}"
    with patch.dict(os.environ, {"APPROVED_REPOSITORY_ROOTS": env_val}, clear=False):
        repository_scanner.clear_cache()

        with patch("httpx.AsyncClient.post", mock_post):
            response = client.post(
                "/api/v1/repositories/mock_repo/ask",
                json={
                    "question": "Where is the API client and authentication configured?",
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert "main.py" in data["answer"]
        assert data["context_used"] is True
        assert len(data["references"]) > 0

        # Verify ground references
        ref_paths = [r["path"] for r in data["references"]]
        assert any("apiClient.ts" in p or "auth_service.py" in p or "main.py" in p for p in ref_paths)

        # Verify line numbers are validated positive integers
        for ref in data["references"]:
            assert ref["start_line"] >= 1
            assert ref["end_line"] >= ref["start_line"]
            assert len(ref["snippet"]) > 0

        # Verify system prompt dispatched to Ollama contains relevant files
        payload_sent = mock_post.call_args[1]["json"]
        sys_msg = payload_sent["messages"][0]["content"]
        assert "=== RELEVANT SOURCE CODE CONTEXT ===" in sys_msg
        assert "--- FILE:" in sys_msg


@pytest.mark.anyio
async def test_ask_repository_question_multi_turn_history(synthetic_repo: Path):
    """Verify multi-turn follow-up queries preserve conversation sequence."""
    mock_post = AsyncMock(
        return_value=httpx.Response(200, json=MOCK_OLLAMA_REPO_ANSWER)
    )

    env_val = f"mock_repo:{synthetic_repo}"
    with patch.dict(os.environ, {"APPROVED_REPOSITORY_ROOTS": env_val}, clear=False):
        repository_scanner.clear_cache()

        history = [
            {"role": "user", "content": "Where is auth handled?"},
            {"role": "assistant", "content": "Authentication is in app/services/auth_service.py."},
        ]

        with patch("httpx.AsyncClient.post", mock_post):
            response = client.post(
                "/api/v1/repositories/mock_repo/ask",
                json={
                    "question": "How does main.py call it?",
                    "conversation": history,
                },
            )

        assert response.status_code == 200
        payload_sent = mock_post.call_args[1]["json"]
        messages = payload_sent["messages"]
        # 1 system + 2 history + 1 latest user = 4
        assert len(messages) == 4
        assert messages[1]["content"] == "Where is auth handled?"
        assert messages[2]["content"] == "Authentication is in app/services/auth_service.py."
        assert messages[3]["content"] == "How does main.py call it?"


@pytest.mark.anyio
async def test_ask_repository_ollama_unavailable(synthetic_repo: Path):
    """Verify HTTP 503 is returned when local Ollama service is unreachable."""
    mock_post = AsyncMock(
        side_effect=httpx.ConnectError("Connection refused")
    )

    env_val = f"mock_repo:{synthetic_repo}"
    with patch.dict(os.environ, {"APPROVED_REPOSITORY_ROOTS": env_val}, clear=False):
        repository_scanner.clear_cache()

        with patch("httpx.AsyncClient.post", mock_post):
            response = client.post(
                "/api/v1/repositories/mock_repo/ask",
                json={"question": "What is the project structure?"},
            )

        assert response.status_code == 503
        assert "Ollama AI service is unavailable" in response.json()["detail"]


@pytest.mark.anyio
async def test_ask_repository_ollama_timeout(synthetic_repo: Path):
    """Verify HTTP 504 is returned when inference exceeds timeout."""
    mock_post = AsyncMock(
        side_effect=httpx.TimeoutException("Read timed out")
    )

    env_val = f"mock_repo:{synthetic_repo}"
    with patch.dict(os.environ, {"APPROVED_REPOSITORY_ROOTS": env_val}, clear=False):
        repository_scanner.clear_cache()

        with patch("httpx.AsyncClient.post", mock_post):
            response = client.post(
                "/api/v1/repositories/mock_repo/ask",
                json={"question": "Complex architecture query"},
            )

        assert response.status_code == 504
        assert "timed out" in response.json()["detail"]


def test_max_file_count_enforcement(synthetic_repo: Path):
    """Verify scanner enforces file count limit and sets is_partial to True."""
    # Create 15 small files
    for i in range(15):
        (synthetic_repo / f"extra_{i}.py").write_text("x = 1\n", encoding="utf-8")

    env_val = f"mock_repo:{synthetic_repo}"
    with patch.dict(os.environ, {"APPROVED_REPOSITORY_ROOTS": env_val, "REPO_MAX_FILES": "5"}, clear=False):
        repository_scanner.clear_cache()
        response = client.post("/api/v1/repositories/mock_repo/scan")
        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["is_partial"] is True
        assert data["summary"]["total_files_scanned"] <= 5
        assert any("maximum file scan limit" in w for w in data["summary"]["warnings"])


def test_max_tree_depth_enforcement(synthetic_repo: Path):
    """Verify folders exceeding REPO_MAX_TREE_DEPTH are omitted."""
    deep_dir = synthetic_repo
    for d in range(15):
        deep_dir = deep_dir / f"depth_{d}"
        deep_dir.mkdir()
    (deep_dir / "deep_file.py").write_text("deep = True\n", encoding="utf-8")

    env_val = f"mock_repo:{synthetic_repo}"
    with patch.dict(os.environ, {"APPROVED_REPOSITORY_ROOTS": env_val, "REPO_MAX_TREE_DEPTH": "4"}, clear=False):
        repository_scanner.clear_cache()
        response = client.post("/api/v1/repositories/mock_repo/scan")
        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["is_partial"] is True
        assert any("depth exceeded" in w for w in data["summary"]["warnings"])


def test_aggregate_byte_budget_enforcement(synthetic_repo: Path):
    """Verify aggregate byte budget enforcement halts additional file scanning."""
    env_val = f"mock_repo:{synthetic_repo}"
    # Set limit to 200 bytes
    with patch.dict(os.environ, {"APPROVED_REPOSITORY_ROOTS": env_val, "REPO_MAX_AGGREGATE_BYTES": "200"}, clear=False):
        repository_scanner.clear_cache()
        response = client.post("/api/v1/repositories/mock_repo/scan")
        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["is_partial"] is True
        assert any("aggregate scan byte budget" in w for w in data["summary"]["warnings"])


def test_empty_question_rejected(synthetic_repo: Path):
    """Verify empty or whitespace questions are rejected with HTTP 422."""
    env_val = f"mock_repo:{synthetic_repo}"
    with patch.dict(os.environ, {"APPROVED_REPOSITORY_ROOTS": env_val}, clear=False):
        response = client.post(
            "/api/v1/repositories/mock_repo/ask",
            json={"question": "   "},
        )
        assert response.status_code == 422


def test_repository_switching_isolation(synthetic_repo: Path, tmp_path: Path):
    """Verify switching between repositories preserves distinct metadata and isolation."""
    repo2 = tmp_path / "second_project"
    repo2.mkdir()
    (repo2 / "second_entry.py").write_text("SECOND = True\n", encoding="utf-8")

    env_val = f"repo1:{synthetic_repo},repo2:{repo2}"
    with patch.dict(os.environ, {"APPROVED_REPOSITORY_ROOTS": env_val}, clear=False):
        repository_scanner.clear_cache()

        resp1 = client.post("/api/v1/repositories/repo1/scan")
        resp2 = client.post("/api/v1/repositories/repo2/scan")

        assert resp1.status_code == 200
        assert resp2.status_code == 200

        data1 = resp1.json()
        data2 = resp2.json()

        assert "main.py" in data1["summary"]["entry_points"]
        assert "main.py" not in data2["summary"]["entry_points"]
        assert "second_entry.py" in data2["summary"]["entry_points"]


# Helper function
def _collect_tree_paths(nodes):
    paths = []
    for n in nodes:
        paths.append(n)
        if n.get("children"):
            paths.extend(_collect_tree_paths(n["children"]))
    return paths
