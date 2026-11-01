"""
Pydantic schemas for Phase 11: Developer Productivity Dashboard & Performance Optimization.
Defines models for metrics aggregation, performance timelines, feature breakdowns,
recent telemetry events, and system health status.
"""
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


TimeWindow = Literal["24h", "7d", "30d", "all"]
EventOutcome = Literal["success", "failure", "timeout"]


class MetricEvent(BaseModel):
    """
    Individual telemetry event recording AI request metadata.
    Strictly preserves privacy: NEVER records prompts, code, tokens, or raw traces.
    """
    event_id: str = Field(..., description="Unique event identifier")
    feature: str = Field(..., description="AI copilot feature identifier (e.g. explain, review, chat)")
    operation: str = Field(..., description="Operation or action name executed")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp of the event")
    duration_ms: float = Field(..., ge=0.0, description="Execution duration in milliseconds")
    outcome: EventOutcome = Field(..., description="Outcome of the operation")
    model: Optional[str] = Field(default=None, description="AI model name used")
    error_category: Optional[str] = Field(default=None, description="Sanitized error category if outcome failed")


class ProductivitySummaryResponse(BaseModel):
    """Aggregated productivity metrics summary across all features for a given time window."""
    total_requests: int = Field(..., ge=0, description="Total number of requests recorded")
    successful_requests: int = Field(..., ge=0, description="Number of successful requests")
    failed_requests: int = Field(..., ge=0, description="Number of failed requests")
    timed_out_requests: int = Field(..., ge=0, description="Number of timed-out requests")
    success_rate: float = Field(..., ge=0.0, le=100.0, description="Percentage of requests that succeeded")
    failure_rate: float = Field(..., ge=0.0, le=100.0, description="Percentage of requests that failed or timed out")
    avg_latency_ms: float = Field(..., ge=0.0, description="Mean latency across requests in milliseconds")
    median_latency_ms: float = Field(..., ge=0.0, description="Median latency in milliseconds")
    p95_latency_ms: float = Field(..., ge=0.0, description="95th percentile latency in milliseconds")
    retention_limit: int = Field(default=5000, description="Maximum number of in-memory events retained")
    retained_events_count: int = Field(default=0, ge=0, description="Current number of events in memory buffer")
    earliest_timestamp: Optional[str] = Field(default=None, description="Timestamp of oldest event in window")
    time_window: TimeWindow = Field(default="all", description="Selected time window filter")


class FeatureUsageMetric(BaseModel):
    """Aggregated usage and latency metrics broken down per AI feature."""
    feature: str = Field(..., description="Feature identifier code")
    feature_name: str = Field(..., description="Human-readable feature display name")
    request_count: int = Field(..., ge=0, description="Number of requests for this feature")
    avg_latency_ms: float = Field(..., ge=0.0, description="Average response latency in milliseconds")
    success_rate: float = Field(..., ge=0.0, le=100.0, description="Success rate percentage for this feature")
    failure_count: int = Field(..., ge=0, description="Number of failures and timeouts for this feature")


class PerformanceMetric(BaseModel):
    """Timeline bucket entry for latency and volume visualization."""
    timestamp_bucket: str = Field(..., description="Timestamp bucket label (e.g. hourly or daily)")
    request_count: int = Field(..., ge=0, description="Number of requests in bucket")
    avg_latency_ms: float = Field(..., ge=0.0, description="Average response time in bucket")
    error_count: int = Field(..., ge=0, description="Number of failed requests in bucket")


class RecentActivityItem(BaseModel):
    """Individual activity log item presented in the recent activity stream."""
    event_id: str = Field(..., description="Unique event identifier")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")
    feature: str = Field(..., description="Feature identifier")
    feature_name: str = Field(..., description="Human-readable feature name")
    operation: str = Field(..., description="Operation performed")
    duration_ms: float = Field(..., ge=0.0, description="Execution duration in milliseconds")
    outcome: EventOutcome = Field(..., description="Execution outcome")


class ProductivityHealthResponse(BaseModel):
    """System health check for backend, Ollama inference, model readiness, and metrics subsystem."""
    backend_healthy: bool = Field(..., description="Whether the local backend service is healthy")
    ollama_reachable: bool = Field(..., description="Whether the local Ollama instance is reachable")
    configured_model_available: bool = Field(..., description="Whether the configured LLM model is downloaded and ready")
    metrics_collector_active: bool = Field(..., description="Whether in-memory metrics collection is active")
    retained_events_count: int = Field(..., ge=0, description="Total events currently retained in the metrics ring buffer")
    model_name: str = Field(..., description="Name of the configured AI model")
    ollama_url: str = Field(..., description="Configured Ollama base URL")
    timestamp: str = Field(..., description="Current UTC timestamp of the health check")

