import { useState, useCallback } from 'react';
import { useFetchQuery } from '../../hooks/api/useFetchQuery';
import { useCreateQuery } from '../../hooks/api/useCreateQuery';
import { API_ENDPOINTS } from '../../services/apiEndpoints';
import { ProductivityKpiCards } from './components/ProductivityKpiCards';
import { FeatureUsageChart } from './components/FeatureUsageChart';
import { LatencyTrendChart } from './components/LatencyTrendChart';
import { RecentActivityTable } from './components/RecentActivityTable';
import { SystemHealthCards } from './components/SystemHealthCards';
import type {
  FeatureUsageMetric,
  PerformanceMetric,
  ProductivityHealthResponse,
  ProductivitySummaryResponse,
  RecentActivityItem,
  TimeWindow,
} from '../../types';

export function ProductivityView() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('all');
  const [clearSuccessMsg, setClearSuccessMsg] = useState<string | null>(null);

  // 1. Productivity Summary Query
  const {
    data: summaryData,
    isPending: isSummaryPending,
    isFetching: isSummaryFetching,
    error: summaryError,
    refetch: refetchSummary,
  } = useFetchQuery<ProductivitySummaryResponse>({
    queryKey: ['productivity-summary', timeWindow],
    url: `${API_ENDPOINTS.PRODUCTIVITY_SUMMARY}?time_window=${timeWindow}`,
    staleTime: 1000 * 5,
  });

  // 2. Feature Metrics Query
  const {
    data: featureData,
    isPending: isFeaturesPending,
    isFetching: isFeaturesFetching,
    refetch: refetchFeatures,
  } = useFetchQuery<FeatureUsageMetric[]>({
    queryKey: ['productivity-features', timeWindow],
    url: `${API_ENDPOINTS.PRODUCTIVITY_FEATURES}?time_window=${timeWindow}`,
    staleTime: 1000 * 5,
  });

  // 3. Performance Timeline Query
  const {
    data: performanceData,
    isPending: isPerfPending,
    isFetching: isPerfFetching,
    refetch: refetchPerformance,
  } = useFetchQuery<PerformanceMetric[]>({
    queryKey: ['productivity-performance', timeWindow],
    url: `${API_ENDPOINTS.PRODUCTIVITY_PERFORMANCE}?time_window=${timeWindow}`,
    staleTime: 1000 * 5,
  });

  // 4. Recent Activity Stream Query
  const {
    data: activityData,
    isPending: isActivityPending,
    isFetching: isActivityFetching,
    refetch: refetchActivity,
  } = useFetchQuery<RecentActivityItem[]>({
    queryKey: ['productivity-activity'],
    url: `${API_ENDPOINTS.PRODUCTIVITY_ACTIVITY}?limit=20`,
    staleTime: 1000 * 5,
  });

  // 5. System & Model Health Query
  const {
    data: healthData,
    isPending: isHealthPending,
    isFetching: isHealthFetching,
    refetch: refetchHealth,
  } = useFetchQuery<ProductivityHealthResponse>({
    queryKey: ['productivity-health'],
    url: API_ENDPOINTS.PRODUCTIVITY_HEALTH,
    staleTime: 1000 * 10,
  });

  // 6. Clear Telemetry Mutation
  const { mutate: executeClear, isPending: isClearing } = useCreateQuery<
    { status: string },
    Record<string, never>
  >({
    url: API_ENDPOINTS.PRODUCTIVITY_CLEAR,
  });

  const isRefreshing =
    isSummaryFetching ||
    isFeaturesFetching ||
    isPerfFetching ||
    isActivityFetching ||
    isHealthFetching;

  const handleRefreshAll = useCallback(async () => {
    await Promise.all([
      refetchSummary(),
      refetchFeatures(),
      refetchPerformance(),
      refetchActivity(),
      refetchHealth(),
    ]);
  }, [refetchSummary, refetchFeatures, refetchPerformance, refetchActivity, refetchHealth]);

  const handleManualRefresh = useCallback(async () => {
    setClearSuccessMsg(null);
    await handleRefreshAll();
  }, [handleRefreshAll]);

  const handleClearMetrics = useCallback(() => {
    executeClear(
      {},
      {
        onSuccess: () => {
          setClearSuccessMsg('Telemetry buffer cleared successfully.');
          handleRefreshAll();
          setTimeout(() => setClearSuccessMsg(null), 3000);
        },
      }
    );
  }, [executeClear, handleRefreshAll]);

  const timeFilterOptions: { label: string; value: TimeWindow }[] = [
    { label: 'Last 24 Hours', value: '24h' },
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'All Retained Data', value: 'all' },
  ];

  return (
    <div className="productivity-view-container" data-testid="productivity-view">
      {/* View Header with Filters and Actions */}
      <div className="productivity-header">
        <div className="productivity-header-title">
          <h2>Productivity Dashboard &amp; Performance Telemetry</h2>
          <p>
            Real-time analytics across all 10 Copilot AI features with latency percentiles and strict privacy guarantees.
          </p>
        </div>

        <div className="productivity-controls">
          {/* Time Window Filter Selector */}
          <div className="time-filter-group" role="group" aria-label="Time window filter">
            {timeFilterOptions.map((opt) => (
              <button
                key={opt.value}
                id={`filter-${opt.value}`}
                className={`time-filter-btn ${timeWindow === opt.value ? 'active' : ''}`}
                onClick={() => setTimeWindow(opt.value)}
                data-testid={`time-filter-${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="productivity-action-buttons">
            <button
              id="refresh-metrics-btn"
              className="btn-productivity btn-refresh"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              data-testid="refresh-metrics-btn"
            >
              <span>{isRefreshing ? '⟳ Refreshing...' : '⟳ Refresh'}</span>
            </button>

            <button
              id="clear-metrics-btn"
              className="btn-productivity btn-clear"
              onClick={handleClearMetrics}
              disabled={isClearing}
              title="Reset in-memory circular telemetry buffer"
              data-testid="clear-metrics-btn"
            >
              <span>{isClearing ? 'Clearing...' : 'Clear Metrics'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clear notification toast */}
      {clearSuccessMsg && (
        <div className="clear-success-toast" data-testid="clear-toast">
          ✓ {clearSuccessMsg}
        </div>
      )}

      {/* Error state if summary fails */}
      {summaryError && (
        <div className="productivity-error-banner" data-testid="productivity-error-banner">
          ⚠️ Failed to load productivity metrics: {summaryError.message}
        </div>
      )}

      {/* Section 1: System Health Probes */}
      <section className="productivity-section" aria-label="System Health">
        <h3 className="section-label">System &amp; LLM Health</h3>
        <SystemHealthCards health={healthData || null} isLoading={isHealthPending} />
      </section>

      {/* Section 2: Core KPI Metrics */}
      <section className="productivity-section" aria-label="Productivity KPIs">
        <h3 className="section-label">Aggregated Request &amp; Latency KPIs</h3>
        <ProductivityKpiCards summary={summaryData || null} isLoading={isSummaryPending} />
      </section>

      {/* Section 3: Visual Analytics (Features & Timeline) */}
      <section className="productivity-charts-grid" aria-label="Visual Analytics">
        <FeatureUsageChart features={featureData || []} isLoading={isFeaturesPending} />
        <LatencyTrendChart timeline={performanceData || []} isLoading={isPerfPending} />
      </section>

      {/* Section 4: Privacy-Preserving Activity Stream */}
      <section className="productivity-section" aria-label="Recent Activity Stream">
        <RecentActivityTable
          activities={activityData || []}
          isLoading={isActivityPending}
        />
      </section>
    </div>
  );
}

export default ProductivityView;
