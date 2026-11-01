import { useMemo, type FC } from 'react';
import type { PerformanceMetric } from '../../../types';

export interface LatencyTrendChartProps {
  timeline: PerformanceMetric[];
  isLoading?: boolean;
}

export const LatencyTrendChart: FC<LatencyTrendChartProps> = ({
  timeline,
  isLoading = false,
}) => {
  const chartHeight = 160;
  const chartWidth = 540;
  const paddingX = 40;
  const paddingY = 24;

  const maxLatency = useMemo(() => {
    if (!timeline || timeline.length === 0) return 500;
    const maxVal = Math.max(...timeline.map((t) => t.avg_latency_ms));
    return maxVal > 0 ? Math.ceil(maxVal * 1.2) : 500;
  }, [timeline]);

  const maxRequests = useMemo(() => {
    if (!timeline || timeline.length === 0) return 10;
    const maxVal = Math.max(...timeline.map((t) => t.request_count));
    return maxVal > 0 ? maxVal : 10;
  }, [timeline]);

  const points = useMemo(() => {
    if (!timeline || timeline.length === 0) return [];
    const step =
      timeline.length > 1
        ? (chartWidth - paddingX * 2) / (timeline.length - 1)
        : chartWidth / 2 - paddingX;

    return timeline.map((item, idx) => {
      const x = paddingX + idx * step;
      // Latency scale (top = maxLatency, bottom = 0)
      const y =
        chartHeight -
        paddingY -
        (item.avg_latency_ms / maxLatency) * (chartHeight - paddingY * 2);
      // Volume bar height
      const barHeight =
        (item.request_count / maxRequests) * (chartHeight - paddingY * 2) * 0.7;

      return {
        x,
        y: Math.max(paddingY, Math.min(y, chartHeight - paddingY)),
        barY: chartHeight - paddingY - barHeight,
        barHeight,
        item,
      };
    });
  }, [timeline, maxLatency, maxRequests]);

  const polylinePoints = useMemo(() => {
    return points.map((p) => `${p.x},${p.y}`).join(' ');
  }, [points]);

  return (
    <div className="productivity-card" data-testid="latency-trend-card">
      <div className="productivity-card-header">
        <div>
          <h3 className="productivity-card-title">Performance &amp; Latency Timeline</h3>
          <p className="productivity-card-subtitle">
            Response duration trendline (cyan) and request volume distribution (indigo).
          </p>
        </div>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-indicator legend-line" /> Avg Latency (ms)
          </span>
          <span className="legend-item">
            <span className="legend-indicator legend-bar" /> Request Volume
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="chart-loading-state" data-testid="latency-chart-loading">
          <div className="loading-spinner" />
          <span>Loading performance trends...</span>
        </div>
      ) : timeline.length === 0 ? (
        <div className="chart-empty-state" data-testid="latency-chart-empty">
          <span className="empty-icon">📈</span>
          <p className="empty-title">No Timeline Data in Selected Window</p>
          <p className="empty-description">
            Telemetry points will graph here automatically as operations execute across time buckets.
          </p>
        </div>
      ) : (
        <div className="svg-chart-container" data-testid="latency-chart-content">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="latency-svg"
            role="img"
            aria-label="Performance Latency Timeline Graph"
          >
            {/* Horizontal Grid lines */}
            <line
              x1={paddingX}
              y1={paddingY}
              x2={chartWidth - paddingX}
              y2={paddingY}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="3 3"
            />
            <line
              x1={paddingX}
              y1={chartHeight / 2}
              x2={chartWidth - paddingX}
              y2={chartHeight / 2}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="3 3"
            />
            <line
              x1={paddingX}
              y1={chartHeight - paddingY}
              x2={chartWidth - paddingX}
              y2={chartHeight - paddingY}
              stroke="rgba(255,255,255,0.12)"
            />

            {/* Y-axis Labels */}
            <text
              x={paddingX - 6}
              y={paddingY + 4}
              textAnchor="end"
              fill="rgba(255,255,255,0.4)"
              fontSize="10"
            >
              {Math.round(maxLatency)}ms
            </text>
            <text
              x={paddingX - 6}
              y={chartHeight - paddingY + 4}
              textAnchor="end"
              fill="rgba(255,255,255,0.4)"
              fontSize="10"
            >
              0ms
            </text>

            {/* Volume Bars */}
            {points.map((p, idx) => (
              <rect
                key={`bar-${idx}`}
                x={p.x - 6}
                y={p.barY}
                width={12}
                height={p.barHeight}
                fill="rgba(99, 102, 241, 0.4)"
                rx={2}
              >
                <title>{`${p.item.timestamp_bucket}: ${p.item.request_count} reqs, ${p.item.avg_latency_ms}ms avg`}</title>
              </rect>
            ))}

            {/* Latency Trend Polyline */}
            {points.length > 1 && (
              <polyline
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />
            )}

            {/* Latency Data Point Circles */}
            {points.map((p, idx) => (
              <g key={`pt-${idx}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill="#080c14"
                  stroke="#06b6d4"
                  strokeWidth="2"
                >
                  <title>{`${p.item.timestamp_bucket}: ${p.item.avg_latency_ms}ms (${p.item.request_count} reqs)`}</title>
                </circle>
                {/* X-axis bucket label */}
                <text
                  x={p.x}
                  y={chartHeight - 6}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.5)"
                  fontSize="9"
                >
                  {p.item.timestamp_bucket}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
};
