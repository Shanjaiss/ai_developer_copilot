"""
Unit and integration tests for Phase 11: Developer Productivity Dashboard & Performance Optimization.
Tests metric recording, latency math (mean, median, P95), time filtering,
ring-buffer bounds (5,000 events), privacy guarantees, system health probes, and API endpoints.
"""
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.productivity import MetricEvent
from app.services.metrics_service import MetricsService, metrics_service, track_operation


@pytest.fixture(autouse=True)
def clean_metrics():
    """Ensure in-memory metrics buffer is cleared before and after each test."""
    metrics_service.clear_metrics()
    yield
    metrics_service.clear_metrics()


def test_empty_metrics_summary():
    """Verify empty metrics buffer returns zeroed summary without division errors."""
    summary = metrics_service.get_summary(time_window="all")
    assert summary.total_requests == 0
    assert summary.successful_requests == 0
    assert summary.failed_requests == 0
    assert summary.timed_out_requests == 0
    assert summary.success_rate == 0.0
    assert summary.failure_rate == 0.0
    assert summary.avg_latency_ms == 0.0
    assert summary.median_latency_ms == 0.0
    assert summary.p95_latency_ms == 0.0
    assert summary.earliest_timestamp is None
    assert summary.retained_events_count == 0


def test_empty_feature_metrics():
    """Verify feature breakdown for empty buffer returns all features with zero counts."""
    features = metrics_service.get_feature_metrics(time_window="all")
    assert len(features) >= 9
    for f in features:
        assert f.request_count == 0
        assert f.avg_latency_ms == 0.0
        assert f.success_rate == 0.0
        assert f.failure_count == 0


def test_empty_performance_timeline():
    """Verify empty performance timeline returns an empty list."""
    timeline = metrics_service.get_performance_timeline(time_window="all")
    assert timeline == []


def test_empty_recent_activity():
    """Verify empty recent activity returns an empty list."""
    activity = metrics_service.get_recent_activity(limit=20)
    assert activity == []


def test_record_single_event():
    """Verify recording a telemetry event populates fields correctly."""
    event = metrics_service.record_event(
        feature="explain",
        operation="explain_code",
        duration_ms=142.5,
        outcome="success",
    )
    assert event.event_id.startswith("evt_")
    assert event.feature == "explain"
    assert event.operation == "explain_code"
    assert event.duration_ms == 142.5
    assert event.outcome == "success"
    assert event.model is not None

    summary = metrics_service.get_summary()
    assert summary.total_requests == 1
    assert summary.successful_requests == 1
    assert summary.failed_requests == 0
    assert summary.success_rate == 100.0
    assert summary.avg_latency_ms == 142.5
    assert summary.median_latency_ms == 142.5
    assert summary.p95_latency_ms == 142.5


def test_metrics_calculations_accuracy():
    """Verify exact mean, median, P95, and failure rates across multiple events."""
    durations = [100.0, 200.0, 300.0, 400.0, 500.0]
    outcomes = ["success", "success", "success", "failure", "timeout"]

    for d, o in zip(durations, outcomes):
        metrics_service.record_event(
            feature="review",
            operation="review_code",
            duration_ms=d,
            outcome=o,
        )

    summary = metrics_service.get_summary(time_window="all")
    assert summary.total_requests == 5
    assert summary.successful_requests == 3
    assert summary.failed_requests == 1
    assert summary.timed_out_requests == 1
    assert summary.success_rate == 60.0  # 3/5
    assert summary.failure_rate == 40.0  # 2/5
    assert summary.avg_latency_ms == 300.0  # (100+200+300+400+500)/5
    assert summary.median_latency_ms == 300.0
    # P95 of 5 items: ceil(0.95 * 5) - 1 = ceil(4.75) - 1 = 4 -> index 4 = 500.0
    assert summary.p95_latency_ms == 500.0


def test_time_window_filtering():
    """Verify filtering events across 24h, 7d, 30d, and all windows."""
    now = datetime.now(timezone.utc)
    one_hour_ago = (now - timedelta(hours=1)).isoformat()
    three_days_ago = (now - timedelta(days=3)).isoformat()
    ten_days_ago = (now - timedelta(days=10)).isoformat()
    forty_days_ago = (now - timedelta(days=40)).isoformat()

    metrics_service.record_event("chat", "chat", 100.0, "success", custom_timestamp=one_hour_ago)
    metrics_service.record_event("chat", "chat", 200.0, "success", custom_timestamp=three_days_ago)
    metrics_service.record_event("chat", "chat", 300.0, "success", custom_timestamp=ten_days_ago)
    metrics_service.record_event("chat", "chat", 400.0, "success", custom_timestamp=forty_days_ago)

    summary_24h = metrics_service.get_summary(time_window="24h")
    assert summary_24h.total_requests == 1

    summary_7d = metrics_service.get_summary(time_window="7d")
    assert summary_7d.total_requests == 2

    summary_30d = metrics_service.get_summary(time_window="30d")
    assert summary_30d.total_requests == 3

    summary_all = metrics_service.get_summary(time_window="all")
    assert summary_all.total_requests == 4


