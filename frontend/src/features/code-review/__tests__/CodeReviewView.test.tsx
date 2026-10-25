import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { CodeReviewView } from '../CodeReviewView';
import { renderWithClient } from '../../../test/testUtils';
import apiClient from '../../../services/apiClient';
import { ApiError } from '../../../types/api';
import type { ReviewCodeResponse } from '../../../types/ai';

describe('CodeReviewView Feature Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockReviewSuccess: ReviewCodeResponse = {
    summary: 'Identified 1 potential runtime division by zero defect.',
    overall_risk: 'medium',
    issues: [
      {
        title: 'Potential division by zero',
        severity: 'medium',
        category: 'correctness',
        line: 2,
        description: 'Division may fail at runtime when b is zero.',
        suggestion: 'Validate denominator before division.',
      },
    ],
    improved_code: 'def divide(a, b):\n    if b == 0:\n        raise ValueError("Cannot divide by zero")\n    return a / b',
  };

  const mockReviewClean: ReviewCodeResponse = {
    summary: 'The code is clean, robust, and adheres to idiomatic practices.',
    overall_risk: 'clean',
    issues: [],
    improved_code: 'def add(a: int, b: int) -> int:\n    return a + b',
  };

  it('renders initial state with editor, language selector, presets, and empty prompt', () => {
    renderWithClient(<CodeReviewView />);

    expect(screen.getByRole('heading', { level: 2, name: /Local LLM Heuristic Code Review/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Select Programming Language/i)).toHaveValue('python');
    expect(screen.getByLabelText(/Review Code Input Editor/i)).toBeInTheDocument();
    expect(screen.getByText(/Ready for Code Review/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Review Code with AI/i })).not.toBeDisabled();
  });

  it('submits code and renders structured review findings on success', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockReviewSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<CodeReviewView />);

    const submitBtn = screen.getByRole('button', { name: /Review Code with AI/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/api/v1/ai/review',
        expect.objectContaining({
          language: 'python',
          code: expect.stringContaining('def divide'),
        }),
        expect.anything()
      );
    });

    // Check overall risk badge
    await waitFor(() => {
      expect(screen.getByText(/MEDIUM RISK/i)).toBeInTheDocument();
    });

    // Check summary and issue details
    expect(screen.getByText(mockReviewSuccess.summary)).toBeInTheDocument();
    expect(screen.getByText('Potential division by zero')).toBeInTheDocument();
    expect(screen.getByText('Line 2')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText(/Division may fail at runtime when b is zero/i)).toBeInTheDocument();
    expect(screen.getByText(/Validate denominator before division/i)).toBeInTheDocument();

    // Check improved code container
    expect(screen.getByText(/Hardened & Improved Code/i)).toBeInTheDocument();
    expect(screen.getByText(/Cannot divide by zero/i)).toBeInTheDocument();
  });

  it('displays empty issues clean state when code has no issues', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockReviewClean,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<CodeReviewView />);

    const submitBtn = screen.getByRole('button', { name: /Review Code with AI/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('CLEAN')).toBeInTheDocument();
      expect(screen.getByText('No Issues Detected')).toBeInTheDocument();
      expect(screen.getByText(/The submitted code appears clean, robust/i)).toBeInTheDocument();
    });
  });

  it('displays loading skeleton during AI inference and disables button', async () => {
    vi.spyOn(apiClient, 'post').mockImplementation(
      () => new Promise(() => {}) // Pending promise never resolving
    );

    renderWithClient(<CodeReviewView />);

    const submitBtn = screen.getByRole('button', { name: /Review Code with AI/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Inspecting code with local qwen2.5-coder:1.5b for edge cases & bugs/i)).toBeInTheDocument();
      expect(submitBtn).toBeDisabled();
    });
  });

  it('displays error state and retry option when API request fails', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(
      new ApiError('Ollama AI service is unavailable at http://localhost:11434.', 503)
    );

    renderWithClient(<CodeReviewView />);

    const submitBtn = screen.getByRole('button', { name: /Review Code with AI/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Ollama AI service is unavailable/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Retry Review/i })).toBeInTheDocument();
  });

  it('allows copying improved code to clipboard with visual feedback', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockReviewSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<CodeReviewView />);

    fireEvent.click(screen.getByRole('button', { name: /Review Code with AI/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copy Improved Code/i })).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole('button', { name: /Copy Improved Code/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(mockReviewSuccess.improved_code);
      expect(screen.getByText(/Copied!/i)).toBeInTheDocument();
    });
  });

  it('allows selecting test scenario presets and updates editor code and language', () => {
    renderWithClient(<CodeReviewView />);

    const jsPresetBtn = screen.getByRole('button', { name: /JS Null Access/i });
    fireEvent.click(jsPresetBtn);

    expect(screen.getByLabelText(/Select Programming Language/i)).toHaveValue('javascript');
    const textarea = screen.getByLabelText(/Review Code Input Editor/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('getUserDisplayName');
  });
});
