"""
Automated pytest suite for Phase 10: AI Documentation Generator.
Covers deterministic static extraction, multi-mode documentation generation,
security sandbox protections, secret redaction, and Ollama failure modes.
"""
import json
import os
import shutil
import tempfile
from pathlib import Path
from typing import Generator, Tuple
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.schemas.documentation import (
    DocumentationRequest,
    DocumentationResponse,
)
from app.services.documentation_extractor import DocumentationExtractor
from app.services.documentation_service import DocumentationService

client = TestClient(app)


# -----------------------------------------------------------------------------
# Fixtures
# -----------------------------------------------------------------------------

@pytest.fixture
def synthetic_doc_repo() -> Generator[Tuple[str, Path], None, None]:
    """Creates a temporary approved synthetic repository for testing documentation generation."""
    temp_dir = tempfile.mkdtemp(prefix="doc_test_repo_")
    repo_path = Path(temp_dir).resolve()
    repo_id = "doc_sample_repo"

    # Create project structure
    (repo_path / "backend" / "app" / "routers").mkdir(parents=True, exist_ok=True)
    (repo_path / "frontend" / "src").mkdir(parents=True, exist_ok=True)

    # 1. Manifest: package.json
    pkg_json = {
        "name": "sample-project",
        "version": "1.2.0",
        "description": "Synthetic project for documentation verification",
        "scripts": {
            "dev": "vite",
            "build": "tsc && vite build",
            "test": "vitest",
        },
        "dependencies": {
            "react": "^19.0.0",
            "react-dom": "^19.0.0",
        },
        "devDependencies": {
            "typescript": "^5.0.0",
        },
    }
    (repo_path / "package.json").write_text(json.dumps(pkg_json, indent=2))

    # 2. Python manifest: requirements.txt
    (repo_path / "requirements.txt").write_text("fastapi==0.115.0\npydantic==2.9.0\npytest>=8.0.0\n")

    # 3. Python router: backend/app/routers/items.py
    items_py = '''"""Items API router module."""
from fastapi import APIRouter

router = APIRouter(prefix="/items")

@router.get("/{item_id}")
def get_item(item_id: int, q: str = ""):
    """Retrieve an item by ID."""
    return {"item_id": item_id, "q": q}

@router.post("/")
def create_item(name: str, price: float):
    """Create a new catalog item."""
    return {"name": name, "price": price}
'''
    (repo_path / "backend" / "app" / "routers" / "items.py").write_text(items_py)

    # 4. Entrypoint: backend/app/main.py
    main_py = '''"""Primary FastAPI Application Entry Point."""
from fastapi import FastAPI
from app.routers import items

app = FastAPI(title="Sample API", version="1.2.0")
app.include_router(items.router)
'''
    (repo_path / "backend" / "app" / "main.py").write_text(main_py)

    # 5. Secret file: .env
    (repo_path / ".env").write_text("SECRET_KEY=super_secret_dont_leak\nAPI_TOKEN=xyz123\n")

    # Inject into approved repositories
    orig_approved = settings.APPROVED_REPOSITORY_ROOTS
    settings.APPROVED_REPOSITORY_ROOTS = f"{repo_id}:{repo_path}"

    with patch.dict(os.environ, {"APPROVED_REPOSITORY_ROOTS": f"{repo_id}:{repo_path}"}):
        try:
            yield repo_id, repo_path
        finally:
            settings.APPROVED_REPOSITORY_ROOTS = orig_approved
            shutil.rmtree(temp_dir, ignore_errors=True)


# -----------------------------------------------------------------------------
# Unit Tests: Static Documentation Extractor
# -----------------------------------------------------------------------------

def test_extractor_python_ast():
    code = '''"""Math utilities."""
def add_numbers(a: int, b: int = 0) -> int:
    """Adds two integers."""
    return a + b

class Calculator:
    """Performs calculations."""
    def multiply(self, x: float, y: float) -> float:
        return x * y
'''
    meta, facts, sources, warnings = DocumentationExtractor.extract_python_metadata(code, "utils/math.py")
    assert meta["language"] == "python"
    assert len(meta["functions"]) == 1
    assert meta["functions"][0]["name"] == "add_numbers"
    assert "a: int" in meta["functions"][0]["params"][0]
    assert len(meta["classes"]) == 1
    assert meta["classes"][0]["name"] == "Calculator"
    assert any("add_numbers" in f.fact for f in facts)
    assert any("Calculator" in f.fact for f in facts)
    assert len(sources) >= 2


