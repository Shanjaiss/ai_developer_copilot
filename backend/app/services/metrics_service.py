"""
Metrics and Telemetry Service for Phase 11: Developer Productivity Dashboard & Performance Optimization.
Provides thread-safe in-memory analytics collection, time-window aggregation, latency percentile math,
system health probes, and strict privacy isolation (zero prompt/code retention).
"""
from collections import deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
import logging
import math
import statistics
import threading
import time
from typing import AsyncGenerator, Dict, List, Optional
import uuid

from fastapi import HTTPException
from app.core.config import settings
from app.schemas.productivity import (
    EventOutcome,
    FeatureUsageMetric,
    MetricEvent,
    PerformanceMetric,
    ProductivityHealthResponse,
    ProductivitySummaryResponse,
    RecentActivityItem,
    TimeWindow,
)
from app.services.ollama_service import ollama_service

logger = logging.getLogger(__name__)

FEATURE_DISPLAY_NAMES: Dict[str, str] = {
    "explain": "Code Explanation",
    "review": "Code Review",
    "optimize": "Code Optimization",
    "test_generator": "Unit Test Generator",
    "chat": "Conversational AI",
    "repository_intelligence": "Repository Intelligence",
    "debugging": "Bug Detection & Debugging",
    "refactoring": "Code Refactoring",
    "documentation": "AI Documentation",
}


