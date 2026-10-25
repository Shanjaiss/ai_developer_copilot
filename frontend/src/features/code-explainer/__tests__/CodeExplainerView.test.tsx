import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { CodeExplainerView } from '../CodeExplainerView';
import { renderWithClient } from '../../../test/testUtils';
import apiClient from '../../../services/apiClient';
import { ApiError } from '../../../types/api';

describe('CodeExplainerView Feature Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockExplanation = {
    summary: 'Computes the square of input integer n in constant time.',
    line_by_line: [
      'Line 1: Function definition accepting n.',
      'Line 2: Multiplies n by itself and returns result.',
    ],
    time_complexity: 'O(1) - Constant arithmetic operation',
    space_complexity: 'O(1) - No dynamic allocation',
    improvements: ['Add type hint: def square(n: float) -> float:'],
  };

  it('renders initial state with code editor, language selector, and empty prompt', () => {
    renderWithClient(<CodeExplainerView />);

    expect(screen.getByRole('heading', { level: 2, name: /Local LLM Code Analysis/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Select Programming Language/i)).toHaveValue('python');
    expect(screen.getByLabelText(/Code Input Editor/i)).toBeInTheDocument();
    expect(screen.getByText(/Ready for Code Analysis/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explain Code with AI/i })).not.toBeDisabled();
  });

  it('submits code and renders structured explanation on success', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockExplanation,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<CodeExplainerView />);

    const submitBtn = screen.getByRole('button', { name: /Explain Code with AI/i });
    fireEvent.click(submitBtn);

    // Verify post called with endpoint and payload
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/api/v1/ai/explain',
        expect.objectContaining({
          language: 'python',
          code: expect.stringContaining('def square'),
        }),
        expect.anything()
      );
    });

    // Wait for explanation elements to appear
    await waitFor(() => {
      expect(screen.getByText(/Inference Complete/i)).toBeInTheDocument();
    });

    expect(screen.getByText(mockExplanation.summary)).toBeInTheDocument();
    expect(screen.getByText(mockExplanation.time_complexity)).toBeInTheDocument();
    expect(screen.getByText(mockExplanation.space_complexity)).toBeInTheDocument();
    expect(screen.getByText(mockExplanation.line_by_line[0])).toBeInTheDocument();
    expect(screen.getByText(mockExplanation.improvements[0])).toBeInTheDocument();
  });

  it('displays loading state during AI model inference', async () => {
    vi.spyOn(apiClient, 'post').mockImplementation(
      () => new Promise(() => {}) // pending promise never resolving
    );

    renderWithClient(<CodeExplainerView />);

    const submitBtn = screen.getByRole('button', { name: /Explain Code with AI/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Generating explanation with local qwen2.5-coder:1.5b/i)).toBeInTheDocument();
      expect(submitBtn).toBeDisabled();
    });
  });

  it('displays error state and retry option when API request fails', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(
      new ApiError('Ollama AI service is unavailable. Please ensure Ollama is running.', 503)
    );

    renderWithClient(<CodeExplainerView />);

    const submitBtn = screen.getByRole('button', { name: /Explain Code with AI/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Ollama AI service is unavailable/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Retry Analysis/i })).toBeInTheDocument();
  });

  it('allows selecting sample code and updates language selector', () => {
    renderWithClient(<CodeExplainerView />);

    const tsSampleBtn = screen.getByRole('button', { name: /TS Binary Search/i });
    fireEvent.click(tsSampleBtn);

    expect(screen.getByLabelText(/Select Programming Language/i)).toHaveValue('typescript');
    const textarea = screen.getByLabelText(/Code Input Editor/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('binarySearch');
  });
});
