import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { DocumentationView } from '../DocumentationView';
import { renderWithClient } from '../../../test/testUtils';
import apiClient from '../../../services/apiClient';
import { ApiError } from '../../../types/api';
import type {
  DocumentationResponse,
  RepositoryListResponse,
} from '../../../types';

describe('DocumentationView Feature Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockRepoList: RepositoryListResponse = {
    repositories: [
      { id: 'sample_repo', name: 'Sample Repository', description: 'Local approved repository' },
    ],
    configured: true,
    message: 'Approved repositories available.',
  };

  const mockDocSuccess: DocumentationResponse = {
    title: 'Metrics Pipeline Function Documentation',
    documentation_type: 'function',
    mode: 'pasted_code',
    language: 'python',
    markdown: '# `process_user_metrics`\n\nComputes aggregate engagement metrics.\n\n## Parameters\n- `users`: list[dict]\n- `threshold`: float',
    sources: [
      {
        path: 'pasted_code',
        start_line: 1,
        end_line: 12,
        reason: 'User-provided source code snippet',
      },
    ],
    verified_facts: [
      {
        category: 'function',
        fact: "Defines function 'process_user_metrics(users, threshold)'",
        evidence: 'line 1-12',
      },
    ],
    assumptions: [
      {
        claim: 'Engagement is a normalized float between 0 and 1',
        basis: 'Default threshold 0.5',
        verification_needed: 'Check user schema definition',
      },
    ],
    warnings: [],
    model: 'qwen2.5-coder:1.5b',
  };

  it('renders initial state with heading, mode switcher, doc type, and presets', () => {
    renderWithClient(<DocumentationView />);

    expect(screen.getByRole('heading', { level: 2, name: /AI Documentation Generator/i })).toBeInTheDocument();
    expect(screen.getByTestId('mode-pasted-btn')).toBeInTheDocument();
    expect(screen.getByTestId('mode-readme-btn')).toBeInTheDocument();
    expect(screen.getByTestId('mode-api-btn')).toBeInTheDocument();
    expect(screen.getByTestId('mode-architecture-btn')).toBeInTheDocument();
    expect(screen.getByTestId('mode-selected-file-btn')).toBeInTheDocument();

    expect(screen.getByTestId('doc-type-select')).toBeInTheDocument();
    expect(screen.getByTestId('doc-audience-select')).toBeInTheDocument();
    expect(screen.getByTestId('doc-detail-select')).toBeInTheDocument();
    expect(screen.getByTestId('doc-code-input')).toBeInTheDocument();
    expect(screen.getByTestId('doc-submit-btn')).toBeDisabled();
  });

  it('switches to repository readme mode and displays approved repositories dropdown', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoList,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<DocumentationView />);

    fireEvent.click(screen.getByTestId('mode-readme-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('doc-repo-select')).toBeInTheDocument();
      expect(screen.getByText(/Sample Repository/i)).toBeInTheDocument();
    });

    expect(screen.queryByTestId('doc-code-input')).not.toBeInTheDocument();
  });

  it('applies preset in pasted code mode and enables submit button', () => {
    renderWithClient(<DocumentationView />);

    const presetBtn = screen.getByTestId('preset-python-data-pipeline-function');
    fireEvent.click(presetBtn);

    const textarea = screen.getByTestId('doc-code-input') as HTMLTextAreaElement;
    expect(textarea.value).toContain('def process_user_metrics');
    expect(screen.getByTestId('doc-submit-btn')).not.toBeDisabled();
  });

  it('submits documentation request and renders markdown preview, verified facts, and assumptions', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockDocSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<DocumentationView />);

    fireEvent.change(screen.getByTestId('doc-code-input'), {
      target: { value: 'def add(a, b): return a + b' },
    });
    fireEvent.click(screen.getByTestId('doc-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('doc-results-section')).toBeInTheDocument();
      expect(screen.getByText('Metrics Pipeline Function Documentation')).toBeInTheDocument();
      expect(screen.getByTestId('markdown-rendered-view')).toBeInTheDocument();
      expect(screen.getAllByText(/process_user_metrics/i).length).toBeGreaterThan(0);
    });

    // Check verified facts
    expect(screen.getByTestId('verified-facts-section')).toBeInTheDocument();
    expect(screen.getByText(/Defines function 'process_user_metrics/i)).toBeInTheDocument();

    // Check assumptions
    expect(screen.getByTestId('assumptions-section')).toBeInTheDocument();
    expect(screen.getByText(/Engagement is a normalized float/i)).toBeInTheDocument();

    // Check source references
    expect(screen.getByTestId('sources-section')).toBeInTheDocument();
    expect(screen.getByText('pasted_code')).toBeInTheDocument();
  });

  it('toggles between Rendered Markdown preview and Raw Markdown pre block', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockDocSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<DocumentationView />);

    fireEvent.change(screen.getByTestId('doc-code-input'), {
      target: { value: 'def add(a, b): return a + b' },
    });
    fireEvent.click(screen.getByTestId('doc-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('tab-raw-markdown-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tab-raw-markdown-btn'));
    expect(screen.getByTestId('markdown-raw-view')).toBeInTheDocument();
    expect(screen.getByTestId('markdown-raw-view').textContent).toContain('# `process_user_metrics`');

    fireEvent.click(screen.getByTestId('tab-preview-btn'));
    expect(screen.getByTestId('markdown-rendered-view')).toBeInTheDocument();
  });

  it('allows copying markdown to clipboard', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockDocSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    renderWithClient(<DocumentationView />);

    fireEvent.change(screen.getByTestId('doc-code-input'), { target: { value: 'def foo(): pass' } });
    fireEvent.click(screen.getByTestId('doc-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('copy-markdown-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('copy-markdown-btn'));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockDocSuccess.markdown);
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('triggers markdown download on Download .md button click', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockDocSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    // Mock URL.createObjectURL and URL.revokeObjectURL
    const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/fake-doc-blob');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    renderWithClient(<DocumentationView />);

    fireEvent.change(screen.getByTestId('doc-code-input'), { target: { value: 'def foo(): pass' } });
    fireEvent.click(screen.getByTestId('doc-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('download-markdown-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('download-markdown-btn'));

    expect(createObjectURLMock).toHaveBeenCalled();
  });

  it('renders repository selected file mode and submits file path', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoList,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        ...mockDocSuccess,
        title: 'Items Router Documentation',
        file_path_used: 'backend/app/routers/items.py',
        repository_used: 'sample_repo',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<DocumentationView />);

    fireEvent.click(screen.getByTestId('mode-selected-file-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('doc-repo-select')).toBeInTheDocument();
      expect(screen.getByText(/Sample Repository/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('doc-repo-select'), { target: { value: 'sample_repo' } });
    fireEvent.change(screen.getByTestId('doc-file-path-input'), { target: { value: 'backend/app/routers/items.py' } });

    await waitFor(() => {
      expect(screen.getByTestId('doc-submit-btn')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId('doc-submit-btn'));

    await waitFor(() => {
      expect(screen.getByText('Items Router Documentation')).toBeInTheDocument();
    });
  });

  it('handles API error with retry alert banner', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(
      new ApiError('Ollama service timed out after 60s', 504)
    );

    renderWithClient(<DocumentationView />);

    fireEvent.change(screen.getByTestId('doc-code-input'), { target: { value: 'def foo(): pass' } });
    fireEvent.click(screen.getByTestId('doc-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('doc-error-banner')).toBeInTheDocument();
      expect(screen.getByText(/Ollama service timed out after 60s/i)).toBeInTheDocument();
    });
  });

  it('clears form inputs and results on Clear button click', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockDocSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<DocumentationView />);

    const textarea = screen.getByTestId('doc-code-input') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'def foo(): pass' } });
    fireEvent.click(screen.getByTestId('doc-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('doc-results-section')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('doc-clear-btn'));

    expect(textarea.value).toBe('');
    expect(screen.queryByTestId('doc-results-section')).not.toBeInTheDocument();
  });
});
