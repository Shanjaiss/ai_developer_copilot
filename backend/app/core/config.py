"""
Core configuration and application settings.
"""
import os
from typing import List, Set, Dict
from pathlib import Path

try:
    from dotenv import load_dotenv, find_dotenv
    # Automatically discover and load .env from workspace or parent directories
    _env_path = find_dotenv(usecwd=True)
    if _env_path:
        load_dotenv(_env_path)
    else:
        _fallback_env = Path(__file__).resolve().parent.parent.parent.parent / ".env"
        if _fallback_env.is_file():
            load_dotenv(_fallback_env)
except ImportError:
    pass



class Settings:
    PROJECT_NAME: str = "AI Developer Copilot API"
    VERSION: str = "0.2.0"
    ENVIRONMENT: str = os.getenv("APP_ENV", "development")

    # Local Ollama Configuration
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:1.5b")
    OLLAMA_TIMEOUT_SECONDS: float = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "60.0"))

    # Security & Code Size Limits
    MIN_CODE_LENGTH: int = 1
    MAX_CODE_LENGTH: int = int(os.getenv("MAX_CODE_LENGTH", "5000"))  # ~100-150 lines of code

    # Supported Programming Languages
    ALLOWED_LANGUAGES: Set[str] = {
        "python",
        "javascript",
        "typescript",
        "go",
        "rust",
        "java",
        "cpp",
        "c",
        "csharp",
        "ruby",
        "php",
        "swift",
        "kotlin",
        "sql",
        "html",
        "css",
        "bash",
        "shell",
    }

    # CORS Default Origins
    DEFAULT_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]

    @property
    def cors_origins(self) -> List[str]:
        env_origins = os.getenv("CORS_ORIGINS")
        if env_origins:
            return [origin.strip() for origin in env_origins.split(",") if origin.strip()]
        return self.DEFAULT_ORIGINS

    # Phase 7: Repository Intelligence Configuration & Limits
    APPROVED_REPOSITORY_ROOTS: str = os.getenv("APPROVED_REPOSITORY_ROOTS", "")
    REPO_MAX_FILES: int = int(os.getenv("REPO_MAX_FILES", "300"))
    REPO_MAX_FILE_SIZE_BYTES: int = int(os.getenv("REPO_MAX_FILE_SIZE_BYTES", str(100 * 1024)))  # 100 KB
    REPO_MAX_AGGREGATE_BYTES: int = int(os.getenv("REPO_MAX_AGGREGATE_BYTES", str(3 * 1024 * 1024)))  # 3 MB
    REPO_MAX_TREE_DEPTH: int = int(os.getenv("REPO_MAX_TREE_DEPTH", "12"))
    REPO_MAX_CONTEXT_FILES: int = int(os.getenv("REPO_MAX_CONTEXT_FILES", "5"))
    REPO_MAX_CONTEXT_CHARS: int = int(os.getenv("REPO_MAX_CONTEXT_CHARS", "8000"))
    REPO_MAX_CONVERSATION_TURNS: int = int(os.getenv("REPO_MAX_CONVERSATION_TURNS", "6"))

    def get_approved_repositories(self) -> Dict[str, Path]:
        """
        Parses APPROVED_REPOSITORY_ROOTS into a mapping of repository_id -> canonical Path.
        Format can be JSON object (e.g. '{"copilot": "/path/to/repo"}') or
        comma-separated 'id:path' or 'id=path' pairs (e.g. 'copilot:/path/to/repo,project2:/path2').
        Resolves canonical paths and rejects non-existent directories.
        """
        import json
        raw = os.getenv("APPROVED_REPOSITORY_ROOTS", self.APPROVED_REPOSITORY_ROOTS).strip()
        if (raw.startswith('"') and raw.endswith('"')) or (raw.startswith("'") and raw.endswith("'")):
            raw = raw[1:-1].strip()
        if not raw:
            return {}
        repos: Dict[str, Path] = {}
        if raw.startswith("{"):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    for k, v in parsed.items():
                        clean_path = str(v).strip().strip("'\"")
                        p = Path(clean_path).resolve()
                        if p.exists() and p.is_dir():
                            clean_id = str(k).strip().strip("'\"").lower()
                            repos[clean_id] = p
            except Exception:
                pass
        else:
            for item in raw.split(","):
                item = item.strip().strip("'\"")
                if not item:
                    continue
                sep = ":" if ":" in item else "="
                if sep in item:
                    repo_id, path_str = item.split(sep, 1)
                    repo_id = repo_id.strip().strip("'\"").lower()
                    p = Path(path_str.strip().strip("'\"")).resolve()
                    if p.exists() and p.is_dir():
                        repos[repo_id] = p
                else:
                    p = Path(item.strip().strip("'\"")).resolve()
                    if p.exists() and p.is_dir():
                        repos[p.name.lower()] = p
        return repos


settings = Settings()
