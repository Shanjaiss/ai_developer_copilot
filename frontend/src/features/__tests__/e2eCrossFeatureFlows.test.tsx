import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { DashboardView } from '../dashboard/DashboardView';
import { renderWithClient } from '../../test/testUtils';
import apiClient from '../../services/apiClient';

describe('Phase 12: End-to-End Cross-Feature Integration Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const setupUniversalMocks = () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr === '/health') {
        return {
          data: {
            status: 'healthy',
            service: 'ai-developer-copilot-backend',
            environment: 'development',
            version: '0.1.0',
            timestamp: '2026-11-01T12:00:00Z',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
      }
      if (urlStr === '/') {
        return {
          data: {
            message: 'Welcome to AI Developer Copilot API',
            service: 'ai-developer-copilot-backend',
            version: '0.1.0',
            status: 'online',
            docs_url: '/docs',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
      }
      if (urlStr.includes('/api/v1/productivity/summary')) {
        return {
          data: {
            total_requests: 12,
            successful_requests: 12,
            failed_requests: 0,
            timed_out_requests: 0,
            success_rate: 100.0,
            failure_rate: 0.0,
            avg_latency_ms: 185.0,
            median_latency_ms: 160.0,
            p95_latency_ms: 320.0,
            retention_limit: 5000,
            retained_events_count: 12,
            earliest_timestamp: '2026-11-01T10:00:00Z',
            time_window: 'all',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
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
        return {
          data: {
            backend_healthy: true,
            ollama_reachable: true,
            configured_model_available: true,
            metrics_collector_active: true,
            retained_events_count: 12,
            model_name: 'qwen2.5-coder:1.5b',
            ollama_url: 'http://127.0.0.1:11434',
            timestamp: '2026-11-01T12:00:00Z',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
      }
      if (urlStr.includes('/api/v1/repositories')) {
        return {
          data: {
            configured: true,
            repositories: [{ id: 'core-repo', name: 'Core Engine' }],
            message: 'Approved repositories available.',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
      }
      throw new Error(`Unhandled GET url: ${urlStr}`);
    });
  };

  it('renders application with all 11 navigation tabs and switches seamlessly without crash', async () => {
    setupUniversalMocks();
    renderWithClient(<DashboardView initialView="dashboard" />);

    // Check Header & Phase 12 Brand Badge
    expect(screen.getByRole('heading', { level: 1, name: /AI Developer Copilot/i })).toBeInTheDocument();
    expect(screen.getByText(/Phase 12 • Final Release/i)).toBeInTheDocument();

    // 1. Productivity Dashboard tab
    const prodTab = screen.getByRole('tab', { name: /Productivity/i });
    fireEvent.click(prodTab);
    expect(screen.getByRole('heading', { level: 2, name: /Productivity Dashboard & Performance Telemetry/i })).toBeInTheDocument();

    // 2. AI Docs tab
    const docsTab = screen.getByRole('tab', { name: /AI Docs/i });
    fireEvent.click(docsTab);
    expect(screen.getByRole('heading', { level: 2, name: /AI Documentation Generator/i })).toBeInTheDocument();

    // 3. AI Refactor tab
    const refactorTab = screen.getByRole('tab', { name: /AI Refactor/i });
    fireEvent.click(refactorTab);
    expect(screen.getByRole('heading', { level: 2, name: /AI Code Refactoring Assistant/i })).toBeInTheDocument();

    // 4. AI Debugger tab
    const debugTab = screen.getByRole('tab', { name: /AI Debugger/i });
    fireEvent.click(debugTab);
    expect(screen.getByRole('heading', { level: 2, name: /AI Bug Detection & Debugging/i })).toBeInTheDocument();

    // 5. Repo Intelligence tab
    const repoTab = screen.getByRole('tab', { name: /Repo Intelligence/i });
    fireEvent.click(repoTab);
    expect(screen.getByRole('heading', { level: 2, name: /Lightweight Local Codebase Analysis & Architecture Q&A/i })).toBeInTheDocument();

    // 6. AI Chat tab
    const chatTab = screen.getByRole('tab', { name: /AI Chat/i });
    fireEvent.click(chatTab);
    expect(screen.getByRole('heading', { level: 2, name: /Conversational Coding Assistant & Pair Programmer/i })).toBeInTheDocument();

    // 7. AI Test Generator tab
    const testGenTab = screen.getByRole('tab', { name: /AI Test Generator/i });
    fireEvent.click(testGenTab);
    expect(screen.getByRole('heading', { level: 2, name: /Automated Behavior & Edge-Case Unit Test Generation/i })).toBeInTheDocument();

    // 8. AI Code Optimizer tab
    const optTab = screen.getByRole('tab', { name: /AI Code Optimizer/i });
    fireEvent.click(optTab);
    expect(screen.getByRole('heading', { level: 2, name: /Algorithmic & Architectural Code Optimization/i })).toBeInTheDocument();

    // 9. AI Code Review tab
    const reviewTab = screen.getByRole('tab', { name: /AI Code Review/i });
    fireEvent.click(reviewTab);
    expect(screen.getByRole('heading', { level: 2, name: /Local LLM Heuristic Code Review/i })).toBeInTheDocument();

    // 10. AI Code Explainer tab
    const explainTab = screen.getByRole('tab', { name: /AI Code Explainer/i });
    fireEvent.click(explainTab);
    expect(screen.getByRole('heading', { level: 2, name: /Local LLM Code Analysis/i })).toBeInTheDocument();

    // 11. System Dashboard tab
    const dashTab = screen.getByRole('tab', { name: /System Dashboard/i });
    fireEvent.click(dashTab);
    expect(screen.getByText(/Backend Telemetry & Diagnostics/i)).toBeInTheDocument();
  });

  it('guarantees cross-feature state isolation when switching between tools', async () => {
    setupUniversalMocks();
    renderWithClient(<DashboardView initialView="explainer" />);

    // In Code Explainer, find textarea by aria-label and type snippet
    const codeArea = screen.getByLabelText(/Code Input Editor/i);
    fireEvent.change(codeArea, { target: { value: 'def isolate_me(): return 42' } });
    expect(codeArea).toHaveValue('def isolate_me(): return 42');

    // Switch to Optimizer tab
    const optTab = screen.getByRole('tab', { name: /AI Code Optimizer/i });
    fireEvent.click(optTab);

    // Optimizer starts fresh with its own initial state
    const optArea = screen.getByLabelText(/Optimization Code Input Editor/i);
    expect(optArea).not.toHaveValue('def isolate_me(): return 42');

    // Switch back to Explainer tab: mounts cleanly with zero state corruption
    const explainTab = screen.getByRole('tab', { name: /AI Code Explainer/i });
    fireEvent.click(explainTab);
    expect(screen.getByLabelText(/Code Input Editor/i)).toBeInTheDocument();
  });

  it('handles backend offline state gracefully with actionable retry banner', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr === '/health') {
        throw new Error('Network error: connection refused by local backend');
      }
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config: {} as any };
    });

    renderWithClient(<DashboardView initialView="dashboard" />);

    // Should display offline status pill and error banner
    await waitFor(() => {
      expect(screen.getByText(/Backend: Disconnected/i)).toBeInTheDocument();
      expect(screen.getByText(/Connection Warning:/i)).toBeInTheDocument();
    });
  });
});
