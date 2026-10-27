import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { TestGeneratorView } from '../TestGeneratorView';
import { renderWithClient } from '../../../test/testUtils';
import apiClient from '../../../services/apiClient';
import { ApiError } from '../../../types/api';
import type { GenerateTestsResponse } from '../../../types/ai';

describe('TestGeneratorView Feature Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockGeneratePytestSuccess: GenerateTestsResponse = {
    summary: 'Synthesized 3 pytest unit tests covering arithmetic addition, zero inputs, and negative numbers.',
    language: 'python',
    framework: 'pytest',
    test_focus: 'comprehensive',
    generated_test_code: `import pytest

def test_add_positive_numbers():
    assert add(2, 3) == 5

def test_add_negative_numbers():
    assert add(-1, -4) == -5

def test_add_zero():
    assert add(0, 0) == 0
`,
    test_cases: [
      {
        name: 'test_add_positive_numbers',
        category: 'normal',
        description: 'Checks addition of two standard positive integers.',
        expected_behavior: 'Returns integer sum.',
      },
      {
        name: 'test_add_negative_numbers',
        category: 'edge_case',
        description: 'Checks negative number inputs.',
        expected_behavior: 'Returns negative integer sum.',
      },
      {
        name: 'test_add_zero',
        category: 'edge_case',
        description: 'Checks zero boundary inputs.',
        expected_behavior: 'Returns 0.',
      },
    ],
    coverage_notes: [
      'Normal addition execution paths verified.',
      'Negative and boundary zero values covered.',
    ],
    assumptions: [
      'The add function accepts numeric operands supporting the + operator.',
    ],
    warnings: [
      'Generated tests have not been executed or verified against the source code.',
    ],
  };

  const mockGenerateVitestSuccess: GenerateTestsResponse = {
    summary: 'Synthesized 2 vitest unit tests for typescript greet function.',
    language: 'typescript',
    framework: 'vitest',
    test_focus: 'basic',
    generated_test_code: `import { describe, it, expect } from 'vitest';
import { greet } from './greet';

describe('greet', () => {
  it('returns formatted greeting message', () => {
    expect(greet('Alice')).toBe('Hello, Alice');
  });
});
`,
    test_cases: [
      {
        name: 'greet_formatted_message',
        category: 'normal',
        description: 'Verifies string interpolation for name input.',
        expected_behavior: 'Returns greeting with name.',
      },
    ],
    coverage_notes: ['Standard string greeting formatted correctly.'],
    assumptions: ['Name parameter is a non-null string.'],
    warnings: ['Generated tests have not been executed.'],
  };

  it('renders initial state with heading, language selector, framework selector, focus options, samples, and empty state', () => {
    renderWithClient(<TestGeneratorView />);

    expect(
      screen.getByRole('heading', { level: 2, name: /Automated Behavior & Edge-Case Unit Test Generation/i })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/Programming Language/i)).toHaveValue('python');
    expect(screen.getByLabelText(/Testing Framework/i)).toHaveValue('pytest');
    expect(screen.getByLabelText(/Test Focus Selector/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Comprehensive/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText(/Source code for unit test generation/i)).toBeInTheDocument();
    expect(screen.getByText(/Ready for Unit Test Generation/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Unit Tests/i })).not.toBeDisabled();
  });

  it('allows changing language and automatically updates framework to maintain pairing compatibility', () => {
    renderWithClient(<TestGeneratorView />);

    const langSelect = screen.getByLabelText(/Programming Language/i);
    const frameworkSelect = screen.getByLabelText(/Testing Framework/i);

    // Initial is Python -> pytest
    expect(langSelect).toHaveValue('python');
    expect(frameworkSelect).toHaveValue('pytest');

    // Change to TypeScript -> vitest
    fireEvent.change(langSelect, { target: { value: 'typescript' } });
    expect(langSelect).toHaveValue('typescript');
    expect(frameworkSelect).toHaveValue('vitest');

    // Change to JavaScript -> vitest
    fireEvent.change(langSelect, { target: { value: 'javascript' } });
    expect(langSelect).toHaveValue('javascript');
    expect(frameworkSelect).toHaveValue('vitest');

    // Change back to Python -> pytest
    fireEvent.change(langSelect, { target: { value: 'python' } });
    expect(langSelect).toHaveValue('python');
    expect(frameworkSelect).toHaveValue('pytest');
  });

  it('allows selecting different test focuses', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockGeneratePytestSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<TestGeneratorView />);

    // Click Edge Cases focus
    const edgeCasesBtn = screen.getByRole('radio', { name: /Edge Cases/i });
    fireEvent.click(edgeCasesBtn);
    expect(edgeCasesBtn).toHaveAttribute('aria-checked', 'true');

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Generate Unit Tests/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/api/v1/ai/generate-tests',
        expect.objectContaining({
          test_focus: 'edge_cases',
          language: 'python',
          framework: 'pytest',
        }),
        expect.anything()
      );
    });
  });

  it('submits request and renders structured test cases, code block, coverage notes, assumptions, and warnings', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockGeneratePytestSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<TestGeneratorView />);

    const submitBtn = screen.getByRole('button', { name: /Generate Unit Tests/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/api/v1/ai/generate-tests',
        expect.objectContaining({
          code: expect.stringContaining('def add(a, b):'),
          language: 'python',
          framework: 'pytest',
          test_focus: 'comprehensive',
        }),
        expect.anything()
      );
    });

    // Check summary
    await waitFor(() => {
      expect(screen.getByText('Test Suite Generated')).toBeInTheDocument();
      expect(screen.getByText(mockGeneratePytestSuccess.summary)).toBeInTheDocument();
    });

    // Check test cases cards
    expect(screen.getByText('3 Cases Synthesized')).toBeInTheDocument();
    expect(screen.getByText('test_add_positive_numbers')).toBeInTheDocument();
    expect(screen.getByText('test_add_negative_numbers')).toBeInTheDocument();
    expect(screen.getByText('test_add_zero')).toBeInTheDocument();
    expect(screen.getByText('Checks addition of two standard positive integers.')).toBeInTheDocument();

    // Check generated test code display
    expect(screen.getByText(/def test_add_positive_numbers\(\):/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy Generated Tests/i })).toBeInTheDocument();

    // Check coverage notes & assumptions
    expect(screen.getByText('Coverage Intentions')).toBeInTheDocument();
    expect(screen.getByText('Normal addition execution paths verified.')).toBeInTheDocument();
    expect(screen.getByText('Synthesizer Assumptions')).toBeInTheDocument();
    expect(screen.getByText(/The add function accepts numeric operands/i)).toBeInTheDocument();
    expect(screen.getByText('Limitations & Caveats')).toBeInTheDocument();
  });

  it('displays loading state during generation and disables button', async () => {
    vi.spyOn(apiClient, 'post').mockImplementation(
      () => new Promise(() => {}) // Pending promise
    );

    renderWithClient(<TestGeneratorView />);

    const submitBtn = screen.getByRole('button', { name: /Generate Unit Tests/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Probing observable behavior/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generating Tests/i })).toBeDisabled();
    });
  });

  it('displays error alert and retry button when API returns error', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(
      new ApiError('Ollama service timed out after 45s.', 504)
    );

    renderWithClient(<TestGeneratorView />);

    const submitBtn = screen.getByRole('button', { name: /Generate Unit Tests/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Ollama service timed out after 45s/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Retry Generation/i })).toBeInTheDocument();
  });

  it('allows copying test code to clipboard with visual feedback', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockGenerateVitestSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<TestGeneratorView />);

    fireEvent.click(screen.getByRole('button', { name: /Generate Unit Tests/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copy Generated Tests/i })).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole('button', { name: /Copy Generated Tests/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(mockGenerateVitestSuccess.generated_test_code);
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('allows selecting test presets and updates editor code, language, and framework', () => {
    renderWithClient(<TestGeneratorView />);

    const tsPresetBtn = screen.getByRole('button', { name: /TS: greet\(\)/i });
    fireEvent.click(tsPresetBtn);

    expect(screen.getByLabelText(/Programming Language/i)).toHaveValue('typescript');
    expect(screen.getByLabelText(/Testing Framework/i)).toHaveValue('vitest');
    const textarea = screen.getByLabelText(/Source code for unit test generation/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('export function greet');
  });

  it('allows clearing editor input', () => {
    renderWithClient(<TestGeneratorView />);

    const clearBtn = screen.getByRole('button', { name: /Clear/i });
    fireEvent.click(clearBtn);

    const textarea = screen.getByLabelText(/Source code for unit test generation/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('');
    expect(screen.getByRole('button', { name: /Generate Unit Tests/i })).toBeDisabled();
  });
});
