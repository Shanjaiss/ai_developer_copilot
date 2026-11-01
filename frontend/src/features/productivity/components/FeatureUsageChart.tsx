import { useMemo, type FC } from 'react';
import type { FeatureUsageMetric } from '../../../types';

export interface FeatureUsageChartProps {
  features: FeatureUsageMetric[];
  isLoading?: boolean;
}

export const FeatureUsageChart: FC<FeatureUsageChartProps> = ({
  features,
  isLoading = false,
}) => {
  const maxRequests = useMemo(() => {
    if (!features || features.length === 0) return 1;
    const maxVal = Math.max(...features.map((f) => f.request_count));
    return maxVal > 0 ? maxVal : 1;
  }, [features]);

  const activeFeatures = useMemo(() => {
    return features.filter((f) => f.request_count > 0);
  }, [features]);

  const totalRequests = useMemo(() => {
    return features.reduce((acc, f) => acc + f.request_count, 0);
  }, [features]);

  return (
    <div className="productivity-card" data-testid="feature-usage-card">
      <div className="productivity-card-header">
        <div>
          <h3 className="productivity-card-title">Feature Distribution &amp; Usage</h3>
          <p className="productivity-card-subtitle">
            Request volume, average latency, and reliability per AI assistant feature.
          </p>
        </div>
        <span className="productivity-badge">{activeFeatures.length} Active Features</span>
      </div>

      {isLoading ? (
        <div className="chart-loading-state" data-testid="feature-chart-loading">
          <div className="loading-spinner" />
          <span>Aggregating feature metrics...</span>
        </div>
      ) : totalRequests === 0 ? (
        <div className="chart-empty-state" data-testid="feature-chart-empty">
          <span className="empty-icon">📊</span>
          <p className="empty-title">No Feature Telemetry Recorded</p>
          <p className="empty-description">
            Run an AI Code Explanation, Review, Optimization, Test Generation, or Chat operation to
            populate live feature breakdown charts.
          </p>
        </div>
      ) : (
        <div className="feature-bars-container" data-testid="feature-chart-content">
          {features.map((item) => {
            const percentage = Math.round((item.request_count / maxRequests) * 100);
            const isZero = item.request_count === 0;

            return (
              <div
                key={item.feature}
                className={`feature-bar-row ${isZero ? 'feature-row-zero' : ''}`}
                data-testid={`feature-row-${item.feature}`}
              >
                <div className="feature-bar-label">
                  <span className="feature-name">{item.feature_name}</span>
                  <span className="feature-count">
                    {item.request_count} req{item.request_count === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="feature-bar-track">
                  <div
                    className="feature-bar-fill"
                    style={{ width: `${Math.max(percentage, isZero ? 0 : 3)}%` }}
                    title={`${item.feature_name}: ${item.request_count} requests (${item.avg_latency_ms}ms avg)`}
                  />
                </div>

                <div className="feature-bar-stats">
                  <span className="stat-latency">
                    {isZero ? '—' : `${Math.round(item.avg_latency_ms)}ms`}
                  </span>
                  <span
                    className={`stat-rate ${
                      isZero
                        ? 'rate-muted'
                        : item.success_rate >= 90
                          ? 'rate-good'
                          : 'rate-warn'
                    }`}
                  >
                    {isZero ? '—' : `${item.success_rate.toFixed(0)}% ok`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
