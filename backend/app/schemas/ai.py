from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator, model_validator
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


TestFramework = Literal["pytest", "vitest"]
TestFocus = Literal["basic", "edge_cases", "error_handling", "comprehensive"]


class GenerateTestsRequest(BaseCodeRequest):
    """
    Request payload for AI unit test generation engine.
    Specifies source code, target language, test framework, and test focus.
    """
    framework: TestFramework = Field(
        ...,
        description="Target test runner framework: pytest (Python) or vitest (JavaScript/TypeScript).",
        examples=["pytest"],
    )
    test_focus: TestFocus = Field(
        default="comprehensive",
        description="Test generation focus: basic, edge_cases, error_handling, or comprehensive.",
        examples=["comprehensive"],
    )

    @field_validator("framework", mode="before")
    @classmethod
    def validate_framework_format(cls, v: object) -> str:
        if isinstance(v, str):
            v_clean = v.strip().lower()
            if v_clean in {"pytest", "vitest"}:
                return v_clean
        raise ValueError("Unsupported framework. Supported frameworks: pytest, vitest")

    @field_validator("test_focus", mode="before")
    @classmethod
    def validate_test_focus_format(cls, v: object) -> str:
        if isinstance(v, str):
            v_clean = v.strip().lower()
            if v_clean in {"basic", "edge_cases", "error_handling", "comprehensive"}:
                return v_clean
        raise ValueError(
            "Invalid test focus. Supported values: basic, edge_cases, error_handling, comprehensive"
        )

    @model_validator(mode="after")
    def validate_language_framework_compatibility(self) -> "GenerateTestsRequest":
        """
        Validates that the selected testing framework is compatible with the programming language.
        Supported combinations:
          - python -> pytest
          - javascript -> vitest
          - typescript -> vitest
        """
        valid_pairings = {
            "python": {"pytest"},
            "javascript": {"vitest"},
            "typescript": {"vitest"},
        }
        lang = self.language
        fw = self.framework

        if lang not in valid_pairings:
            supported_langs = ", ".join(sorted(valid_pairings.keys()))
            raise ValueError(
                f"Language '{lang}' is not supported for test generation. Supported languages: {supported_langs}"
            )

        allowed_fw = valid_pairings[lang]
        if fw not in allowed_fw:
            allowed_str = ", ".join(sorted(allowed_fw))
            raise ValueError(
                f"Framework '{fw}' is incompatible with language '{lang}'. Allowed framework(s) for {lang}: {allowed_str}"
            )

        return self


class GeneratedTestCase(BaseModel):
    """
    Structured representation of a single unit test case.
    """
    name: str = Field(
        ...,
        description="Identifier or function name of the test case.",
        examples=["test_add_positive_numbers"],
    )
    category: str = Field(
        default="normal",
        description="Category: normal, edge_case, error_handling, boundary, etc.",
        examples=["normal"],
    )
    description: str = Field(
        ...,
        description="Detailed description of what the test case checks.",
        examples=["Checks addition of two positive integers."],
    )
    expected_behavior: str = Field(
        ...,
        description="Observable expected outcome or return value.",
        examples=["Returns the sum of both inputs."],
    )


class GenerateTestsResponse(BaseModel):
    """
    Structured AI unit test generation response.
    """
    summary: str = Field(
        ...,
        description="Executive summary of the generated test suite.",
        examples=["Generated comprehensive unit tests for the add function."],
    )
    language: str = Field(
        ...,
        description="Programming language of the tested code.",
        examples=["python"],
    )
    framework: str = Field(
        ...,
        description="Testing framework: pytest or vitest.",
        examples=["pytest"],
    )
    test_focus: str = Field(
        ...,
        description="Selected test focus: basic, edge_cases, error_handling, comprehensive.",
        examples=["comprehensive"],
    )
    generated_test_code: str = Field(
        ...,
        description="Complete, framework-compliant unit test code as plain text.",
        examples=["import pytest\n\ndef test_add():\n    assert add(1, 2) == 3\n"],
    )
    test_cases: List[GeneratedTestCase] = Field(
        default_factory=list,
        description="List of discrete test case structures.",
    )
    coverage_notes: List[str] = Field(
        default_factory=list,
        description="Logical test coverage intentions and input domain partitions.",
    )
    assumptions: List[str] = Field(
        default_factory=list,
        description="Contract assumptions and type bounds assumed about the source code.",
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Disclaimers, caveats, and safety warnings.",
    )


# =============================================================================
# Phase 6: Conversational AI Coding Assistant
# =============================================================================

ChatRole = Literal["user", "assistant"]


class ChatMessage(BaseModel):
    """
    A single message turn in a multi-turn conversation.
    Strictly limited to 'user' and 'assistant' roles (rejects client-supplied 'system' or 'developer').
    """
    role: ChatRole = Field(
        ...,
        description="The role of the message author: 'user' or 'assistant'.",
        examples=["user"],
    )
    content: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="Text content of the message.",
        examples=["Explain Python decorators."],
    )

    @field_validator("content")
    @classmethod
    def validate_content_not_blank(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Message content cannot be empty or only whitespace.")
        return v


class ChatRequest(BaseModel):
    """
    Request schema for conversational AI coding assistance.
    """
    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The latest user message or coding query.",
        examples=["Explain Python decorators."],
    )
    language: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Optional programming language context.",
        examples=["python"],
    )
    code_context: Optional[str] = Field(
        default=None,
        max_length=5000,
        description="Optional code snippet or traceback context.",
        examples=["def add(a, b): return a + b"],
    )
    conversation: List[ChatMessage] = Field(
        default_factory=list,
        description="Ordered sequence of previous conversation turns for multi-turn context.",
    )

    @field_validator("message")
    @classmethod
    def validate_message_not_blank(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Message cannot be empty or only whitespace.")
        return v

    @field_validator("language")
    @classmethod
    def normalize_language_if_present(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        trimmed = v.strip().lower()
        if not trimmed:
            return None
        aliases = {
            "js": "javascript",
            "ts": "typescript",
            "py": "python",
            "golang": "go",
            "c++": "cpp",
            "c#": "csharp",
            "sh": "bash",
        }
        normalized = aliases.get(trimmed, trimmed)
        if normalized not in settings.ALLOWED_LANGUAGES:
            supported = ", ".join(sorted(settings.ALLOWED_LANGUAGES))
            raise ValueError(
                f"Unsupported language '{v}'. Supported languages: {supported}"
            )
        return normalized

    @field_validator("code_context")
    @classmethod
    def validate_code_context(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if not v.strip():
            return None
        return v


class ChatResponse(BaseModel):
    """
    Response schema for conversational AI coding assistance.
    """
    reply: str = Field(
        ...,
        description="The AI coding assistant's conversational response.",
        examples=["Decorators wrap functions to extend their behavior without modifying source code."],
    )
    model: str = Field(
        default=settings.OLLAMA_MODEL,
        description="The local LLM model used for inference.",
        examples=["qwen2.5-coder:1.5b"],
    )
    context_used: bool = Field(
        default=False,
        description="Whether conversation history or code context was incorporated into the prompt.",
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Any warnings regarding context truncation or limitations.",
    )



