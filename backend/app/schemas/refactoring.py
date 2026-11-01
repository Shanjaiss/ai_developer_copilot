"""
Pydantic schemas for Phase 9: AI Code Refactoring Assistant.
Defines models for code smell detection, actionable refactoring suggestions,
before/after diffs, cross-file impact analysis, and refactoring dialogue.
"""
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.repository import GroundedReference


class CodeSmell(BaseModel):
    """Identified code smell or maintainability concern."""
    type: str = Field(..., description="Category identifier of code smell (e.g. long_function, excessive_nesting).")
    title: str = Field(..., description="Short descriptive title of the smell.")
    description: str = Field(..., description="Explanation of why this pattern hurts maintainability.")
    severity: Literal["low", "medium", "high"] = Field(..., description="Qualitative severity rating.")
    line: Optional[int] = Field(default=None, ge=1, description="1-indexed line number where smell originates.")
    evidence: List[str] = Field(default_factory=list, description="Specific lines or metrics supporting the smell.")


class RefactoringSuggestion(BaseModel):
    """Specific proposed refactoring with before/after comparison and diff."""
    title: str = Field(..., description="Concise name of refactoring action (e.g. Extract Validation Helper).")
    reason: str = Field(..., description="Rationale for why this refactoring improves the design.")
    original_code: str = Field(..., description="Original code snippet targeted by the refactoring.")
    refactored_code: str = Field(..., description="Proposed refactored code suggestion.")
    diff: str = Field(..., description="Unified diff showing exact line changes.")
    benefits: List[str] = Field(default_factory=list, description="Expected improvements in readability or testability.")
    risks: List[str] = Field(default_factory=list, description="Potential behavior-change risks to verify.")
    verification_steps: List[str] = Field(default_factory=list, description="Checklist of tests to run.")


class RefactoringChatMessage(BaseModel):
    """A turn in iterative refactoring follow-up dialogue."""
    role: Literal["user", "assistant"] = Field(..., description="Message author role.")
    content: str = Field(..., min_length=1, max_length=4000, description="Message text content.")

    @field_validator("content")
    @classmethod
    def validate_content_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Message content cannot be blank.")
        return v


class CrossFileImpact(BaseModel):
    """Potential cross-file impact when refactoring within an approved repository."""
    file_path: str = Field(..., description="Repository-relative file path of affected module.")
    impact_type: Literal["caller", "dependency", "imported_by", "signature_risk"] = Field(
        ...,
        description="Type of structural relationship or risk.",
    )
    description: str = Field(..., description="Explanation of how this file may be impacted by the refactoring.")


class RefactorRequest(BaseModel):
    """Request payload for code refactoring analysis."""
    code: Optional[str] = Field(
        default=None,
        max_length=8000,
        description="Source code snippet for pasted-code mode.",
    )
    language: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Programming language (e.g. python, typescript, javascript).",
    )
    goal: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Optional specific developer goal (e.g. 'Extract validation logic').",
    )
    repository_id: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Server-approved repository ID for repository-file mode.",
    )
    file_path: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Repository-relative file path for repository-file mode.",
    )
    code_range: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Optional line range or function focus (e.g. '10-50').",
    )
    conversation: List[RefactoringChatMessage] = Field(
        default_factory=list,
        description="Optional bounded conversation history from active refactoring session.",
    )

    @field_validator("language")
    @classmethod
    def normalize_language(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        cleaned = v.strip().lower()
        if not cleaned:
            return None
        aliases = {
            "py": "python",
            "js": "javascript",
            "ts": "typescript",
            "tsx": "typescript",
            "jsx": "javascript",
            "golang": "go",
            "rs": "rust",
            "sh": "bash",
            "auto": None,
        }
        return aliases.get(cleaned, cleaned)

    @model_validator(mode="after")
    def validate_refactor_mode(self) -> "RefactorRequest":
        # Mode B: Repository file mode
        if self.repository_id:
            if not self.file_path or not self.file_path.strip():
                raise ValueError("Repository-file mode requires both 'repository_id' and 'file_path'.")
            return self

        # Mode A: Pasted code mode
        if not self.code or not self.code.strip():
            raise ValueError(
                "Either 'code' must be provided for pasted-code mode, "
                "or both 'repository_id' and 'file_path' must be provided for repository-file mode."
            )
        return self


class RefactorResponse(BaseModel):
    """Response payload containing code smells, refactorings, diffs, and impact insights."""
    summary: str = Field(..., description="High-level architectural assessment of refactoring opportunities.")
    language: str = Field(..., description="Confirmed or detected programming language.")
    mode: Literal["pasted_code", "repository_file"] = Field(..., description="Operational analysis mode.")
    code_smells: List[CodeSmell] = Field(
        default_factory=list,
        description="Detected code smells and maintainability concerns.",
    )
    refactorings: List[RefactoringSuggestion] = Field(
        default_factory=list,
        description="Proposed refactoring suggestions with before/after comparisons and diffs.",
    )
    cross_file_impacts: List[CrossFileImpact] = Field(
        default_factory=list,
        description="Cross-file dependency and caller impact insights.",
    )
    references: List[GroundedReference] = Field(
        default_factory=list,
        description="Grounded source-code references.",
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Advisory notices, limitations, and safety warnings.",
    )
    model: str = Field(..., description="AI model identifier used for analysis.")
    repository_id: Optional[str] = Field(default=None, description="Repository identifier if in repository mode.")
    file_path: Optional[str] = Field(default=None, description="Repository file path if in repository mode.")