def test_buffer_retention_capacity():
    """Verify in-memory buffer enforces 5,000 maximum items ring buffer."""
    local_service = MetricsService(maxlen=50)

    for i in range(100):
        local_service.record_event("explain", "explain_code", float(i), "success")

    assert len(local_service._events) == 50
    # Oldest retained event should be 50, latest 99
    assert local_service._events[0].duration_ms == 50.0
    assert local_service._events[-1].duration_ms == 99.0


def test_privacy_preservation():
    """Verify no prompt, source code, chat text, file contents, or keys are recorded."""
    event = metrics_service.record_event(
        feature="debugging",
        operation="debug_code",
        duration_ms=250.0,
        outcome="success",
        model="qwen2.5-coder:1.5b",
    )

    event_dict = event.model_dump()
    forbidden_keys = {"prompt", "code", "source_code", "message", "file_content", "stack_trace", "secret", "api_key"}
    for key in forbidden_keys:
        assert key not in event_dict, f"Privacy violation: '{key}' found in telemetry event!"


@pytest.mark.anyio
async def test_track_operation_context_manager():
    """Verify track_operation accurately times and records successful operations."""
    async with track_operation(feature="optimize", operation="optimize_code"):
        pass

    summary = metrics_service.get_summary()
    assert summary.total_requests == 1
    assert summary.successful_requests == 1
    assert summary.avg_latency_ms >= 0.0


@pytest.mark.anyio
async def test_track_operation_catches_http_error():
    """Verify track_operation records failure when HTTPException is raised."""
    from fastapi import HTTPException

    with pytest.raises(HTTPException):
        async with track_operation(feature="review", operation="review_code"):
            raise HTTPException(status_code=504, detail="AI model timeout")

    summary = metrics_service.get_summary()
    assert summary.total_requests == 1
    assert summary.timed_out_requests == 1
    assert summary.successful_requests == 0


def test_api_productivity_endpoints():
    """Integration test for all productivity HTTP endpoints."""
    client = TestClient(app)

    # Seed 3 events
    metrics_service.record_event("explain", "explain_code", 150.0, "success")
    metrics_service.record_event("review", "review_code", 300.0, "success")
    metrics_service.record_event("chat", "chat", 450.0, "failure", error_category="http_500")

    # 1. Summary
    res_summary = client.get("/api/v1/productivity/summary?time_window=all")
    assert res_summary.status_code == 200
    data_summary = res_summary.json()
    assert data_summary["total_requests"] == 3
    assert data_summary["successful_requests"] == 2
    assert data_summary["failed_requests"] == 1
    assert data_summary["success_rate"] == 66.67

    # 2. Features breakdown
    res_features = client.get("/api/v1/productivity/features?time_window=all")
    assert res_features.status_code == 200
    features = res_features.json()
    assert isinstance(features, list)
    explain_feat = next(f for f in features if f["feature"] == "explain")
    assert explain_feat["request_count"] == 1
    assert explain_feat["avg_latency_ms"] == 150.0

    # 3. Performance timeline
    res_perf = client.get("/api/v1/productivity/performance?time_window=all")
    assert res_perf.status_code == 200
    perf = res_perf.json()
    assert isinstance(perf, list)
    assert len(perf) >= 1

    # 4. Activity
    res_act = client.get("/api/v1/productivity/activity?limit=10")
    assert res_act.status_code == 200
    acts = res_act.json()
    assert len(acts) == 3
    # Newest first
    assert acts[0]["feature"] == "chat"
    assert acts[1]["feature"] == "review"
    assert acts[2]["feature"] == "explain"

    # 5. Clear
    res_clear = client.post("/api/v1/productivity/clear")
    assert res_clear.status_code == 200
    assert res_clear.json() == {"status": "cleared"}

    # Post-clear summary
    res_summary_after = client.get("/api/v1/productivity/summary")
    assert res_summary_after.json()["total_requests"] == 0


def test_api_health_endpoint():
    """Verify /api/v1/productivity/health returns structured system and model status."""
    client = TestClient(app)

    with patch("app.services.ollama_service.OllamaService.check_health", new_callable=AsyncMock) as mock_health:
        mock_health.return_value = {
            "reachable": True,
            "model_available": True,
            "models": ["qwen2.5-coder:1.5b"],
        }

        res = client.get("/api/v1/productivity/health")
        assert res.status_code == 200
        health = res.json()
        assert health["backend_healthy"] is True
        assert health["ollama_reachable"] is True
        assert health["configured_model_available"] is True
        assert health["metrics_collector_active"] is True
        assert "qwen2.5-coder:1.5b" in health["model_name"]
