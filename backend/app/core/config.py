"""
Core configuration and application settings.
"""
import os
from typing import List, Set


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


settings = Settings()
