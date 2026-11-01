import type { FC } from 'react';
import type { ProductivitySummaryResponse } from '../../../types';

export interface ProductivityKpiCardsProps {
  summary: ProductivitySummaryResponse | null;
  isLoading?: boolean;
}

export const ProductivityKpiCards: FC<ProductivityKpiCardsProps> = ({
  summary,
  isLoading = false,
}) => {
  const total = summary?.total_requests ?? 0;
  const successCount = summary?.successful_requests ?? 0;
  const failCount = (summary?.failed_requests ?? 0) + (summary?.timed_out_requests ?? 0);
  const successRate = summary?.success_rate ?? 0.0;
  const avgLatency = summary?.avg_latency_ms ?? 0.0;
  const medianLatency = summary?.median_latency_ms ?? 0.0;
  const p95Latency = summary?.p95_latency_ms ?? 0.0;
  const retained = summary?.retained_events_count ?? 0;
  const limit = summary?.retention_limit ?? 5000;

  const formatLatency = (ms: number): string => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)}s`;
    }
    return `${Math.round(ms)}ms`;
  };

  const getSuccessRateClass = (rate: number, totalReqs: number): string => {
    if (totalReqs === 0) return 'text-muted';
    if (rate >= 95) return 'text-success';
    if (rate >= 80) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className="kpi-cards-grid" data-testid="productivity-kpi-grid">
      {/* 1. Total Requests Card */}
      <div className="kpi-card" data-testid="kpi-total-requests">
        <div className="kpi-card-header">
          <span className="kpi-card-title">Total AI Requests</span>
          <span className="kpi-card-icon">⚡</span>
        </div>
        <div className="kpi-card-value">
          {isLoading ? <span className="kpi-skeleton">...</span> : total.toLocaleString()}
        </div>
        <div className="kpi-card-footer">
          <span className="kpi-sub-metric success-label">✓ {successCount} succeeded</span>
          <span className="kpi-sub-metric error-label">✗ {failCount} failed</span>
        </div>
      </div>

      {/* 2. Success Rate Card */}
      <div className="kpi-card" data-testid="kpi-success-rate">
        <div className="kpi-card-header">
          <span className="kpi-card-title">Success Rate</span>
          <span className="kpi-card-icon">🎯</span>
        </div>
        <div className={`kpi-card-value ${getSuccessRateClass(successRate, total)}`}>
          {isLoading ? (
            <span className="kpi-skeleton">...</span>
          ) : total === 0 ? (
            'N/A'
          ) : (
            `${successRate.toFixed(1)}%`
          )}
        </div>
        <div className="kpi-card-footer">
          <span className="kpi-sub-metric">
            {total === 0
              ? 'No requests recorded'
              : `${(100 - successRate).toFixed(1)}% failure/timeout rate`}
          </span>
        </div>
      </div>

      {/* 3. Average Latency Card */}
      <div className="kpi-card" data-testid="kpi-avg-latency">
        <div className="kpi-card-header">
          <span className="kpi-card-title">Average Latency</span>
          <span className="kpi-card-icon">⏱️</span>
        </div>
        <div className="kpi-card-value">
          {isLoading ? (
            <span className="kpi-skeleton">...</span>
          ) : total === 0 ? (
            '0ms'
          ) : (
            formatLatency(avgLatency)
          )}
        </div>
        <div className="kpi-card-footer">
          <span className="kpi-sub-metric">Mean response time across local calls</span>
        </div>
      </div>

      {/* 4. Median & P95 Latency Card */}
      <div className="kpi-card" data-testid="kpi-p95-latency">
        <div className="kpi-card-header">
          <span className="kpi-card-title">P95 / Median Latency</span>
          <span className="kpi-card-icon">📊</span>
        </div>
        <div className="kpi-card-value">
          {isLoading ? (
            <span className="kpi-skeleton">...</span>
          ) : total === 0 ? (
            '0ms / 0ms'
          ) : (
            `${formatLatency(p95Latency)} / ${formatLatency(medianLatency)}`
          )}
        </div>
        <div className="kpi-card-footer">
          <span className="kpi-sub-metric">
            {total === 0 ? 'No latency data' : '95% of operations finished under P95'}
          </span>
        </div>
      </div>

      {/* 5. In-Memory Ring Buffer Capacity Card */}
      <div className="kpi-card" data-testid="kpi-memory-buffer">
        <div className="kpi-card-header">
          <span className="kpi-card-title">Retained Events</span>
          <span className="kpi-card-icon">💾</span>
        </div>
        <div className="kpi-card-value">
          {isLoading ? (
            <span className="kpi-skeleton">...</span>
          ) : (
            `${retained.toLocaleString()} / ${limit.toLocaleString()}`
          )}
        </div>
        <div className="kpi-card-footer">
          <span className="kpi-sub-metric">In-memory circular telemetry buffer</span>
        </div>
      </div>
    </div>
  );
};
