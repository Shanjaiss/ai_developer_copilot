import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { RepositoryIntelligenceView } from '../RepositoryIntelligenceView';
import { renderWithClient } from '../../../test/testUtils';
import apiClient from '../../../services/apiClient';
import { ApiError } from '../../../types/api';
import type {
  RepositoryListResponse,
  RepositoryScanResponse,
  RepositoryAskResponse,
  RepositoryDependenciesResponse,
} from '../../../types/repository';

describe('RepositoryIntelligenceView Feature Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockRepoListConfigured: RepositoryListResponse = {
    repositories: [
      { id: 'copilot', name: 'AI Developer Copilot', description: 'Local root' },
      { id: 'second-repo', name: 'Second Repository', description: 'Secondary root' },
    ],
    configured: true,
    message: 'Server has approved repositories available for analysis.',
  };

  const mockRepoListUnconfigured: RepositoryListResponse = {
    repositories: [],
    configured: false,
    message: 'No repository roots are configured on the server. Configure APPROVED_REPOSITORY_ROOTS.',
  };

  const mockScanSuccess: RepositoryScanResponse = {
    summary: {
      repository_id: 'copilot',
      total_files_scanned: 12,
      total_lines: 1540,
      total_bytes: 42000,
      languages: { python: 6, typescript: 6 },
      entry_points: ['main.py', 'frontend/src/App.tsx'],
      is_partial: false,
      warnings: [],
    },
    tree: [
      {
        name: 'backend',
        path: 'backend',
        type: 'directory',
        children: [
          {
            name: 'main.py',
            path: 'backend/main.py',
            type: 'file',
            size_bytes: 1200,
            language: 'python',
            is_entry_point: true,
          },
        ],
      },
      {
        name: 'frontend',
        path: 'frontend',
        type: 'directory',
        children: [
          {
            name: 'apiClient.ts',
            path: 'frontend/apiClient.ts',
            type: 'file',
            size_bytes: 800,
            language: 'typescript',
            is_entry_point: false,
          },
        ],
      },
    ],
  };

  const mockDependenciesSuccess: RepositoryDependenciesResponse = {
    path: 'frontend/apiClient.ts',
    local_dependencies: ['./utils', './types'],
    external_dependencies: ['axios'],
    imported_by: ['frontend/src/features/dashboard/DashboardView.tsx'],
    confidence: 'high',
    limitations: [],
  };

  const mockAskSuccess: RepositoryAskResponse = {
    answer: 'The API client is located in frontend/apiClient.ts using an Axios instance with base URL.',
    references: [
      {
        path: 'frontend/apiClient.ts',
        start_line: 1,
        end_line: 25,
        snippet: 'export const apiClient = axios.create({ baseURL: "/api/v1" });',
        reason: "Matched keywords 'api', 'client' in path and definitions",
      },
    ],
    warnings: [],
    model: 'qwen2.5-coder:1.5b',
    context_used: true,
  };

  it('renders unconfigured state when no repositories are approved', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoListUnconfigured,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<RepositoryIntelligenceView />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 3, name: /No Approved Repositories Configured/i })
      ).toBeInTheDocument();
      expect(screen.getAllByText(/APPROVED_REPOSITORY_ROOTS/i).length).toBeGreaterThan(0);
    });
  });

  it('renders approved repositories selector, triggers auto-scan, and displays overview metrics', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoListConfigured,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockScanSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<RepositoryIntelligenceView />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Select active approved repository/i)).toBeInTheDocument();
      expect(screen.getByText(/AI Developer Copilot/i)).toBeInTheDocument();
    });

    // Auto-scan executes
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/api/v1/repositories/copilot/scan',
        undefined,
        expect.anything()
      );
    });

    // Overview cards render
    await waitFor(() => {
      expect(screen.getByText(/Repository Overview & Telemetry/i)).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument(); // total files
      expect(screen.getByText('1,540')).toBeInTheDocument(); // total lines
      expect(screen.getByText(/⭐ main\.py/i)).toBeInTheDocument();
    });
  });

  it('renders directory file tree and selects file to view dependencies', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoListConfigured,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const postSpy = vi.spyOn(apiClient, 'post')
      .mockResolvedValueOnce({
        data: mockScanSuccess,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      })
      .mockResolvedValueOnce({
        data: mockDependenciesSuccess,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

    renderWithClient(<RepositoryIntelligenceView />);

    await waitFor(() => {
      expect(screen.getByText('backend')).toBeInTheDocument();
      expect(screen.getByText('apiClient.ts')).toBeInTheDocument();
    });

    // Click on apiClient.ts
    const fileNode = screen.getByText('apiClient.ts');
    fireEvent.click(fileNode);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/api/v1/repositories/copilot/dependencies',
        { path: 'frontend/apiClient.ts' },
        expect.anything()
      );
    });

    // Dependency viewer renders
    await waitFor(() => {
      expect(screen.getByText(/Dependency Insights:/i)).toBeInTheDocument();
      expect(screen.getByText(/axios/i)).toBeInTheDocument();
      expect(screen.getByText(/\.\/utils/i)).toBeInTheDocument();
      expect(screen.getByText(/DashboardView.tsx/i)).toBeInTheDocument();
    });
  });

  it('submits repository question and renders grounded answer with references', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoListConfigured,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const postSpy = vi.spyOn(apiClient, 'post')
      .mockResolvedValueOnce({
        data: mockScanSuccess,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      })
      .mockResolvedValueOnce({
        data: mockAskSuccess,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

    renderWithClient(<RepositoryIntelligenceView />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Repository question input/i)).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/Repository question input/i);
    fireEvent.change(input, { target: { value: 'Where is the API client configured?' } });

    const askBtn = screen.getByRole('button', { name: /Ask repository question/i });
    expect(askBtn).not.toBeDisabled();
    fireEvent.click(askBtn);

    // Verify user turn
    expect(screen.getByText('Where is the API client configured?')).toBeInTheDocument();

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/api/v1/repositories/copilot/ask',
        expect.objectContaining({
          question: 'Where is the API client configured?',
          conversation: [],
        }),
        expect.anything()
      );
    });

    // Verify AI response and grounded references
    await waitFor(() => {
      expect(
        screen.getByText(/The API client is located in frontend\/apiClient\.ts/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Grounded Source References/i)).toBeInTheDocument();
      expect(screen.getByText(/Lines 1–25/i)).toBeInTheDocument();
    });
  });

  it('supports suggested query buttons and follow-up multi-turn queries', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoListConfigured,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const postSpy = vi.spyOn(apiClient, 'post')
      .mockResolvedValueOnce({
        data: mockScanSuccess,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      })
      .mockResolvedValueOnce({
        data: mockAskSuccess,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      })
      .mockResolvedValueOnce({
        data: {
          answer: 'Follow-up reply: main.py imports auth_service to authenticate users.',
          references: [],
          warnings: [],
          model: 'qwen2.5-coder:1.5b',
          context_used: true,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

    renderWithClient(<RepositoryIntelligenceView />);

    await waitFor(() => {
      expect(screen.getByText(/Where is the application entry point\?/i)).toBeInTheDocument();
    });

    // Click suggested chip
    fireEvent.click(screen.getByText(/Where is the application entry point\?/i));

    await waitFor(() => {
      expect(screen.getByText(mockAskSuccess.answer)).toBeInTheDocument();
    });

    // Turn 2: Follow-up question
    const input = screen.getByLabelText(/Repository question input/i);
    fireEvent.change(input, { target: { value: 'How does main.py call it?' } });
    fireEvent.click(screen.getByRole('button', { name: /Ask repository question/i }));

    await waitFor(() => {
      expect(postSpy).toHaveBeenLastCalledWith(
        '/api/v1/repositories/copilot/ask',
        expect.objectContaining({
          question: 'How does main.py call it?',
          conversation: [
            { role: 'user', content: 'Where is the application entry point?' },
            { role: 'assistant', content: mockAskSuccess.answer },
          ],
        }),
        expect.anything()
      );
    });
  });

  it('handles scan and Ollama errors gracefully with retry', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoListConfigured,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    vi.spyOn(apiClient, 'post')
      .mockResolvedValueOnce({
        data: mockScanSuccess,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      })
      .mockRejectedValueOnce(
        new ApiError('Ollama AI service is unavailable at http://localhost:11434', 503)
      );

    renderWithClient(<RepositoryIntelligenceView />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Repository question input/i)).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/Repository question input/i);
    fireEvent.change(input, { target: { value: 'Heavy analysis query' } });
    fireEvent.click(screen.getByRole('button', { name: /Ask repository question/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText(/Ollama AI service is unavailable/i)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });
  });

  it('resets context and isolates in-flight requests when switching repositories', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoListConfigured,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    let resolveAskPromise: (val: any) => void;
    const pendingAsk = new Promise((resolve) => {
      resolveAskPromise = resolve;
    });

    vi.spyOn(apiClient, 'post')
      .mockResolvedValueOnce({
        data: mockScanSuccess,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      })
      .mockReturnValueOnce(pendingAsk as any) // in-flight ask
      .mockResolvedValueOnce({
        data: {
          ...mockScanSuccess,
          summary: { ...mockScanSuccess.summary, repository_id: 'second-repo' },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

    renderWithClient(<RepositoryIntelligenceView />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Repository question input/i)).toBeInTheDocument();
    });

    // Ask question in copilot repo
    const input = screen.getByLabelText(/Repository question input/i);
    fireEvent.change(input, { target: { value: 'Question for first repo' } });
    fireEvent.click(screen.getByRole('button', { name: /Ask repository question/i }));

    expect(screen.getByText('Question for first repo')).toBeInTheDocument();

    // Switch repository to second-repo while query is in-flight
    const select = screen.getByLabelText(/Select active approved repository/i);
    fireEvent.change(select, { target: { value: 'second-repo' } });

    // Old conversation must be cleared
    expect(screen.queryByText('Question for first repo')).not.toBeInTheDocument();

    // Resolve late in-flight request
    resolveAskPromise!({
      data: { answer: 'Late answer for first repo', references: [], warnings: [], model: 'qwen2.5-coder:1.5b', context_used: false },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    // Must NOT leak into the new repository view
    await waitFor(() => {
      expect(screen.queryByText('Late answer for first repo')).not.toBeInTheDocument();
    });
  });

  it('displays scan limit warnings when partial scan limit is reached', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoListConfigured,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        ...mockScanSuccess,
        summary: {
          ...mockScanSuccess.summary,
          is_partial: true,
          warnings: ['Reached maximum file scan limit (300 files).'],
        },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<RepositoryIntelligenceView />);

    await waitFor(() => {
      expect(screen.getByText(/Bounded Scan Limit Applied/i)).toBeInTheDocument();
      expect(screen.getByText(/Reached maximum file scan limit/i)).toBeInTheDocument();
    });
  });

  it('clears conversation when clicking Clear Conversation button', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoListConfigured,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    vi.spyOn(apiClient, 'post')
      .mockResolvedValueOnce({
        data: mockScanSuccess,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      })
      .mockResolvedValueOnce({
        data: mockAskSuccess,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

    renderWithClient(<RepositoryIntelligenceView />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Repository question input/i)).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/Repository question input/i);
    fireEvent.change(input, { target: { value: 'Test query' } });
    fireEvent.click(screen.getByRole('button', { name: /Ask repository question/i }));

    await waitFor(() => {
      expect(screen.getByText(mockAskSuccess.answer)).toBeInTheDocument();
    });

    const clearBtn = screen.getByRole('button', { name: /Clear Conversation/i });
    fireEvent.click(clearBtn);

    expect(screen.queryByText(mockAskSuccess.answer)).not.toBeInTheDocument();
    expect(screen.queryByText('Test query')).not.toBeInTheDocument();
  });
});
