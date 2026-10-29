"""
Pydantic schemas for Phase 7: AI Repository Intelligence Engine.
Defines models for repository discovery, bounded scanning, tree metadata,
grounded multi-file references, dependency inspection, and repository Q&A.
"""
from typing import List, Optional, Literal, Dict
from pydantic import BaseModel, Field, field_validator


class ApprovedRepository(BaseModel):
    """Metadata for a server-approved repository."""
    id: str = Field(..., description="Unique slug identifier of the approved repository.")
    name: str = Field(..., description="Display name of the repository.")
    description: Optional[str] = Field(default=None, description="Optional brief repository description.")


class RepositoryListResponse(BaseModel):
    """Response payload listing server-approved repositories."""
    repositories: List[ApprovedRepository] = Field(default_factory=list, description="Approved repositories list.")
    configured: bool = Field(..., description="Whether any repository roots are configured on the server.")
    message: Optional[str] = Field(default=None, description="Optional operator instruction or status message.")


class FileImport(BaseModel):
    """Metadata for an imported module or file."""
    module: str = Field(..., description="Imported module specifier or file path.")
    is_local: bool = Field(..., description="True if local project import, False if external package.")
    symbols: List[str] = Field(default_factory=list, description="Imported symbol names if identifiable.")


class FileMetadata(BaseModel):
    """Metadata for a scanned repository source file."""
    path: str = Field(..., description="Repository-relative file path.")
    name: str = Field(..., description="File basename.")
    extension: str = Field(..., description="File extension.")
    size_bytes: int = Field(..., ge=0, description="File size in bytes.")
    line_count: int = Field(..., ge=0, description="Total line count.")
    language: str = Field(..., description="Detected programming or markup language.")
    is_entry_point: bool = Field(default=False, description="True if heuristic indicates an entry point.")
    imports: List[FileImport] = Field(default_factory=list, description="Extracted import references.")
    exports: List[str] = Field(default_factory=list, description="Extracted top-level exported symbols.")


class TreeNode(BaseModel):
    """Hierarchical node for repository directory tree."""
    name: str = Field(..., description="Node name.")
    path: str = Field(..., description="Repository-relative path.")
    type: Literal["file", "directory"] = Field(..., description="Node type.")
    size_bytes: Optional[int] = Field(default=None, description="Size in bytes for files.")
    language: Optional[str] = Field(default=None, description="Language for files.")
    is_entry_point: Optional[bool] = Field(default=None, description="Entry point flag for files.")
    children: Optional[List["TreeNode"]] = Field(default=None, description="Child nodes for directories.")


class RepositorySummary(BaseModel):
    """High-level metrics and diagnostic summary of a repository scan."""
    repository_id: str = Field(..., description="Identifier of the scanned repository.")
    total_files_scanned: int = Field(..., ge=0, description="Count of scanned source files.")
    total_lines: int = Field(..., ge=0, description="Sum of lines across scanned files.")
    total_bytes: int = Field(..., ge=0, description="Sum of bytes across scanned files.")
    languages: Dict[str, int] = Field(default_factory=dict, description="File count per language.")
    entry_points: List[str] = Field(default_factory=list, description="Detected entry-point relative paths.")
    is_partial: bool = Field(default=False, description="True if scan hit safety bounds (file count/depth/bytes).")
    warnings: List[str] = Field(default_factory=list, description="Diagnostic warnings or scan truncation notices.")


class RepositoryScanResponse(BaseModel):
    """Response containing repository overview and directory tree."""
    summary: RepositorySummary = Field(..., description="Summary metrics.")
    tree: List[TreeNode] = Field(default_factory=list, description="Hierarchical file tree.")


class GroundedReference(BaseModel):
    """Verified source-code reference supporting an AI response."""
    path: str = Field(..., description="Repository-relative file path.")
    start_line: int = Field(..., ge=1, description="1-indexed starting line number.")
    end_line: int = Field(..., ge=1, description="1-indexed ending line number.")
    snippet: str = Field(..., description="Exact source-code snippet.")
    reason: str = Field(..., description="Architectural or keyword relevance justification.")


class RepositoryChatMessage(BaseModel):
    """A turn in repository Q&A dialogue."""
    role: Literal["user", "assistant"] = Field(..., description="Message author role.")
    content: str = Field(..., min_length=1, max_length=4000, description="Message text content.")

    @field_validator("content")
    @classmethod
    def validate_content_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Message content cannot be blank.")
        return v


class RepositoryAskRequest(BaseModel):
    """Request payload for repository contextual Q&A."""
    question: str = Field(..., min_length=1, max_length=2000, description="User question about the codebase.")
    conversation: List[RepositoryChatMessage] = Field(
        default_factory=list,
        description="Bounded previous conversation turns.",
    )
    selected_paths: Optional[List[str]] = Field(
        default=None,
        description="Optional list of repository-relative paths to prioritize as context.",
    )

    @field_validator("question")
    @classmethod
    def validate_question_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Question cannot be empty or only whitespace.")
        return v


class RepositoryAskResponse(BaseModel):
    """Response payload for repository contextual Q&A with grounded references."""
    answer: str = Field(..., description="AI architectural or code answer.")
    references: List[GroundedReference] = Field(
        default_factory=list,
        description="Grounded source references supporting the answer.",
    )
    warnings: List[str] = Field(default_factory=list, description="Truncation or uncertainty warnings.")
    model: str = Field(..., description="Model identifier used for inference.")
    context_used: bool = Field(..., description="Whether multi-file repository context was injected.")


class RepositoryDependenciesRequest(BaseModel):
    """Request for dependency analysis on a specific file."""
    path: str = Field(..., min_length=1, max_length=500, description="Repository-relative file path.")


class RepositoryDependenciesResponse(BaseModel):
    """Detailed dependency insights for a specific file."""
    path: str = Field(..., description="Repository-relative file path.")
    local_dependencies: List[str] = Field(default_factory=list, description="Local files/modules imported.")
    external_dependencies: List[str] = Field(default_factory=list, description="External packages/modules imported.")
    imported_by: List[str] = Field(default_factory=list, description="Other repository files that import this file.")
    confidence: Literal["high", "approximate"] = Field(..., description="Analysis confidence level.")
    limitations: List[str] = Field(default_factory=list, description="Caveats or unresolved dynamic import notes.")

