"""
FastAPI Router for Phase 7: AI Repository Intelligence Engine.
Provides endpoints for repository discovery, bounded scanning, tree navigation,
dependency inspection, and multi-file contextual Q&A.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.schemas.repository import (
    RepositoryAskRequest,
    RepositoryAskResponse,
    RepositoryDependenciesRequest,
    RepositoryDependenciesResponse,
    RepositoryListResponse,
    RepositoryScanResponse,
)
from app.services.repository_intelligence import (
    RepositoryIntelligenceService,
    repository_intelligence_service,
)

router = APIRouter(
    prefix="/repositories",
    tags=["Repository Intelligence"],
)


def get_repo_service() -> RepositoryIntelligenceService:
    """Dependency provider for RepositoryIntelligenceService."""
    return repository_intelligence_service


@router.get(
    "",
    response_model=RepositoryListResponse,
    status_code=status.HTTP_200_OK,
    summary="List approved repositories",
    description="Returns the server-allowlisted repositories available for analysis or configuration instructions.",
)
def list_repositories(
    service: RepositoryIntelligenceService = Depends(get_repo_service),
) -> RepositoryListResponse:
    """Returns approved repository list."""
    return service.get_approved_repositories()


@router.post(
    "/{repository_id}/scan",
    response_model=RepositoryScanResponse,
    status_code=status.HTTP_200_OK,
    summary="Scan repository",
    description="Performs a bounded, read-only scan of the approved repository and updates metadata cache.",
)
def scan_repository(
    repository_id: str,
    force_refresh: bool = Query(default=True, description="Force re-scan bypassing cache"),
    service: RepositoryIntelligenceService = Depends(get_repo_service),
) -> RepositoryScanResponse:
    """Performs bounded scan on an approved repository."""
    return service.scan_repository(repository_id=repository_id, force_refresh=force_refresh)


@router.get(
    "/{repository_id}/tree",
    response_model=RepositoryScanResponse,
    status_code=status.HTTP_200_OK,
    summary="Get repository directory tree",
    description="Returns the bounded hierarchical file tree and summary metrics for an approved repository.",
)
def get_repository_tree(
    repository_id: str,
    service: RepositoryIntelligenceService = Depends(get_repo_service),
) -> RepositoryScanResponse:
    """Retrieves directory tree for an approved repository."""
    return service.get_tree(repository_id=repository_id)


@router.post(
    "/{repository_id}/dependencies",
    response_model=RepositoryDependenciesResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze file dependencies",
    description="Returns local and external imports and reverse dependency references for a repository file.",
)
def get_file_dependencies(
    repository_id: str,
    payload: RepositoryDependenciesRequest,
    service: RepositoryIntelligenceService = Depends(get_repo_service),
) -> RepositoryDependenciesResponse:
    """Returns dependency analysis for a repository file."""
    return service.get_file_dependencies(repository_id=repository_id, relative_path=payload.path)


@router.post(
    "/{repository_id}/ask",
    response_model=RepositoryAskResponse,
    status_code=status.HTTP_200_OK,
    summary="Ask repository question",
    description="Answers contextual questions about the repository using bounded multi-file retrieval and Ollama.",
)
async def ask_repository_question(
    repository_id: str,
    payload: RepositoryAskRequest,
    service: RepositoryIntelligenceService = Depends(get_repo_service),
) -> RepositoryAskResponse:
    """Answers a question about the repository with grounded references."""
    return await service.ask_repository_question(
        repository_id=repository_id,
        question=payload.question,
        conversation=payload.conversation,
        selected_paths=payload.selected_paths,
    )

