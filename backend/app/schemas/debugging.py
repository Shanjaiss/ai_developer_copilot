"""
Pydantic schemas for Phase 8: AI Bug Detection & Debugging Assistant.
Defines models for stack trace parsing, root cause analysis, actionable fixes,
grounded evidence citation, and conversational debugging dialogue.
"""
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator

from app.schemas.repository import GroundedReference


class StackFrame(BaseModel):
    """Structured representation of an individual execution stack frame."""
    file_path: Optional[str] = Field(default=None, description="File path referenced in the frame.")
    line_number: Optional[int] = Field(default=None, ge=1, description="1-indexed line number in source.")
    column_number: Optional[int] = Field(default=None, ge=1, description="1-indexed column number if available.")
    function_name: Optional[str] = Field(default=None, description="Function, method, or scope name.")
    code_line: Optional[str] = Field(default=None, description="Source line content captured in the trace.")
    is_in_repository: bool = Field(default=False, description="True if frame resolved to an approved repository file.")


class RootCauseHypothesis(BaseModel):
    """Plausible explanation of the root cause behind an error."""
    title: str = Field(..., description="Concise diagnostic heading of the root cause.")
    description: str = Field(..., description="Detailed explanation of how this root cause triggers the error.")
    confidence: Literal["high", "medium", "low"] = Field(
        ...,
        description="Qualitative confidence rating based on available evidence.",
    )
    evidence: List[str] = Field(
        default_factory=list,
        description="Specific variables, lines, or symptom patterns supporting this hypothesis.",
    )


class SuggestedFix(BaseModel):
    """Actionable suggested fix to resolve the error."""
    title: str = Field(..., description="Concise title for the proposed fix.")
    explanation: str = Field(..., description="Explanation of why this fix addresses the root cause.")
    code_example: Optional[str] = Field(default=None, description="Code snippet demonstrating the suggested fix.")
    verification_steps: List[str] = Field(
        default_factory=list,
        description="Step-by-step checklist to test and verify the fix.",
    )


class DebugChatMessage(BaseModel):
    """A turn in iterative debugging dialogue."""
    role: Literal["user", "assistant"] = Field(..., description="Message author role.")
    content: str = Field(..., min_length=1, max_length=4000, description="Message text content.")

    @field_validator("content")
    @classmethod
    def validate_content_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Message content cannot be blank.")
        return v


class DebugRequest(BaseModel):
    """Request payload for AI bug detection and debugging analysis."""
    error_message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Primary error message, exception text, or symptom description.",
    )
    stack_trace: Optional[str] = Field(
        default=None,
        max_length=8000,
        description="Optional execution stack trace or traceback.",
    )
    language: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Programming language (e.g. python, typescript, javascript). Auto-detected if omitted.",
    )
    code_context: Optional[str] = Field(
        default=None,
        max_length=5000,
        description="Optional relevant code snippet pasted by the developer.",
    )
    repository_id: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Optional approved repository ID for repository-aware debugging.",
    )
    conversation: List[DebugChatMessage] = Field(
        default_factory=list,
        description="Optional bounded conversation history from active debugging session.",
    )

    @field_validator("error_message")
    @classmethod
    def validate_error_message_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Error message cannot be empty or only whitespace.")
        return v

    @field_validator("language")
    @classmethod
    def normalize_language(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        cleaned = v.strip().lower()
        if not cleaned:
            return None
        # Normalize common aliases
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


class DebugResponse(BaseModel):
    """Response payload containing structured debugging analysis, root causes, and fixes."""
    summary: str = Field(..., description="High-level diagnostic summary explaining the issue.")
    error_type: str = Field(..., description="Identified error type or category (e.g. KeyError, TypeError).")
    language: str = Field(..., description="Detected or confirmed programming language.")
    parsed_frames: List[StackFrame] = Field(
        default_factory=list,
        description="Extracted stack frames parsed from the trace.",
    )
    root_causes: List[RootCauseHypothesis] = Field(
        default_factory=list,
        description="Ranked plausible root cause hypotheses.",
    )
    suggested_fixes: List[SuggestedFix] = Field(
        default_factory=list,
        description="Recommended actionable fixes and verification steps.",
    )
    references: List[GroundedReference] = Field(
        default_factory=list,
        description="Grounded source references supporting the diagnosis.",
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Diagnostic, context budget, or safety notices.",
    )
    model: str = Field(..., description="AI model identifier used for analysis.")
    repository_used: Optional[str] = Field(
        default=None,
        description="Approved repository ID if repository context was used.",
    )

