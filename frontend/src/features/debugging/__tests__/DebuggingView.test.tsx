import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { DebuggingView } from '../DebuggingView';
import { renderWithClient } from '../../../test/testUtils';
import apiClient from '../../../services/apiClient';
import { ApiError } from '../../../types/api';
import type {
  RepositoryListResponse,
  DebugResponse,
} from '../../../types';

describe('DebuggingView Feature Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockRepoList: RepositoryListResponse = {
    repositories: [
      { id: 'sample_repo', name: 'Sample Repository', description: 'Local root' },
    ],
    configured: true,
    message: 'Approved repositories available.',
  };

  const mockDebugSuccess: DebugResponse = {
    summary: "KeyError: 'user_id' occurred because 'user_id' was not present in the payload dictionary.",
    error_type: 'KeyError',
    language: 'python',
    parsed_frames: [
      {
        file_path: 'user_service.py',
        line_number: 42,
        column_number: null,
        function_name: 'get_user',
        code_line: 'user_id = data["user_id"]',
        is_in_repository: true,
      },
    ],
    root_causes: [
      {
        title: "Missing 'user_id' key in input dictionary",
        description: "The dictionary data did not have the key 'user_id' when accessed via bracket notation.",
        confidence: 'high',
        evidence: ["KeyError: 'user_id'", 'Line 42: data["user_id"]'],
      },
    ],
    suggested_fixes: [
      {
        title: 'Use dict.get() with fallback',
        explanation: 'Safely access user_id using dict.get to avoid throwing KeyError.',
        code_example: "user_id = data.get('user_id')\nif not user_id:\n    raise ValueError('Missing user_id')",
        verification_steps: [
          "Pass a dictionary without 'user_id' to verify proper handling",
          'Run pytest to ensure test passes',
        ],
      },
    ],
    references: [
      {
        path: 'user_service.py',
        start_line: 30,
        end_line: 50,
        snippet: 'def get_user(data):\n    user_id = data["user_id"]\n    return db.query(User).filter_by(id=user_id)',
        reason: 'Stack frame location (line 42, function: get_user)',
      },
    ],
    warnings: [
      'AI-generated diagnoses and code fixes are advisory. Always test and verify changes in a non-production environment before deployment.',
    ],
    model: 'qwen2.5-coder:1.5b',
    repository_used: 'sample_repo',
  };

  it('renders initial state with heading, error textarea, preset buttons, and language dropdown', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoList,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<DebuggingView />);

    expect(screen.getByRole('heading', { level: 2, name: /AI Bug Detection & Debugging/i })).toBeInTheDocument();
    expect(screen.getByTestId('debug-error-message')).toBeInTheDocument();
    expect(screen.getByTestId('debug-language-select')).toBeInTheDocument();
    expect(screen.getByTestId('debug-repository-select')).toBeInTheDocument();
    expect(screen.getByTestId('debug-submit-btn')).toBeInTheDocument();
    expect(screen.getByTestId('debug-clear-btn')).toBeInTheDocument();

    // Verify preset buttons exist
    expect(screen.getByRole('button', { name: /Python KeyError/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /JS TypeError/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /FastAPI 422/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /React Too Many Re-Renders/i })).toBeInTheDocument();
  });

  it('allows applying quick sample preset', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoList,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<DebuggingView />);

    const presetBtn = screen.getByRole('button', { name: /Python KeyError/i });
    fireEvent.click(presetBtn);

    const errorInput = screen.getByTestId('debug-error-message') as HTMLTextAreaElement;
    expect(errorInput.value).toContain("KeyError: 'user_id'");

    const langSelect = screen.getByTestId('debug-language-select') as HTMLSelectElement;
    expect(langSelect.value).toBe('python');
  });

  it('submits debugging request and renders summary, root cause hypotheses, and suggested fixes', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoList,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockDebugSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<DebuggingView />);

    const errorInput = screen.getByTestId('debug-error-message');
    fireEvent.change(errorInput, { target: { value: "KeyError: 'user_id'" } });

    const submitBtn = screen.getByTestId('debug-submit-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledTimes(1);
    });

    // Check overview header
    await waitFor(() => {
      expect(screen.getByText('KeyError')).toBeInTheDocument();
      expect(screen.getAllByText(/occurred because 'user_id' was not present/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Repo: sample_repo/i)).toBeInTheDocument();
    });

    // Check root causes
    expect(screen.getByText("Missing 'user_id' key in input dictionary")).toBeInTheDocument();
    expect(screen.getByText('High Confidence')).toBeInTheDocument();

    // Check suggested fixes
    expect(screen.getByText(/Use dict\.get\(\) with fallback/i)).toBeInTheDocument();
    expect(screen.getByText(/Pass a dictionary without 'user_id'/i)).toBeInTheDocument();
    expect(screen.getByTestId('copy-fix-btn-0')).toBeInTheDocument();
  });

  it('allows copying suggested fix code to clipboard', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoList,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockDebugSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    renderWithClient(<DebuggingView />);

    fireEvent.change(screen.getByTestId('debug-error-message'), { target: { value: "KeyError: 'user_id'" } });
    fireEvent.click(screen.getByTestId('debug-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('copy-fix-btn-0')).toBeInTheDocument();
    });

    const copyBtn = screen.getByTestId('copy-fix-btn-0');
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(mockDebugSuccess.suggested_fixes[0].code_example);
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('renders grounded source references and parsed stack frames', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoList,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockDebugSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<DebuggingView />);

    fireEvent.change(screen.getByTestId('debug-error-message'), { target: { value: "KeyError: 'user_id'" } });
    fireEvent.click(screen.getByTestId('debug-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('grounded-reference-0')).toBeInTheDocument();
    });

    expect(screen.getAllByText('user_service.py').length).toBeGreaterThan(0);
    expect(screen.getByText(/Lines 30–50/i)).toBeInTheDocument();
    expect(screen.getByText(/Stack frame location \(line 42/i)).toBeInTheDocument();
    expect(screen.getByText('Repository File')).toBeInTheDocument();
  });

  it('submits iterative follow-up question and updates dialogue', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoList,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const postSpy = vi.spyOn(apiClient, 'post')
      .mockResolvedValueOnce({
        data: mockDebugSuccess,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      })
      .mockResolvedValueOnce({
        data: {
          ...mockDebugSuccess,
          summary: 'You can use defaultdict(str) to provide a default empty string for missing keys.',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

    renderWithClient(<DebuggingView />);

    fireEvent.change(screen.getByTestId('debug-error-message'), { target: { value: "KeyError: 'user_id'" } });
    fireEvent.click(screen.getByTestId('debug-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('debug-followup-input')).toBeInTheDocument();
    });

    const followUpInput = screen.getByTestId('debug-followup-input');
    fireEvent.change(followUpInput, { target: { value: 'Can I use defaultdict instead?' } });

    const followUpSubmit = screen.getByTestId('debug-followup-submit');
    fireEvent.click(followUpSubmit);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Can I use defaultdict instead?')).toBeInTheDocument();
      expect(screen.getAllByText(/You can use defaultdict\(str\)/i).length).toBeGreaterThan(0);
    });
  });

  it('clears form and results on Clear button click', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoList,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockDebugSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<DebuggingView />);

    const errorInput = screen.getByTestId('debug-error-message') as HTMLTextAreaElement;
    fireEvent.change(errorInput, { target: { value: "KeyError: 'user_id'" } });
    fireEvent.click(screen.getByTestId('debug-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('debug-results-section')).toBeInTheDocument();
    });

    const clearBtn = screen.getByTestId('debug-clear-btn');
    fireEvent.click(clearBtn);

    expect(errorInput.value).toBe('');
    expect(screen.queryByTestId('debug-results-section')).not.toBeInTheDocument();
  });

  it('handles debugging API error with retry banner', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoList,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(
      new ApiError('Ollama AI service is unavailable', 503)
    );

    renderWithClient(<DebuggingView />);

    fireEvent.change(screen.getByTestId('debug-error-message'), { target: { value: "KeyError: 'user_id'" } });
    fireEvent.click(screen.getByTestId('debug-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('debug-error-banner')).toBeInTheDocument();
      expect(screen.getByText(/Ollama AI service is unavailable/i)).toBeInTheDocument();
    });
  });
});