def test_extractor_python_fastapi_endpoints():
    code = '''from fastapi import APIRouter
router = APIRouter()

@router.get("/users/{user_id}")
def get_user_profile(user_id: int):
    """Fetch user profile."""
    pass
'''
    meta, facts, sources, _ = DocumentationExtractor.extract_python_metadata(code, "routers/users.py")
    assert len(meta["endpoints"]) == 1
    ep = meta["endpoints"][0]
    assert ep["method"] == "GET"
    assert ep["path"] == "/users/{user_id}"
    assert any("GET endpoint at '/users/{user_id}'" in f.fact for f in facts)


def test_extractor_python_syntax_error_fallback():
    code = "def incomplete_func(a, b\n    return a + b"
    meta, facts, sources, warnings = DocumentationExtractor.extract_python_metadata(code)
    assert len(warnings) > 0
    assert "syntax error" in warnings[0].lower()


def test_extractor_jsts_metadata():
    code = '''import { useState } from 'react';
import axios from 'axios';

export interface UserDTO {
  id: string;
  name: string;
}

export async function fetchUser(id: string): Promise<UserDTO> {
  const res = await axios.get(`/users/${id}`);
  return res.data;
}
'''
    meta, facts, sources, _ = DocumentationExtractor.extract_jsts_metadata(code, "services/users.ts")
    assert meta["language"] == "typescript"
    assert len(meta["interfaces"]) == 1
    assert meta["interfaces"][0]["name"] == "UserDTO"
    assert len(meta["functions"]) == 1
    assert meta["functions"][0]["name"] == "fetchUser"
    assert any("UserDTO" in f.fact for f in facts)


# -----------------------------------------------------------------------------
# Integration Tests: Documentation API
# -----------------------------------------------------------------------------

