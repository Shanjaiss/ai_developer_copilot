from fastapi import APIRouter, Depends, status
from app.schemas.ai import ExplainCodeRequest, ExplainCodeResponse
from app.services.ollama_service import OllamaService, ollama_service

router = APIRouter(prefix="/ai", tags=["AI Code Engine"])


def get_ollama_service() -> OllamaService:
    """Dependency injection provider for OllamaService."""
    return ollama_service


@router.post(
    "/explain",
    response_model=ExplainCodeResponse,
    status_code=status.HTTP_200_OK,
    summary="Explain code with local AI",
    description="Analyzes submitted source code and returns a structured breakdown including summary, line-by-line logic, complexity, and suggestions.",
)
async def explain_code(
    payload: ExplainCodeRequest,
    service: OllamaService = Depends(get_ollama_service),
) -> ExplainCodeResponse:
    """
    Endpoint for AI code explanation.
    Never executes the submitted code.
    """
    return await service.explain_code(code=payload.code, language=payload.language)