class MetricsService:
    """
    Thread-safe in-memory metrics aggregator.
    Maintains a ring buffer of up to 5,000 events with zero sensitive data retention.
    """

    def __init__(self, maxlen: int = 5000):
        self.maxlen = maxlen
        self._events: deque[MetricEvent] = deque(maxlen=maxlen)
        self._lock = threading.Lock()

    def record_event(
        self,
        feature: str,
        operation: str,
        duration_ms: float,
        outcome: EventOutcome = "success",
        model: Optional[str] = None,
        error_category: Optional[str] = None,
        custom_timestamp: Optional[str] = None,
    ) -> MetricEvent:
        """
        Record a single telemetry event.
        Strictly privacy-preserving: only records operational metadata.
        """
        timestamp = custom_timestamp or datetime.now(timezone.utc).isoformat()
        event = MetricEvent(
            event_id=f"evt_{uuid.uuid4().hex[:12]}",
            feature=feature,
            operation=operation,
            timestamp=timestamp,
            duration_ms=max(0.0, round(float(duration_ms), 2)),
            outcome=outcome,
            model=model or settings.OLLAMA_MODEL,
            error_category=error_category,
        )

        with self._lock:
            self._events.append(event)

        return event

    def clear_metrics(self) -> None:
        """Clear all metrics from memory (useful for testing or manual reset)."""
        with self._lock:
            self._events.clear()

    def _filter_events(self, time_window: TimeWindow = "all") -> List[MetricEvent]:
        """Filter in-memory events by the requested time window."""
        with self._lock:
            all_events = list(self._events)

        if time_window == "all" or not all_events:
            return all_events

        now = datetime.now(timezone.utc)
        if time_window == "24h":
            cutoff = now - timedelta(hours=24)
        elif time_window == "7d":
            cutoff = now - timedelta(days=7)
        elif time_window == "30d":
            cutoff = now - timedelta(days=30)
        else:
            cutoff = None

        if cutoff is None:
            return all_events

        filtered: List[MetricEvent] = []
        for event in all_events:
            try:
                # Handle ISO timestamps with or without timezone
                ts_str = event.timestamp
                if ts_str.endswith("Z"):
                    ts_str = ts_str[:-1] + "+00:00"
                event_dt = datetime.fromisoformat(ts_str)
                if event_dt.tzinfo is None:
                    event_dt = event_dt.replace(tzinfo=timezone.utc)
                if event_dt >= cutoff:
                    filtered.append(event)
            except Exception as exc:
                logger.warning("Could not parse event timestamp '%s': %s", event.timestamp, exc)
                # Keep event if timestamp parsing is ambiguous
                filtered.append(event)

        return filtered

    def get_summary(self, time_window: TimeWindow = "all") -> ProductivitySummaryResponse:
        """
        Compute aggregate summary metrics for the given time window:
        total requests, success/fail counts, success rate, and latency percentiles.
        """
        events = self._filter_events(time_window)
        total = len(events)

        if total == 0:
            return ProductivitySummaryResponse(
                total_requests=0,
                successful_requests=0,
                failed_requests=0,
                timed_out_requests=0,
                success_rate=0.0,
                failure_rate=0.0,
                avg_latency_ms=0.0,
                median_latency_ms=0.0,
                p95_latency_ms=0.0,
                retention_limit=self.maxlen,
                retained_events_count=len(self._events),
                earliest_timestamp=None,
                time_window=time_window,
            )

        success_count = sum(1 for e in events if e.outcome == "success")
        failure_count = sum(1 for e in events if e.outcome == "failure")
        timeout_count = sum(1 for e in events if e.outcome == "timeout")

        success_rate = round((success_count / total) * 100.0, 2)
        failure_rate = round(((failure_count + timeout_count) / total) * 100.0, 2)

        latencies = [e.duration_ms for e in events]
        avg_latency = round(sum(latencies) / total, 2)
        median_latency = round(float(statistics.median(latencies)), 2)

        sorted_latencies = sorted(latencies)
        p95_idx = int(math.ceil(0.95 * total)) - 1
        p95_idx = max(0, min(p95_idx, total - 1))
        p95_latency = round(float(sorted_latencies[p95_idx]), 2)

        earliest = events[0].timestamp if events else None

        return ProductivitySummaryResponse(
            total_requests=total,
            successful_requests=success_count,
            failed_requests=failure_count,
            timed_out_requests=timeout_count,
            success_rate=success_rate,
            failure_rate=failure_rate,
            avg_latency_ms=avg_latency,
            median_latency_ms=median_latency,
            p95_latency_ms=p95_latency,
            retention_limit=self.maxlen,
            retained_events_count=len(self._events),
            earliest_timestamp=earliest,
            time_window=time_window,
        )

    def get_feature_metrics(self, time_window: TimeWindow = "all") -> List[FeatureUsageMetric]:
        """Return usage breakdown grouped by AI feature."""
        events = self._filter_events(time_window)
        feature_map: Dict[str, List[MetricEvent]] = {}

        # Initialize all known features with empty lists for consistent order
        for f_key in FEATURE_DISPLAY_NAMES:
            feature_map[f_key] = []

        for e in events:
            if e.feature not in feature_map:
                feature_map[e.feature] = []
            feature_map[e.feature].append(e)

        results: List[FeatureUsageMetric] = []
        for feature_id, f_events in feature_map.items():
            count = len(f_events)
            name = FEATURE_DISPLAY_NAMES.get(feature_id, feature_id.replace("_", " ").title())
            if count == 0:
                results.append(
                    FeatureUsageMetric(
                        feature=feature_id,
                        feature_name=name,
                        request_count=0,
                        avg_latency_ms=0.0,
                        success_rate=0.0,
                        failure_count=0,
                    )
                )
            else:
                success_count = sum(1 for e in f_events if e.outcome == "success")
                fail_count = sum(1 for e in f_events if e.outcome in ("failure", "timeout"))
                avg_lat = round(sum(e.duration_ms for e in f_events) / count, 2)
                rate = round((success_count / count) * 100.0, 2)
                results.append(
                    FeatureUsageMetric(
                        feature=feature_id,
                        feature_name=name,
                        request_count=count,
                        avg_latency_ms=avg_lat,
                        success_rate=rate,
                        failure_count=fail_count,
                    )
                )

        # Sort features with highest request count first, then by name
        results.sort(key=lambda x: (x.request_count, x.feature_name), reverse=True)
        return results

    def get_performance_timeline(self, time_window: TimeWindow = "all") -> List[PerformanceMetric]:
        """
        Group events into chronological timeline buckets for trend analysis and chart rendering.
        For 24h: buckets by hour (e.g. '14:00').
        For 7d/30d/all: buckets by date/time.
        """
        events = self._filter_events(time_window)
        if not events:
            return []

        # Map bucket_key -> list of events
        buckets: Dict[str, List[MetricEvent]] = {}

        for event in events:
            try:
                ts_str = event.timestamp
                if ts_str.endswith("Z"):
                    ts_str = ts_str[:-1] + "+00:00"
                dt = datetime.fromisoformat(ts_str)
                if time_window == "24h":
                    bucket_key = dt.strftime("%H:00")
                elif time_window in ("7d", "30d"):
                    bucket_key = dt.strftime("%b %d")
                else:
                    bucket_key = dt.strftime("%b %d %H:00")
            except Exception:
                bucket_key = event.timestamp[:13]  # Fallback substring

            if bucket_key not in buckets:
                buckets[bucket_key] = []
            buckets[bucket_key].append(event)

        timeline: List[PerformanceMetric] = []
        for bucket_key, b_events in buckets.items():
            count = len(b_events)
            avg_lat = round(sum(e.duration_ms for e in b_events) / count, 2) if count > 0 else 0.0
            errors = sum(1 for e in b_events if e.outcome in ("failure", "timeout"))
            timeline.append(
                PerformanceMetric(
                    timestamp_bucket=bucket_key,
                    request_count=count,
                    avg_latency_ms=avg_lat,
                    error_count=errors,
                )
            )

        return timeline

    def get_recent_activity(self, limit: int = 20) -> List[RecentActivityItem]:
        """Return the most recent telemetry events (newest first)."""
        with self._lock:
            # Reversed list of events
            events = list(self._events)[-limit:][::-1]

        items: List[RecentActivityItem] = []
        for e in events:
            name = FEATURE_DISPLAY_NAMES.get(e.feature, e.feature.replace("_", " ").title())
            items.append(
                RecentActivityItem(
                    event_id=e.event_id,
                    timestamp=e.timestamp,
                    feature=e.feature,
                    feature_name=name,
                    operation=e.operation,
                    duration_ms=e.duration_ms,
                    outcome=e.outcome,
                )
            )
        return items

    async def get_health_status(self) -> ProductivityHealthResponse:
        """Check system health for local backend, Ollama server, model readiness, and metrics ring buffer."""
        ollama_health = await ollama_service.check_health()
        current_time = datetime.now(timezone.utc).isoformat()

        return ProductivityHealthResponse(
            backend_healthy=True,
            ollama_reachable=ollama_health.get("reachable", False),
            configured_model_available=ollama_health.get("model_available", False),
            metrics_collector_active=True,
            retained_events_count=len(self._events),
            model_name=settings.OLLAMA_MODEL,
            ollama_url=settings.OLLAMA_BASE_URL,
            timestamp=current_time,
        )


# Global singleton instance
metrics_service = MetricsService()


@asynccontextmanager
async def track_operation(
    feature: str,
    operation: str,
    model: Optional[str] = None,
) -> AsyncGenerator[None, None]:
    """
    Context manager to accurately measure execution latency and outcome of an AI operation.
    Records metadata automatically to the global metrics service.
    """
    start_time = time.perf_counter()
    outcome: EventOutcome = "success"
    error_cat: Optional[str] = None

    try:
        yield
    except HTTPException as http_exc:
        if http_exc.status_code == 504:
            outcome = "timeout"
            error_cat = "timeout"
        else:
            outcome = "failure"
            error_cat = f"http_{http_exc.status_code}"
        raise
    except Exception as exc:
        outcome = "failure"
        error_cat = type(exc).__name__
        raise
    finally:
        duration_ms = (time.perf_counter() - start_time) * 1000.0
        metrics_service.record_event(
            feature=feature,
            operation=operation,
            duration_ms=duration_ms,
            outcome=outcome,
            model=model or settings.OLLAMA_MODEL,
            error_category=error_cat,
        )

