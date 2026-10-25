from typing import List
from pydantic import BaseModel, Field, field_validator
from app.core.config import settings


class ExplainCodeRequest(BaseModel):
    """
    Request payload for AI code explanation.
    """
    code: str = Field(
        ...,
        min_length=settings.MIN_CODE_LENGTH,
        max_length=settings.MAX_CODE_LENGTH,
        description="The source code snippet to explain (max 5000 characters).",
        examples=["def square(n):\n    return n * n"],
    )
    language: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="The programming language of the submitted code.",
        examples=["python"],
    )

    @field_validator("code")
    @classmethod
    def validate_code_not_blank(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Code snippet cannot be empty or only whitespace.")
        return v

    @field_validator("language")
    @classmethod
    def validate_and_normalize_language(cls, v: str) -> str:
        normalized = v.strip().lower()
        if not normalized:
            raise ValueError("Programming language must be specified.")
        # Normalize common aliases
        aliases = {
            "js": "javascript",
            "ts": "typescript",
            "py": "python",
            "golang": "go",
            "c++": "cpp",
            "c#": "csharp",
            "sh": "bash",
        }
        normalized = aliases.get(normalized, normalized)
        if normalized not in settings.ALLOWED_LANGUAGES:
            supported = ", ".join(sorted(settings.ALLOWED_LANGUAGES))
            raise ValueError(
                f"Unsupported language '{v}'. Supported languages: {supported}"
            )
        return normalized


class ExplainCodeResponse(BaseModel):
    """
    Structured AI code explanation response.
    """
    summary: str = Field(
        ...,
        description="High-level architectural and behavioral summary of the code.",
        examples=["This function accepts a number n and returns its mathematical square."],
    )
    line_by_line: List[str] = Field(
        ...,
        description="Sequential line-by-line breakdown explaining logic.",
        examples=[
            "Line 1: Defines the square function with argument n.",
            "Line 2: Multiplies n by itself and returns the result.",
        ],
    )
    time_complexity: str = Field(
        ...,
        description="Big-O algorithmic time complexity estimation.",
        examples=["O(1) - Constant time arithmetic operation."],
    )
    space_complexity: str = Field(
        ...,
        description="Big-O auxiliary space complexity estimation.",
        examples=["O(1) - No dynamic memory allocation."],
    )
    improvements: List[str] = Field(
        default_factory=list,
        description="Actionable recommendations for performance, readability, or typing.",
        examples=["Add type annotations: def square(n: float) -> float:"],
    )