def test_generate_documentation_pasted_code_success():
    payload = {
        "mode": "pasted_code",
        "documentation_type": "function",
        "language": "python",
        "code": "def calculate_bmi(weight_kg: float, height_m: float) -> float:\n    \"\"\"Calculates BMI.\"\"\"\n    return weight_kg / (height_m ** 2)",
        "audience": "developer",
        "detail_level": "standard",
    }
    mock_llm_response = {
        "title": "BMI Calculation Function Documentation",
        "markdown": "## `calculate_bmi`\n\nCalculates Body Mass Index (BMI) given weight and height.\n\n### Parameters\n- `weight_kg`: float\n- `height_m`: float\n\n### Returns\n- `float`: BMI value",
        "assumptions": [
            {
                "claim": "Metric units are required",
                "basis": "Variable suffixes weight_kg and height_m",
                "verification_needed": "Confirm with product specs",
            }
        ],
        "warnings": [],
    }

    with patch("app.services.ollama_service.OllamaService._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_llm_response
        res = client.post("/api/v1/ai/generate-documentation", json=payload)

    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "BMI Calculation Function Documentation"
    assert "calculate_bmi" in data["markdown"]
    assert len(data["verified_facts"]) > 0
    assert len(data["sources"]) > 0
    assert data["sources"][0]["path"] == "pasted_code"
    assert data["assumptions"][0]["claim"] == "Metric units are required"


def test_generate_documentation_repository_readme_success(synthetic_doc_repo):
    repo_id, _ = synthetic_doc_repo
    payload = {
        "mode": "repository_readme",
        "documentation_type": "readme",
        "repository_id": repo_id,
        "audience": "developer",
        "detail_level": "standard",
    }
    mock_llm_response = {
        "title": "Sample Project README",
        "markdown": "# sample-project\n\nSynthetic project for documentation verification.\n\n## Verified Stack\n- Node.js & React\n- Python & FastAPI\n\n## Verified Scripts\n- `npm run dev`\n- `npm run build`\n- `npm run test`",
        "assumptions": [],
        "warnings": [],
    }

    with patch("app.services.ollama_service.OllamaService._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_llm_response
        res = client.post("/api/v1/ai/generate-documentation", json=payload)

    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "Sample Project README"
    assert "sample-project" in data["markdown"]
    assert any(f["category"] == "technology" for f in data["verified_facts"])
    assert any(f["category"] == "scripts" for f in data["verified_facts"])
    assert data["repository_used"] == repo_id


def test_generate_documentation_api_endpoints_success(synthetic_doc_repo):
    repo_id, _ = synthetic_doc_repo
    payload = {
        "mode": "api_documentation",
        "documentation_type": "api",
        "repository_id": repo_id,
        "audience": "developer",
        "detail_level": "standard",
    }
    mock_llm_response = {
        "title": "Sample Project API Reference",
        "markdown": "# API Reference\n\n### `GET /items/{item_id}`\nRetrieve an item by ID.\n\n### `POST /items/`\nCreate a new catalog item.",
        "assumptions": [],
        "warnings": [],
    }

    with patch("app.services.ollama_service.OllamaService._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_llm_response
        res = client.post("/api/v1/ai/generate-documentation", json=payload)

    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "Sample Project API Reference"
    assert "/items/{item_id}" in data["markdown"]
    assert any(f["category"] == "endpoint" for f in data["verified_facts"])


def test_generate_documentation_architecture_success(synthetic_doc_repo):
    repo_id, _ = synthetic_doc_repo
    payload = {
        "mode": "architecture_documentation",
        "documentation_type": "architecture",
        "repository_id": repo_id,
        "audience": "architect",
        "detail_level": "comprehensive",
    }
    mock_llm_response = {
        "title": "System Architecture Overview",
        "markdown": "# Architecture Overview\n\n## Subsystems\n- **Backend**: FastAPI REST service with modular routers\n- **Frontend**: React and Vite client application",
        "assumptions": [],
        "warnings": [],
    }

    with patch("app.services.ollama_service.OllamaService._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_llm_response
        res = client.post("/api/v1/ai/generate-documentation", json=payload)

    assert res.status_code == 200
    data = res.json()
    assert "System Architecture" in data["title"]
    assert "Backend" in data["markdown"]


def test_generate_documentation_selected_file_success(synthetic_doc_repo):
    repo_id, _ = synthetic_doc_repo
    payload = {
        "mode": "selected_file",
        "documentation_type": "module",
        "repository_id": repo_id,
        "file_path": "backend/app/routers/items.py",
        "audience": "developer",
    }
    mock_llm_response = {
        "title": "Items Router Module Documentation",
        "markdown": "# Items Router (`backend/app/routers/items.py`)\n\nManages catalog item endpoints.",
        "assumptions": [],
        "warnings": [],
    }

    with patch("app.services.ollama_service.OllamaService._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_llm_response
        res = client.post("/api/v1/ai/generate-documentation", json=payload)

    assert res.status_code == 200
    data = res.json()
    assert data["file_path_used"] == "backend/app/routers/items.py"
    assert any("get_item" in f["fact"] for f in data["verified_facts"])


# -----------------------------------------------------------------------------
# Security & Validation Tests
# -----------------------------------------------------------------------------

def test_validation_empty_pasted_code_rejected():
    payload = {
        "mode": "pasted_code",
        "code": "   ",
    }
    res = client.post("/api/v1/ai/generate-documentation", json=payload)
    assert res.status_code == 422


def test_validation_missing_repo_for_readme_rejected():
    payload = {
        "mode": "repository_readme",
        "documentation_type": "readme",
    }
    res = client.post("/api/v1/ai/generate-documentation", json=payload)
    assert res.status_code == 422


def test_validation_missing_file_path_for_selected_file_rejected(synthetic_doc_repo):
    repo_id, _ = synthetic_doc_repo
    payload = {
        "mode": "selected_file",
        "repository_id": repo_id,
    }
    res = client.post("/api/v1/ai/generate-documentation", json=payload)
    assert res.status_code == 422


def test_unauthorized_repository_rejected():
    payload = {
        "mode": "repository_readme",
        "repository_id": "malicious_unapproved_repo",
    }
    res = client.post("/api/v1/ai/generate-documentation", json=payload)
    assert res.status_code == 403
    assert "not in the approved repository list" in res.json()["detail"]


def test_path_traversal_rejected(synthetic_doc_repo):
    repo_id, _ = synthetic_doc_repo
    payload = {
        "mode": "selected_file",
        "repository_id": repo_id,
        "file_path": "../../../etc/passwd",
    }
    res = client.post("/api/v1/ai/generate-documentation", json=payload)
    assert res.status_code == 400
    assert "Unsafe file path detected" in res.json()["detail"]


def test_secret_file_exclusion_rejected(synthetic_doc_repo):
    repo_id, _ = synthetic_doc_repo
    payload = {
        "mode": "selected_file",
        "repository_id": repo_id,
        "file_path": ".env",
    }
    res = client.post("/api/v1/ai/generate-documentation", json=payload)
    assert res.status_code == 400
    assert "secret/restricted file" in res.json()["detail"]


def test_secret_redaction_before_inference():
    payload = {
        "mode": "pasted_code",
        "documentation_type": "function",
        "language": "python",
        "code": "API_KEY = 'AKIAIOSFODNN7EXAMPLE'\ndef connect(): pass",
    }
    mock_llm_response = {
        "title": "Connection Documentation",
        "markdown": "## connect\n\nEstablishes connection.",
        "assumptions": [],
        "warnings": [],
    }

    with patch("app.services.ollama_service.OllamaService._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_llm_response
        res = client.post("/api/v1/ai/generate-documentation", json=payload)

        prompt_sent = mock_gen.call_args[1]["prompt"]
        assert "AKIAIOSFODNN7EXAMPLE" not in prompt_sent
        assert "[REDACTED_SECRET]" in prompt_sent

    assert res.status_code == 200


def test_read_only_guarantee_no_disk_writes(synthetic_doc_repo):
    repo_id, repo_path = synthetic_doc_repo
    readme_path = repo_path / "README.md"
    assert not readme_path.exists()

    payload = {
        "mode": "repository_readme",
        "documentation_type": "readme",
        "repository_id": repo_id,
    }
    mock_llm_response = {
        "title": "README",
        "markdown": "# Readme Title",
        "assumptions": [],
        "warnings": [],
    }
    with patch("app.services.ollama_service.OllamaService._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_llm_response
        res = client.post("/api/v1/ai/generate-documentation", json=payload)

    assert res.status_code == 200
    # Crucial guarantee: README.md was NOT created on disk!
    assert not readme_path.exists()


def test_ollama_unavailable_503():
    payload = {
        "mode": "pasted_code",
        "code": "def foo(): pass",
    }
    with patch(
        "app.services.ollama_service.OllamaService._generate_json",
        side_effect=HTTPException(status_code=503, detail="Ollama AI service is unavailable"),
    ):
        res = client.post("/api/v1/ai/generate-documentation", json=payload)

    assert res.status_code == 503
    assert "unavailable" in res.json()["detail"]


def test_ollama_timeout_504():
    payload = {
        "mode": "pasted_code",
        "code": "def foo(): pass",
    }
    with patch(
        "app.services.ollama_service.OllamaService._generate_json",
        side_effect=HTTPException(status_code=504, detail="AI model inference timed out"),
    ):
        res = client.post("/api/v1/ai/generate-documentation", json=payload)

    assert res.status_code == 504
    assert "timed out" in res.json()["detail"]


def test_malformed_model_output_fallback():
    payload = {
        "mode": "pasted_code",
        "code": "def calculate_tax(rate, amount): return rate * amount",
    }
    # Model returns empty markdown
    mock_llm_response = {
        "title": "Tax Calculator",
        "markdown": "",
        "assumptions": [],
        "warnings": [],
    }
    with patch("app.services.ollama_service.OllamaService._generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_llm_response
        res = client.post("/api/v1/ai/generate-documentation", json=payload)

    assert res.status_code == 200
    data = res.json()
    # Confirms fallback generated structured markdown
    assert len(data["markdown"]) > 0
    assert "calculate_tax" in data["markdown"] or "Verified Characteristics" in data["markdown"]


def test_language_normalization():
    req = DocumentationRequest(
        mode="pasted_code",
        code="def run(): pass",
        language="PY",
    )
    assert req.language == "python"

    req_ts = DocumentationRequest(
        mode="pasted_code",
        code="export const x = 1;",
        language="TSX",
    )
    assert req_ts.language == "typescript"
