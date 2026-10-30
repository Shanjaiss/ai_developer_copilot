from fastapi import APIRouter, Depends, status
from app.schemas.ai import (
    ExplainCodeRequest,
    ExplainCodeResponse,
    GenerateTestsRequest,
    GenerateTestsResponse,
    OptimizeCodeRequest,
    OptimizeCodeResponse,
    ReviewCodeRequest,
    ReviewCodeResponse,
    ChatRequest,
    ChatResponse,
)
from app.schemas.debugging import (
    DebugRequest,
    DebugResponse,
)
from app.services.ollama_service import OllamaService, ollama_service
from app.services.debugging_service import DebuggingService, debugging_service

router = APIRouter(prefix="/ai", tags=["AI Code Engine"])


def get_ollama_service() -> OllamaService:
    """Dependency injection provider for OllamaService."""
    return ollama_service


def get_debugging_service() -> DebuggingService:
    """Dependency injection provider for DebuggingService."""
    return debugging_service


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


@router.post(
    "/review",
    response_model=ReviewCodeResponse,
    status_code=status.HTTP_200_OK,
    summary="Review code and detect bugs with local AI",
    description="Analyzes submitted source code for correctness, security, performance, and maintainability concerns.",
)
async def review_code(
    payload: ReviewCodeRequest,
    service: OllamaService = Depends(get_ollama_service),
) -> ReviewCodeResponse:
    """
    Endpoint for AI code review and bug detection.
    Never executes the submitted code.
    """
    return await service.review_code(code=payload.code, language=payload.language)


@router.post(
    "/optimize",
    response_model=OptimizeCodeResponse,
    status_code=status.HTTP_200_OK,
    summary="Optimize code with local AI",
    description="Analyzes submitted source code and optimizes it according to the requested objective (performance, readability, memory, maintainability).",
)
async def optimize_code(
    payload: OptimizeCodeRequest,
    service: OllamaService = Depends(get_ollama_service),
) -> OptimizeCodeResponse:
    """
    Endpoint for AI code optimization.
    Never executes the submitted code.
    """
    return await service.optimize_code(
        code=payload.code,
        language=payload.language,
        optimization_goal=payload.optimization_goal,
    )


@router.post(
    "/generate-tests",
    response_model=GenerateTestsResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate unit tests with local AI",
    description="Analyzes submitted source code and generates framework-compatible unit tests (pytest for Python, vitest for JS/TS) with structured test cases.",
)
async def generate_tests(
    payload: GenerateTestsRequest,
    service: OllamaService = Depends(get_ollama_service),
) -> GenerateTestsResponse:
    """
    Endpoint for AI unit test generation.
    Never executes user-submitted or model-generated code.
    """
    return await service.generate_tests(
        code=payload.code,
        language=payload.language,
        framework=payload.framework,
        test_focus=payload.test_focus,
    )


@router.post(
    "/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Conversational AI coding assistant",
    description="Multi-turn conversational coding assistance with optional code context and bounded history.",
)
async def chat(
    payload: ChatRequest,
    service: OllamaService = Depends(get_ollama_service),
) -> ChatResponse:
    """
    Endpoint for conversational AI coding assistant.
    Provides multi-turn dialogue with bounded context. Never executes code.
    """
    return await service.chat(
        message=payload.message,
        language=payload.language,
        code_context=payload.code_context,
        conversation=payload.conversation,
    )


@router.post(
    "/debug",
    response_model=DebugResponse,
    status_code=status.HTTP_200_OK,
    summary="AI Bug Detection and Debugging Assistant",
    description="Analyzes error messages and stack traces, retrieves contextual evidence, identifies root causes, and suggests actionable fixes.",
)
async def debug_code(
    payload: DebugRequest,
    service: DebuggingService = Depends(get_debugging_service),
) -> DebugResponse:
    """
    Endpoint for AI bug detection and debugging assistant.
    Analyzes error messages and stack traces. Never executes code.
    """
    return await service.debug_error(payload=payload)





