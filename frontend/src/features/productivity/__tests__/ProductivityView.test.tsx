import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { ProductivityView } from '../ProductivityView';
import { renderWithClient } from '../../../test/testUtils';
import apiClient from '../../../services/apiClient';
import type {
  ProductivitySummaryResponse,
  FeatureUsageMetric,
  PerformanceMetric,
  RecentActivityItem,
  ProductivityHealthResponse,
} from '../../../types';

describe('ProductivityView (Phase 11)', () => {
  const mockSummary: ProductivitySummaryResponse = {
    total_requests: 42,
    successful_requests: 40,
    failed_requests: 1,
    timed_out_requests: 1,
    success_rate: 95.24,
    failure_rate: 4.76,
    avg_latency_ms: 215.4,
    median_latency_ms: 180.0,
    p95_latency_ms: 450.0,
    retention_limit: 5000,
    retained_events_count: 42,
    earliest_timestamp: '2026-11-01T08:00:00Z',
    time_window: 'all',
  };

  const mockFeatures: FeatureUsageMetric[] = [
    {
      feature: 'explain',
      feature_name: 'Code Explanation',
      request_count: 15,
      avg_latency_ms: 140.2,
      success_rate: 100.0,
      failure_count: 0,
    },
    {
      feature: 'review',
      feature_name: 'Code Review',
      request_count: 12,
      avg_latency_ms: 220.5,
      success_rate: 91.67,
      failure_count: 1,
    },
    {
      feature: 'chat',
      feature_name: 'Conversational AI',
      request_count: 10,
      avg_latency_ms: 195.0,
      success_rate: 100.0,
      failure_count: 0,
    },
  ];

  const mockTimeline: PerformanceMetric[] = [
    {
      timestamp_bucket: 'Nov 01 10:00',
      request_count: 12,
      avg_latency_ms: 180.0,
      error_count: 0,
    },
    {
      timestamp_bucket: 'Nov 01 11:00',
      request_count: 20,
      avg_latency_ms: 240.0,
      error_count: 1,
    },
    {
      timestamp_bucket: 'Nov 01 12:00',
      request_count: 10,
      avg_latency_ms: 190.0,
      error_count: 1,
    },
  ];

  const mockActivity: RecentActivityItem[] = [
    {
      event_id: 'evt_1',
      timestamp: '2026-11-01T12:05:00Z',
      feature: 'explain',
      feature_name: 'Code Explanation',
      operation: 'explain_code',
      duration_ms: 145.2,
      outcome: 'success',
    },
    {
      event_id: 'evt_2',
      timestamp: '2026-11-01T12:08:00Z',
      feature: 'review',
      feature_name: 'Code Review',
      operation: 'review_code',
      duration_ms: 320.0,
      outcome: 'failure',
    },
    {
      event_id: 'evt_3',
      timestamp: '2026-11-01T12:12:00Z',
      feature: 'chat',
      feature_name: 'Conversational AI',
      operation: 'chat',
      duration_ms: 5000.0,
      outcome: 'timeout',
    },
  ];

  const mockHealth: ProductivityHealthResponse = {
    backend_healthy: true,
    ollama_reachable: true,
    configured_model_available: true,
    metrics_collector_active: true,
    retained_events_count: 42,
    model_name: 'qwen2.5-coder:1.5b',
    ollama_url: 'http://127.0.0.1:11434',
    timestamp: '2026-11-01T12:15:00Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const setupDefaultMocks = () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/productivity/summary')) {
        return { data: mockSummary, status: 200, statusText: 'OK', headers: {}, config: {} as any };
      }
      if (urlStr.includes('/api/v1/productivity/features')) {
        return { data: mockFeatures, status: 200, statusText: 'OK', headers: {}, config: {} as any };
      }
      if (urlStr.includes('/api/v1/productivity/performance')) {
        return { data: mockTimeline, status: 200, statusText: 'OK', headers: {}, config: {} as any };
      }
      if (urlStr.includes('/api/v1/productivity/activity')) {
        return { data: mockActivity, status: 200, statusText: 'OK', headers: {}, config: {} as any };
      }
      if (urlStr.includes('/api/v1/productivity/health')) {
        return { data: mockHealth, status: 200, statusText: 'OK', headers: {}, config: {} as any };
      }
      throw new Error(`Unhandled URL in test mock: ${urlStr}`);
    });
  };

  it('renders productivity header, system health cards, and KPI metrics', async () => {
    setupDefaultMocks();
    renderWithClient(<ProductivityView />);

    expect(
      screen.getByRole('heading', { level: 2, name: /Productivity Dashboard & Performance Telemetry/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('health-backend')).toBeInTheDocument();
      expect(screen.getByTestId('health-ollama')).toBeInTheDocument();
      expect(screen.getByTestId('health-model')).toBeInTheDocument();
      expect(screen.getByTestId('health-collector')).toBeInTheDocument();
    });

    // Check KPI values
    await waitFor(() => {
      expect(screen.getByTestId('kpi-total-requests')).toHaveTextContent('42');
      expect(screen.getByTestId('kpi-success-rate')).toHaveTextContent('95.2%');
      expect(screen.getByTestId('kpi-avg-latency')).toHaveTextContent('215ms');
      expect(screen.getByTestId('kpi-p95-latency')).toHaveTextContent('450ms / 180ms');
    });
  });

  it('renders feature usage breakdown and percentage bars', async () => {
    setupDefaultMocks();
    renderWithClient(<ProductivityView />);

    await waitFor(() => {
      const featureCard = screen.getByTestId('feature-usage-card');
      expect(featureCard).toBeInTheDocument();
      expect(within(featureCard).getByText('Code Explanation')).toBeInTheDocument();
      expect(within(featureCard).getByText('15 reqs')).toBeInTheDocument();
      expect(within(featureCard).getByText('Code Review')).toBeInTheDocument();
      expect(within(featureCard).getByText('12 reqs')).toBeInTheDocument();
    });
  });

  it('renders latency timeline graph with SVG elements', async () => {
    setupDefaultMocks();
    renderWithClient(<ProductivityView />);

    await waitFor(() => {
      expect(screen.getByTestId('latency-trend-card')).toBeInTheDocument();
      expect(screen.getByTestId('latency-chart-content')).toBeInTheDocument();
      expect(screen.getByText('Nov 01 10:00')).toBeInTheDocument();
      expect(screen.getByText('Nov 01 11:00')).toBeInTheDocument();
    });
  });

  it('renders recent activity table with outcome badges and privacy banner', async () => {
    setupDefaultMocks();
    renderWithClient(<ProductivityView />);

    await waitFor(() => {
      expect(screen.getByTestId('recent-activity-card')).toBeInTheDocument();
      expect(screen.getByText(/Zero Prompt\/Code Logging/i)).toBeInTheDocument();
      expect(screen.getByText(/Privacy Guarantee:/i)).toBeInTheDocument();
      expect(screen.getByTestId('activity-row-evt_1')).toBeInTheDocument();
      expect(screen.getByTestId('activity-row-evt_2')).toBeInTheDocument();
      expect(screen.getByTestId('activity-row-evt_3')).toBeInTheDocument();
      expect(screen.getByText('✓ Success')).toBeInTheDocument();
      expect(screen.getByText('✗ Failed')).toBeInTheDocument();
      expect(screen.getByText('⏱ Timeout')).toBeInTheDocument();
    });
  });

  it('switches time filter window when clicked', async () => {
    setupDefaultMocks();
    renderWithClient(<ProductivityView />);

    const filter24hBtn = screen.getByTestId('time-filter-24h');
    fireEvent.click(filter24hBtn);

    expect(filter24hBtn).toHaveClass('active');
  });

  it('renders clean empty states when zero telemetry exists', async () => {
    const emptySummary: ProductivitySummaryResponse = {
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      timed_out_requests: 0,
      success_rate: 0.0,
      failure_rate: 0.0,
      avg_latency_ms: 0.0,
      median_latency_ms: 0.0,
      p95_latency_ms: 0.0,
      retention_limit: 5000,
      retained_events_count: 0,
      earliest_timestamp: null,
      time_window: 'all',
    };

    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/productivity/summary')) {
        return { data: emptySummary, status: 200, statusText: 'OK', headers: {}, config: {} as any };
      }
      if (urlStr.includes('/api/v1/productivity/features')) {
        return { data: [], status: 200, statusText: 'OK', headers: {}, config: {} as any };
      }
      if (urlStr.includes('/api/v1/productivity/performance')) {
        return { data: [], status: 200, statusText: 'OK', headers: {}, config: {} as any };
      }
      if (urlStr.includes('/api/v1/productivity/activity')) {
        return { data: [], status: 200, statusText: 'OK', headers: {}, config: {} as any };
      }
      if (urlStr.includes('/api/v1/productivity/health')) {
        return { data: mockHealth, status: 200, statusText: 'OK', headers: {}, config: {} as any };
      }
      throw new Error(`Unhandled URL: ${urlStr}`);
    });

    renderWithClient(<ProductivityView />);

    await waitFor(() => {
      expect(screen.getByTestId('kpi-total-requests')).toHaveTextContent('0');
      expect(screen.getByTestId('kpi-success-rate')).toHaveTextContent('N/A');
      expect(screen.getByTestId('kpi-avg-latency')).toHaveTextContent('0ms');
      expect(screen.getByTestId('feature-chart-empty')).toBeInTheDocument();
      expect(screen.getByTestId('latency-chart-empty')).toBeInTheDocument();
      expect(screen.getByTestId('activity-empty')).toBeInTheDocument();
    });
  });

  it('triggers clear metrics mutation and displays confirmation toast', async () => {
    setupDefaultMocks();
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: { status: 'cleared' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<ProductivityView />);

    const clearBtn = screen.getByTestId('clear-metrics-btn');
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/api/v1/productivity/clear',
        expect.anything(),
        expect.anything()
      );
      expect(screen.getByTestId('clear-toast')).toBeInTheDocument();
      expect(screen.getByTestId('clear-toast')).toHaveTextContent(/buffer cleared successfully/i);
    });
  });

  it('handles and displays error banner when summary request fails', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/productivity/summary')) {
        throw new Error('Connection refused by telemetry service');
      }
      if (urlStr.includes('/api/v1/productivity/features')) return { data: [], status: 200, statusText: 'OK', headers: {}, config: {} as any };
      if (urlStr.includes('/api/v1/productivity/performance')) return { data: [], status: 200, statusText: 'OK', headers: {}, config: {} as any };
      if (urlStr.includes('/api/v1/productivity/activity')) return { data: [], status: 200, statusText: 'OK', headers: {}, config: {} as any };
      if (urlStr.includes('/api/v1/productivity/health')) return { data: mockHealth, status: 200, statusText: 'OK', headers: {}, config: {} as any };
      throw new Error(`Unhandled URL: ${urlStr}`);
    });

    renderWithClient(<ProductivityView />);

    await waitFor(() => {
      expect(screen.getByTestId('productivity-error-banner')).toBeInTheDocument();
      expect(screen.getByTestId('productivity-error-banner')).toHaveTextContent(/Connection refused/i);
    });
  });
});
