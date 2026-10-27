import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { CodeOptimizerView } from '../CodeOptimizerView';
import { renderWithClient } from '../../../test/testUtils';
import apiClient from '../../../services/apiClient';
import { ApiError } from '../../../types/api';
import type { OptimizeCodeResponse } from '../../../types/ai';

describe('CodeOptimizerView Feature Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockOptimizePerformanceSuccess: OptimizeCodeResponse = {
    summary: 'Optimized nested loops to set lookup, reducing time complexity from O(n^2) to O(n).',
    original_complexity: {
      time: 'O(n^2)',
      space: 'O(1)',
    },
    optimized_complexity: {
      time: 'O(n)',
      space: 'O(n)',
    },
    optimized_code:
      'def find_duplicates(items):\n    seen = set()\n    duplicates = set()\n    for item in items:\n        if item in seen:\n            duplicates.add(item)\n        else:\n            seen.add(item)\n    return list(duplicates)',
    changes: [
      {
        title: 'Use Hash Set for O(1) Membership Testing',
        reason: 'Replaces O(n) inner loop scan with constant-time set lookups.',
        tradeoff: 'Increases auxiliary memory consumption from O(1) to O(n).',
      },
    ],
    warnings: [
      'Empirical benchmark reminder: Big-O estimates are theoretical. Validate with production workloads.',
    ],
  };

  const mockOptimizeAlreadyOptimal: OptimizeCodeResponse = {
    summary: 'The code is already optimal; constant-time operation with no loop overhead.',
    original_complexity: {
      time: 'O(1)',
      space: 'O(1)',
    },
    optimized_complexity: {
      time: 'O(1)',
      space: 'O(1)',
    },
    optimized_code: 'def square(n: int) -> int:\n    return n * n',
    changes: [],
    warnings: [
      'No modifications were applied because the code is already optimal for performance.',
    ],
  };

  it('renders initial state with editor, language selector, goal selector, presets, and empty prompt', () => {
    renderWithClient(<CodeOptimizerView />);

    expect(
      screen.getByRole('heading', { level: 2, name: /Algorithmic & Architectural Code Optimization/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Select Programming Language/i)).toHaveValue('python');
    expect(screen.getByLabelText(/Optimization Goal Selector/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Performance/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText(/Optimization Code Input Editor/i)).toBeInTheDocument();
    expect(screen.getByText(/Ready for Code Optimization/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Optimize Code with AI/i })).not.toBeDisabled();
  });

  it('allows selecting different optimization goals', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockOptimizePerformanceSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<CodeOptimizerView />);

    // Click Readability goal
    const readabilityBtn = screen.getByRole('radio', { name: /Readability/i });
    fireEvent.click(readabilityBtn);
    expect(readabilityBtn).toHaveAttribute('aria-checked', 'true');

    // Click Optimize
    const submitBtn = screen.getByRole('button', { name: /Optimize Code with AI/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/api/v1/ai/optimize',
        expect.objectContaining({
          optimization_goal: 'readability',
          language: 'python',
        }),
        expect.anything()
      );
    });
  });

  it('submits code and renders structured optimization results, complexity, code comparison, and changes', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockOptimizePerformanceSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<CodeOptimizerView />);

    const submitBtn = screen.getByRole('button', { name: /Optimize Code with AI/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/api/v1/ai/optimize',
        expect.objectContaining({
          language: 'python',
          optimization_goal: 'performance',
          code: expect.stringContaining('def find_duplicates'),
        }),
        expect.anything()
      );
    });

    // Check summary and badge
    await waitFor(() => {
      expect(screen.getByText('OPTIMIZED')).toBeInTheDocument();
      expect(screen.getByText(mockOptimizePerformanceSuccess.summary)).toBeInTheDocument();
    });

    // Check complexity comparison
    expect(screen.getByText('O(n^2)')).toBeInTheDocument();
    expect(screen.getAllByText('O(n)').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Time Complexity')).toBeInTheDocument();
    expect(screen.getByText('Auxiliary Space Complexity')).toBeInTheDocument();

    // Check code comparison
    expect(screen.getByText('📄 Original Code')).toBeInTheDocument();
    expect(screen.getByText('✨ Optimized Code')).toBeInTheDocument();

    // Check proposed change card
    expect(screen.getByText('1. Use Hash Set for O(1) Membership Testing')).toBeInTheDocument();
    expect(screen.getByText(/Replaces O\(n\) inner loop scan with constant-time set lookups/i)).toBeInTheDocument();
    expect(screen.getByText(/Increases auxiliary memory consumption from O\(1\) to O\(n\)/i)).toBeInTheDocument();

    // Check benchmark reminder
    expect(screen.getByText(/Trade-offs & Benchmark Advisories/i)).toBeInTheDocument();
  });

  it('displays already optimal badge and empty changes state when no improvement is needed', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockOptimizeAlreadyOptimal,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<CodeOptimizerView />);

    // Select the Already Optimal preset
    const presetBtn = screen.getByRole('button', { name: /Already Optimal/i });
    fireEvent.click(presetBtn);

    const submitBtn = screen.getByRole('button', { name: /Optimize Code with AI/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('ALREADY OPTIMAL')).toBeInTheDocument();
      expect(screen.getByText(mockOptimizeAlreadyOptimal.summary)).toBeInTheDocument();
      expect(screen.getByText(/No modifications were proposed/i)).toBeInTheDocument();
    });
  });

  it('displays loading state during AI inference and disables button', async () => {
    vi.spyOn(apiClient, 'post').mockImplementation(
      () => new Promise(() => {}) // Pending promise never resolving
    );

    renderWithClient(<CodeOptimizerView />);

    const submitBtn = screen.getByRole('button', { name: /Optimize Code with AI/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Analyzing code structure & synthesizing optimized implementation.../i)).toBeInTheDocument();
      expect(submitBtn).toBeDisabled();
    });
  });

  it('displays error alert and retry button when API request fails', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(
      new ApiError('Ollama AI service is unavailable at http://localhost:11434.', 503)
    );

    renderWithClient(<CodeOptimizerView />);

    const submitBtn = screen.getByRole('button', { name: /Optimize Code with AI/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Ollama AI service is unavailable/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Retry Optimization/i })).toBeInTheDocument();
  });

  it('allows copying optimized code to clipboard with visual feedback', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockOptimizePerformanceSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<CodeOptimizerView />);

    fireEvent.click(screen.getByRole('button', { name: /Optimize Code with AI/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copy Optimized Code/i })).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole('button', { name: /Copy Optimized Code/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(mockOptimizePerformanceSuccess.optimized_code);
      expect(screen.getByText(/Copied!/i)).toBeInTheDocument();
    });
  });

  it('allows selecting test presets and updates editor code, language, and goal', () => {
    renderWithClient(<CodeOptimizerView />);

    const jsPresetBtn = screen.getByRole('button', { name: /Array Traversal/i });
    fireEvent.click(jsPresetBtn);

    expect(screen.getByLabelText(/Select Programming Language/i)).toHaveValue('javascript');
    const textarea = screen.getByLabelText(/Optimization Code Input Editor/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('processActiveUsers');
  });
});
