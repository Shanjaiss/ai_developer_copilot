"""
FastAPI Router for Phase 11: Developer Productivity Dashboard & Performance Optimization.
Provides endpoints for summary KPIs, feature breakdown, performance timeline trends,
recent activity telemetry, and system health status.
"""
from typing import List
from fastapi import APIRouter, Depends, Query, status

from app.schemas.productivity import (
    FeatureUsageMetric,
    PerformanceMetric,
    ProductivityHealthResponse,
    ProductivitySummaryResponse,
    RecentActivityItem,
    TimeWindow,
)
from app.services.metrics_service import MetricsService, metrics_service

router = APIRouter(
    prefix="/productivity",
    tags=["Productivity & Performance"],
)


def get_metrics_service() -> MetricsService:
    """Dependency injection provider for MetricsService."""
    return metrics_service


@router.get(
    "/summary",
    response_model=ProductivitySummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get productivity metrics summary",
    description="Returns aggregate KPI metrics including total requests, success/failure rate, and latency percentiles.",
)
def get_productivity_summary(
    time_window: TimeWindow = Query(
        default="all",
        description="Time filter window: '24h', '7d', '30d', or 'all'",
    ),
    service: MetricsService = Depends(get_metrics_service),
) -> ProductivitySummaryResponse:
    """Computes productivity KPI metrics for the selected time window."""
    return service.get_summary(time_window=time_window)


@router.get(
    "/features",
    response_model=List[FeatureUsageMetric],
    status_code=status.HTTP_200_OK,
    summary="Get per-feature usage metrics",
    description="Returns request count, average latency, and success rate broken down across all AI copilot features.",
)
def get_feature_metrics(
    time_window: TimeWindow = Query(
        default="all",
        description="Time filter window: '24h', '7d', '30d', or 'all'",
    ),
    service: MetricsService = Depends(get_metrics_service),
) -> List[FeatureUsageMetric]:
    """Returns usage breakdown by feature."""
    return service.get_feature_metrics(time_window=time_window)


@router.get(
    "/performance",
    response_model=List[PerformanceMetric],
    status_code=status.HTTP_200_OK,
    summary="Get latency and volume timeline",
    description="Returns chronological time buckets with request volume and average latency for trend charts.",
)
def get_performance_timeline(
    time_window: TimeWindow = Query(
        default="all",
        description="Time filter window: '24h', '7d', '30d', or 'all'",
    ),
    service: MetricsService = Depends(get_metrics_service),
) -> List[PerformanceMetric]:
    """Returns chronological timeline metrics."""
    return service.get_performance_timeline(time_window=time_window)


@router.get(
    "/activity",
    response_model=List[RecentActivityItem],
    status_code=status.HTTP_200_OK,
    summary="Get recent activity stream",
    description="Returns the most recent AI operation events without recording any sensitive user prompts or code.",
)
def get_recent_activity(
    limit: int = Query(default=20, ge=1, le=100, description="Maximum number of items to return"),
    service: MetricsService = Depends(get_metrics_service),
) -> List[RecentActivityItem]:
    """Returns recent activity items."""
    return service.get_recent_activity(limit=limit)


@router.get(
    "/health",
    response_model=ProductivityHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Get system health and readiness status",
    description="Returns health status for backend, Ollama inference engine, model availability, and metrics collector.",
)
async def get_system_health(
    service: MetricsService = Depends(get_metrics_service),
) -> ProductivityHealthResponse:
    """Returns system and model health status."""
    return await service.get_health_status()


@router.post(
    "/clear",
    status_code=status.HTTP_200_OK,
    summary="Clear in-memory telemetry",
    description="Clears all collected telemetry events from the in-memory buffer.",
)
def clear_productivity_metrics(
    service: MetricsService = Depends(get_metrics_service),
) -> dict:
    """Clears all telemetry in memory."""
    service.clear_metrics()
    return {"status": "cleared"}

