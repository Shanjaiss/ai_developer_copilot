from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.core.config import settings
from app.routers import ai

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for AI Developer Copilot - Developer Dashboard and Assistant",
    version=settings.VERSION,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class WelcomeResponse(BaseModel):
    message: str = Field(..., examples=["Welcome to AI Developer Copilot API"])
    service: str = Field(..., examples=["ai-developer-copilot-backend"])
    version: str = Field(..., examples=["0.1.0"])
    status: str = Field(..., examples=["online"])
    docs_url: str = Field(..., examples=["/docs"])


class HealthResponse(BaseModel):
    status: str = Field(..., examples=["healthy"])
    service: str = Field(..., examples=["ai-developer-copilot-backend"])
    environment: str = Field(..., examples=["development"])
    version: str = Field(..., examples=["0.1.0"])
    timestamp: str = Field(..., examples=["2026-10-25T14:30:00Z"])


@app.get("/", response_model=WelcomeResponse)
def get_welcome() -> WelcomeResponse:
    """Return an application welcome response."""
    return WelcomeResponse(
        message="Welcome to AI Developer Copilot API",
        service="ai-developer-copilot-backend",
        version="0.1.0",
        status="online",
        docs_url="/docs",
    )


@app.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Return the API health status and service metadata."""
    current_time = datetime.now(timezone.utc).isoformat()
    return HealthResponse(
        status="healthy",
        service="ai-developer-copilot-backend",
        environment=settings.ENVIRONMENT,
        version="0.1.0",
        timestamp=current_time,
    )


# Mount feature routers
app.include_router(ai.router, prefix="/api/v1")
