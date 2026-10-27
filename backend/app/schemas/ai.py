from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator
from app.core.config import settings


class BaseCodeRequest(BaseModel):
    """
    Base request payload for AI code operations.
    Validates character limits, non-empty content, and supported programming languages.
    """
    code: str = Field(
        ...,
        min_length=settings.MIN_CODE_LENGTH,
        max_length=settings.MAX_CODE_LENGTH,
        description="The source code snippet (max 5000 characters).",
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


class ExplainCodeRequest(BaseCodeRequest):
    """
    Request payload for AI code explanation.
    """
    pass


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


class ReviewCodeRequest(BaseCodeRequest):
    """
    Request payload for AI code review and bug detection.
    """
    pass


SeverityLevel = Literal["low", "medium", "high", "critical"]
OverallRiskLevel = Literal["clean", "low", "medium", "high", "critical"]
CategoryType = Literal[
    "correctness",
    "maintainability",
    "performance",
    "security",
    "style",
    "other",
]


class ReviewIssue(BaseModel):
    """
    Individual code review finding or bug observation.
    Note: AI-generated findings are heuristic suggestions and not verified vulnerabilities.
    """
    title: str = Field(
        ...,
        description="Concise, descriptive title of the issue.",
        examples=["Potential division by zero"],
    )
    severity: SeverityLevel = Field(
        ...,
        description="Assessed severity level: low, medium, high, or critical.",
        examples=["medium"],
    )
    category: CategoryType = Field(
        default="correctness",
        description="Category: correctness, maintainability, performance, security, style, or other.",
        examples=["correctness"],
    )
    line: Optional[int] = Field(
        default=None,
        description="1-indexed line number in submitted code, or null if general/unknown.",
        examples=[2],
    )
    description: str = Field(
        ...,
        description="Explanation of the potential bug, flaw, or edge case.",
        examples=["Division may fail at runtime when b is zero."],
    )
    suggestion: str = Field(
        ...,
        description="Actionable code change or pattern to resolve the issue.",
        examples=["Validate the denominator before division and raise a descriptive error."],
    )


class ReviewCodeResponse(BaseModel):
    """
    Structured AI code review response.
    """
    summary: str = Field(
        ...,
        description="Executive summary of the code review findings.",
        examples=["Code review completed: identified 1 potential correctness issue."],
    )
    overall_risk: OverallRiskLevel = Field(
        ...,
        description="Overall risk level: clean, low, medium, high, or critical.",
        examples=["medium"],
    )
    issues: List[ReviewIssue] = Field(
        default_factory=list,
        description="List of detected code issues, bugs, or risks (empty if code is clean).",
    )
    improved_code: str = Field(
        ...,
        description="Safer, refactored, and improved version of the submitted code.",
        examples=[
            "def divide(a, b):\n    if b == 0:\n        raise ValueError('Denominator cannot be zero')\n    return a / b"
        ],
    )


OptimizationGoal = Literal["performance", "readability", "memory", "maintainability"]


class OptimizeCodeRequest(BaseCodeRequest):
    """
    Request payload for AI code optimization engine.
    Allows targeting specific optimization dimensions: performance, readability, memory, or maintainability.
    """
    optimization_goal: OptimizationGoal = Field(
        default="performance",
        description="Target optimization objective: performance, readability, memory, or maintainability.",
        examples=["performance"],
    )

    @field_validator("optimization_goal", mode="before")
    @classmethod
    def validate_and_normalize_goal(cls, v: object) -> str:
        if isinstance(v, str):
            v_clean = v.strip().lower()
            if v_clean in {"performance", "readability", "memory", "maintainability"}:
                return v_clean
        raise ValueError(
            "Invalid optimization goal. Supported goals: performance, readability, memory, maintainability"
        )


class ComplexityMetrics(BaseModel):
    """
    Big-O algorithmic complexity estimates for time and space.
    """
    time: str = Field(
        ...,
        description="Big-O algorithmic time complexity estimate.",
        examples=["O(n)"],
    )
    space: str = Field(
        ...,
        description="Big-O auxiliary space complexity estimate.",
        examples=["O(1)"],
    )


class OptimizationChange(BaseModel):
    """
    Discrete modification made during code optimization.
    """
    title: str = Field(
        ...,
        description="Concise title describing the code change.",
        examples=["Use Hash Set for O(1) Lookups"],
    )
    reason: str = Field(
        ...,
        description="Justification for why this change optimizes toward the goal.",
        examples=["Replaces O(n) inner loop scan with constant-time O(1) set lookup."],
    )
    tradeoff: str = Field(
        ...,
        description="Engineering trade-offs (e.g., extra memory, complexity, or readability impact).",
        examples=["Requires O(n) auxiliary memory for the hash set."],
    )


class OptimizeCodeResponse(BaseModel):
    """
    Structured AI code optimization response.
    """
    summary: str = Field(
        ...,
        description="High-level explanation of optimization results.",
        examples=["Refactored nested loops to set-based lookups, improving time complexity from O(n^2) to O(n)."],
    )
    original_complexity: ComplexityMetrics = Field(
        ...,
        description="Estimated time and space complexity of original code.",
    )
    optimized_complexity: ComplexityMetrics = Field(
        ...,
        description="Estimated time and space complexity of optimized code.",
    )
    optimized_code: str = Field(
        ...,
        description="Optimized source code snippet. May be identical to original if code is already optimal.",
    )
    changes: List[OptimizationChange] = Field(
        default_factory=list,
        description="List of specific changes applied with reasons and trade-offs.",
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Advisories, trade-off notes, behavioral caveats, and benchmark reminders.",
    )

