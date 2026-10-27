import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { DashboardView } from '../DashboardView';
import { renderWithClient, createTestQueryClient } from '../../../test/testUtils';
import apiClient from '../../../services/apiClient';
import { ApiError } from '../../../types/api';

describe('DashboardView Feature Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders healthy status, service telemetry, and endpoints on success', async () => {
    const mockHealth = {
      status: 'healthy',
      service: 'ai-developer-copilot-backend',
      environment: 'development',
      version: '0.1.0',
      timestamp: '2026-10-25T14:30:00Z',
    };

    const mockWelcome = {
      message: 'Welcome to AI Developer Copilot API',
      service: 'ai-developer-copilot-backend',
      version: '0.1.0',
      status: 'online',
      docs_url: '/docs',
    };

    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      if (url === '/health') {
        return { data: mockHealth, status: 200, statusText: 'OK', headers: {}, config: {} as any };
      }
      if (url === '/') {
        return { data: mockWelcome, status: 200, statusText: 'OK', headers: {}, config: {} as any };
      }
      throw new Error(`Unexpected url: ${url}`);
    });

    renderWithClient(<DashboardView />);

    // Verify Project Name is rendered
    expect(screen.getByRole('heading', { level: 1, name: /AI Developer Copilot/i })).toBeInTheDocument();

    // Wait for health query to resolve
    await waitFor(() => {
      expect(screen.getByText(/Backend: Connected & Healthy/i)).toBeInTheDocument();
    });

    // Verify service metadata rendered
    expect(screen.getAllByText('ai-developer-copilot-backend').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0.1.0').length).toBeGreaterThan(0);

    // Verify endpoints contract list is rendered
    expect(screen.getAllByText('/health').length).toBeGreaterThan(0);
    expect(screen.getAllByText('/').length).toBeGreaterThan(0);
    expect(screen.getAllByText('/docs').length).toBeGreaterThan(0);
  });

  it('renders disconnected state and error banner when backend fails', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(
      new ApiError('Unable to reach backend service', 500)
    );

    const client = createTestQueryClient();
    renderWithClient(<DashboardView />, client);

    await waitFor(() => {
      expect(screen.getByText(/Backend: Disconnected/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Connection Warning:/i)).toBeInTheDocument();
    expect(screen.getByText(/Unable to reach backend service/i)).toBeInTheDocument();
  });

  it('triggers refetch when clicking the refresh button', async () => {
    let healthFetchCount = 0;
    vi.spyOn(apiClient, 'get').mockImplementation(async () => {
      healthFetchCount += 1;
      return {
        data: {
          status: 'healthy',
          service: 'ai-developer-copilot-backend',
          environment: 'development',
          version: '0.1.0',
          timestamp: '2026-10-25T14:30:00Z',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
    });

    renderWithClient(<DashboardView />);

    const refreshBtn = screen.getByRole('button', { name: /Refresh Backend Connectivity Status/i });

    await waitFor(() => {
      expect(screen.getByText(/Backend: Connected & Healthy/i)).toBeInTheDocument();
      expect(refreshBtn).not.toBeDisabled();
    });

    const initialCount = healthFetchCount;
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(healthFetchCount).toBeGreaterThan(initialCount);
    });
  });

  it('switches between views using navigation tabs', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { status: 'healthy', service: 'ai-copilot', environment: 'development', version: '0.1.0' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<DashboardView initialView="dashboard" />);

    // Click AI Test Generator tab
    const testGenTab = screen.getByRole('tab', { name: /AI Test Generator/i });
    fireEvent.click(testGenTab);

    // AI Unit Test Generator feature heading should appear
    expect(screen.getByRole('heading', { level: 2, name: /Automated Behavior & Edge-Case Unit Test Generation/i })).toBeInTheDocument();

    // Click AI Code Optimizer tab
    const optimizerTab = screen.getByRole('tab', { name: /AI Code Optimizer/i });
    fireEvent.click(optimizerTab);

    // Code Optimizer feature heading should appear
    expect(screen.getByRole('heading', { level: 2, name: /Algorithmic & Architectural Code Optimization/i })).toBeInTheDocument();

    // Click AI Code Review tab
    const reviewTab = screen.getByRole('tab', { name: /AI Code Review/i });
    fireEvent.click(reviewTab);

    // Code Review feature heading should appear
    expect(screen.getByRole('heading', { level: 2, name: /Local LLM Heuristic Code Review/i })).toBeInTheDocument();

    // Click AI Code Explainer tab
    const explainerTab = screen.getByRole('tab', { name: /AI Code Explainer/i });
    fireEvent.click(explainerTab);

    // Code Explainer feature heading should appear
    expect(screen.getByRole('heading', { level: 2, name: /Local LLM Code Analysis/i })).toBeInTheDocument();

    // Click back to System Dashboard tab
    const dashboardTab = screen.getByRole('tab', { name: /System Dashboard/i });
    fireEvent.click(dashboardTab);

    // Dashboard Telemetry heading should be back
    expect(screen.getByText(/Backend Telemetry & Diagnostics/i)).toBeInTheDocument();
  });
});
