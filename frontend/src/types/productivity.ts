/**
 * Phase 11: Developer Productivity Dashboard & Performance Optimization Types.
 */

export type TimeWindow = '24h' | '7d' | '30d' | 'all';
export type EventOutcome = 'success' | 'failure' | 'timeout';

export interface MetricEvent {
  event_id: string;
  feature: string;
  operation: string;
  timestamp: string;
  duration_ms: number;
  outcome: EventOutcome;
  model?: string | null;
  error_category?: string | null;
}

export interface ProductivitySummaryResponse {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  timed_out_requests: number;
  success_rate: number;
  failure_rate: number;
  avg_latency_ms: number;
  median_latency_ms: number;
  p95_latency_ms: number;
  retention_limit: number;
  retained_events_count: number;
  earliest_timestamp: string | null;
  time_window: TimeWindow;
}

export interface FeatureUsageMetric {
  feature: string;
  feature_name: string;
  request_count: number;
  avg_latency_ms: number;
  success_rate: number;
  failure_count: number;
}

export interface PerformanceMetric {
  timestamp_bucket: string;
  request_count: number;
  avg_latency_ms: number;
  error_count: number;
}

export interface RecentActivityItem {
  event_id: string;
  timestamp: string;
  feature: string;
  feature_name: string;
  operation: string;
  duration_ms: number;
  outcome: EventOutcome;
}

export interface ProductivityHealthResponse {
  backend_healthy: boolean;
  ollama_reachable: boolean;
  configured_model_available: boolean;
  metrics_collector_active: boolean;
  retained_events_count: number;
  model_name: string;
  ollama_url: string;
  timestamp: string;
}

