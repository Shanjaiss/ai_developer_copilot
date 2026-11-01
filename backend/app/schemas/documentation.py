"""
Pydantic schemas for Phase 10: AI Documentation Generator.
Defines models for multi-mode technical documentation generation, verified facts,
assumptions, source grounding, and markdown export.
"""
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator, model_validator


DocumentationType = Literal[
    "readme",
    "api",
    "function",
    "class",
    "module",
    "architecture",
    "inline_docstring",
]

DocumentationMode = Literal[
    "pasted_code",
    "repository_readme",
    "api_documentation",
    "architecture_documentation",
    "selected_file",
]

DocumentationAudience = Literal[
    "developer",
    "architect",
    "technical_writer",
    "beginner",
]

DocumentationDetailLevel = Literal[
    "concise",
    "standard",
    "comprehensive",
]


class DocumentationSourceReference(BaseModel):
    """Grounded source reference supporting the generated documentation."""
    path: str = Field(..., description="File path or origin identifier.")
    start_line: Optional[int] = Field(default=None, ge=1, description="1-indexed starting line number.")
    end_line: Optional[int] = Field(default=None, ge=1, description="1-indexed ending line number.")
    snippet: Optional[str] = Field(default=None, description="Verbatim code snippet cited from source.")
    reason: Optional[str] = Field(default=None, description="Explanation of why this reference grounds the documentation.")


class DocumentationVerifiedFact(BaseModel):
    """Fact directly verified from code AST, manifest, or filesystem metadata."""
    category: str = Field(..., description="Category of fact (e.g. 'technology', 'endpoint', 'dependency', 'entry_point').")
    fact: str = Field(..., description="Clear statement of confirmed fact.")
    evidence: str = Field(..., description="Concrete code or file citation proving the fact.")


class DocumentationAssumption(BaseModel):
    """Interpretive inference or unverified claim that requires developer confirmation."""
    claim: str = Field(..., description="Inferred statement or convention.")
    basis: str = Field(..., description="Heuristic basis or indirect clue.")
    verification_needed: str = Field(..., description="Action required by developer to confirm this claim.")


class DocumentationRequest(BaseModel):
    """Request payload for generating AI technical documentation."""
    mode: DocumentationMode = Field(
        default="pasted_code",
        description="Documentation generation mode.",
    )
    documentation_type: DocumentationType = Field(
        default="function",
        description="Target documentation type.",
    )
    language: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Programming language identifier (e.g. 'python', 'typescript').",
    )
    code: Optional[str] = Field(
        default=None,
        max_length=10000,
        description="Source code snippet for pasted code or pasted API mode.",
    )
    repository_id: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Approved repository ID for repository-aware modes.",
    )
    file_path: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Relative file path within approved repository.",
    )
    audience: DocumentationAudience = Field(
        default="developer",
        description="Target reader audience.",
    )
    detail_level: DocumentationDetailLevel = Field(
        default="standard",
        description="Documentation depth and verbosity level.",
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
    def validate_mode_requirements(self) -> "DocumentationRequest":
        # Mode A: Pasted code mode
        if self.mode == "pasted_code":
            if not self.code or not self.code.strip():
                raise ValueError("Mode 'pasted_code' requires non-empty 'code'.")
            return self

        # Mode B: Repository README mode
        if self.mode == "repository_readme":
            if not self.repository_id or not self.repository_id.strip():
                raise ValueError("Mode 'repository_readme' requires 'repository_id'.")
            return self

        # Mode C: API documentation mode
        if self.mode == "api_documentation":
            has_code = bool(self.code and self.code.strip())
            has_repo = bool(self.repository_id and self.repository_id.strip())
            if not has_code and not has_repo:
                raise ValueError(
                    "Mode 'api_documentation' requires either 'code' (pasted API code) "
                    "or 'repository_id' (scanned repository API routes)."
                )
            return self

        # Mode D: Architecture documentation mode
        if self.mode == "architecture_documentation":
            if not self.repository_id or not self.repository_id.strip():
                raise ValueError("Mode 'architecture_documentation' requires 'repository_id'.")
            return self

        # Mode E: Selected file mode
        if self.mode == "selected_file":
            if not self.repository_id or not self.repository_id.strip():
                raise ValueError("Mode 'selected_file' requires 'repository_id'.")
            if not self.file_path or not self.file_path.strip():
                raise ValueError("Mode 'selected_file' requires 'file_path'.")
            return self

        return self


class DocumentationResponse(BaseModel):
    """Response payload containing generated technical documentation."""
    title: str = Field(..., description="Document title.")
    documentation_type: DocumentationType = Field(..., description="Documentation type generated.")
    mode: DocumentationMode = Field(..., description="Execution mode utilized.")
    language: Optional[str] = Field(default=None, description="Programming language analyzed.")
    markdown: str = Field(..., description="Formatted markdown documentation.")
    sources: List[DocumentationSourceReference] = Field(
        default_factory=list,
        description="Verified source references grounding the documentation.",
    )
    verified_facts: List[DocumentationVerifiedFact] = Field(
        default_factory=list,
        description="Factual observations directly proven by code or manifests.",
    )
    assumptions: List[DocumentationAssumption] = Field(
        default_factory=list,
        description="Inferences and items needing verification.",
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Advisory notes, limits, or missing evidence warnings.",
    )
    model: str = Field(default="qwen2.5-coder:1.5b", description="Model utilized for generation.")
    repository_used: Optional[str] = Field(default=None, description="Approved repository ID if applicable.")
    file_path_used: Optional[str] = Field(default=None, description="Relative file path if applicable.")

