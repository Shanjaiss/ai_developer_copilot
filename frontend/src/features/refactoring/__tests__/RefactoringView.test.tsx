import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { RefactoringView } from '../RefactoringView';
import { renderWithClient } from '../../../test/testUtils';
import apiClient from '../../../services/apiClient';
import { ApiError } from '../../../types/api';
import type {
  RepositoryListResponse,
  RefactorResponse,
} from '../../../types';

describe('RefactoringView Feature Integration', () => {
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

  const mockPastedRefactorSuccess: RefactorResponse = {
    summary: 'Extracted discount rules into a pure helper function to improve maintainability.',
    language: 'python',
    mode: 'pasted_code',
    code_smells: [
      {
        type: 'excessive_nesting',
        title: 'Deeply nested conditional block',
        description: 'Nesting depth of 4 reduces readability.',
        severity: 'medium',
        line: 4,
        evidence: ['if customer.is_vip: if total > 500:'],
      },
    ],
    refactorings: [
      {
        title: 'Extract calculate_vip_discount helper',
        reason: 'Separates discount rate rules from order orchestration.',
        original_code: 'if customer.is_vip:\n    if total > 500:\n        total *= 0.85',
        refactored_code: 'total = apply_discount(customer, total)',
        diff: '--- original\n+++ refactored\n-if customer.is_vip:\n-    if total > 500:\n-        total *= 0.85\n+total = apply_discount(customer, total)',
        benefits: ['Single responsibility', 'Unit testable discount calculation'],
        risks: ['Verify float rounding behavior'],
        verification_steps: ['Test with VIP and non-VIP customer orders'],
      },
    ],
    cross_file_impacts: [],
    references: [
      {
        path: 'pasted_code',
        start_line: 1,
        end_line: 10,
        snippet: 'def calculate_invoice_total(): ...',
        reason: 'User-provided source code snippet',
      },
    ],
    warnings: [
      'Refactoring suggestions are advisory. Never automatically apply AI-suggested code without manual review and regression testing.',
    ],
    model: 'qwen2.5-coder:1.5b',
    repository_id: null,
    file_path: null,
  };

  const mockRepoRefactorSuccess: RefactorResponse = {
    summary: 'Modularized billing calculation in repository file.',
    language: 'python',
    mode: 'repository_file',
    code_smells: [],
    refactorings: [
      {
        title: 'Extract Tax Calculation',
        reason: 'Isolates tax calculation rules.',
        original_code: 'tax = amount * 0.1',
        refactored_code: 'tax = compute_tax(amount)',
        diff: '--- original\n+++ refactored\n-tax = amount * 0.1\n+tax = compute_tax(amount)',
        benefits: ['Clean domain separation'],
        risks: ['Ensure tax rates are injected correctly'],
        verification_steps: ['Run billing unit tests'],
      },
    ],
    cross_file_impacts: [
      {
        file_path: 'backend/app/routers/checkout.py',
        impact_type: 'caller',
        description: "File 'backend/app/routers/checkout.py' imports this module. Verify callers if signatures change.",
      },
    ],
    references: [
      {
        path: 'backend/app/billing.py',
        start_line: 1,
        end_line: 25,
        snippet: 'def compute_bill(): ...',
        reason: 'Targeted repository source file for refactoring',
      },
    ],
    warnings: [
      'Refactoring suggestions are advisory. Never automatically apply AI-suggested code without manual review and regression testing.',
    ],
    model: 'qwen2.5-coder:1.5b',
    repository_id: 'sample_repo',
    file_path: 'backend/app/billing.py',
  };

  it('renders initial state with heading, mode switcher, code textarea, presets, and language select', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoList,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<RefactoringView />);

    expect(screen.getByRole('heading', { level: 2, name: /AI Code Refactoring Assistant/i })).toBeInTheDocument();
    expect(screen.getByTestId('mode-pasted-btn')).toBeInTheDocument();
    expect(screen.getByTestId('mode-repo-btn')).toBeInTheDocument();
    expect(screen.getByTestId('refactor-code-input')).toBeInTheDocument();
    expect(screen.getByTestId('refactor-language-select')).toBeInTheDocument();
    expect(screen.getByTestId('refactor-goal-input')).toBeInTheDocument();
    expect(screen.getByTestId('refactor-submit-btn')).toBeInTheDocument();
    expect(screen.getByTestId('refactor-clear-btn')).toBeInTheDocument();

    // Verify presets exist
    expect(screen.getByRole('button', { name: /Python: Nested Discount/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /JS: Nested Ternary/i })).toBeInTheDocument();
  });

  it('allows switching to repository file mode and renders repository + file inputs', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoList,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<RefactoringView />);

    const repoModeBtn = screen.getByTestId('mode-repo-btn');
    fireEvent.click(repoModeBtn);

    expect(screen.getByTestId('refactor-repo-select')).toBeInTheDocument();
    expect(screen.getByTestId('refactor-file-path-input')).toBeInTheDocument();
    expect(screen.getByTestId('refactor-code-range-input')).toBeInTheDocument();
    expect(screen.queryByTestId('refactor-code-input')).not.toBeInTheDocument();
  });

  it('applies quick sample preset in pasted code mode', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoList,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<RefactoringView />);

    const presetBtn = screen.getByRole('button', { name: /Python: Nested Discount/i });
    fireEvent.click(presetBtn);

    const codeInput = screen.getByTestId('refactor-code-input') as HTMLTextAreaElement;
    expect(codeInput.value).toContain('def calculate_invoice_total');

    const goalInput = screen.getByTestId('refactor-goal-input') as HTMLInputElement;
    expect(goalInput.value).toContain('Extract discount rules');
  });

  it('submits refactor request in pasted mode and renders summary, code smells, and diff', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoList,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockPastedRefactorSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<RefactoringView />);

    fireEvent.change(screen.getByTestId('refactor-code-input'), {
      target: { value: 'def checkout(): pass' },
    });
    fireEvent.click(screen.getByTestId('refactor-submit-btn'));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/api/v1/ai/refactor',
        expect.objectContaining({
          code: 'def checkout(): pass',
          language: 'python',
        }),
        expect.anything()
      );
    });

    // Check summary & mode pill
    await waitFor(() => {
      expect(screen.getByText('Pasted Code Refactor')).toBeInTheDocument();
      expect(screen.getAllByText(/Extracted discount rules into a pure helper/i).length).toBeGreaterThan(0);
    });

    // Check code smell
    expect(screen.getByText('Deeply nested conditional block')).toBeInTheDocument();
    expect(screen.getByText('Medium Severity')).toBeInTheDocument();

    // Check refactoring proposal & diff
    expect(screen.getByText(/1\. Extract calculate_vip_discount helper/i)).toBeInTheDocument();
    expect(screen.getByTestId('diff-container-0')).toBeInTheDocument();
    expect(screen.getByText(/Single responsibility/i)).toBeInTheDocument();
  });

  it('switches diff tabs between Unified Diff, Proposed Code, and Original Code', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoList,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockPastedRefactorSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<RefactoringView />);

    fireEvent.change(screen.getByTestId('refactor-code-input'), {
      target: { value: 'def checkout(): pass' },
    });
    fireEvent.click(screen.getByTestId('refactor-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('diff-container-0')).toBeInTheDocument();
    });

    // Click Proposed Code tab
    const proposedBtn = screen.getByTestId('tab-proposed-btn-0');
    fireEvent.click(proposedBtn);
    expect(screen.getByTestId('proposed-code-pre-0')).toBeInTheDocument();
    expect(screen.getByText(/total = apply_discount\(customer, total\)/i)).toBeInTheDocument();

    // Click Original Code tab
    const originalBtn = screen.getByTestId('tab-original-btn-0');
    fireEvent.click(originalBtn);
    expect(screen.getByTestId('original-code-pre-0')).toBeInTheDocument();
  });

  it('allows copying proposed code to clipboard', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoList,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockPastedRefactorSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    renderWithClient(<RefactoringView />);

    fireEvent.change(screen.getByTestId('refactor-code-input'), {
      target: { value: 'def checkout(): pass' },
    });
    fireEvent.click(screen.getByTestId('refactor-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('copy-refactored-btn-0')).toBeInTheDocument();
    });

    const copyBtn = screen.getByTestId('copy-refactored-btn-0');
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(mockPastedRefactorSuccess.refactorings[0].refactored_code);
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('renders repository file refactor results with cross-file impact card', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoList,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockRepoRefactorSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<RefactoringView />);

    fireEvent.click(screen.getByTestId('mode-repo-btn'));

    await waitFor(() => {
      expect(screen.getByText(/Sample Repository/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('refactor-repo-select'), { target: { value: 'sample_repo' } });
    fireEvent.change(screen.getByTestId('refactor-file-path-input'), { target: { value: 'backend/app/billing.py' } });

    await waitFor(() => {
      expect(screen.getByTestId('refactor-submit-btn')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId('refactor-submit-btn'));

    await waitFor(() => {
      expect(screen.getByText('Repository File Refactor')).toBeInTheDocument();
      expect(screen.getByText(/📁 sample_repo: backend\/app\/billing\.py/i)).toBeInTheDocument();
    });

    // Check cross file impact card
    expect(screen.getByText(/Repository Cross-File Impact Analysis/i)).toBeInTheDocument();
    expect(screen.getByText('backend/app/routers/checkout.py')).toBeInTheDocument();
  });

  it('submits follow-up clarification question and updates dialogue', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoList,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const postSpy = vi.spyOn(apiClient, 'post')
      .mockResolvedValueOnce({
        data: mockPastedRefactorSuccess,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      })
      .mockResolvedValueOnce({
        data: {
          ...mockPastedRefactorSuccess,
          summary: 'To test this helper, pass customer mock with is_vip=True and verify rate applied.',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

    renderWithClient(<RefactoringView />);

    fireEvent.change(screen.getByTestId('refactor-code-input'), {
      target: { value: 'def checkout(): pass' },
    });
    fireEvent.click(screen.getByTestId('refactor-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('refactor-followup-input')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('refactor-followup-input'), {
      target: { value: 'How should I test this helper?' },
    });
    fireEvent.click(screen.getByTestId('refactor-followup-submit'));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText('How should I test this helper?')).toBeInTheDocument();
      expect(screen.getAllByText(/To test this helper, pass customer mock/i).length).toBeGreaterThan(0);
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
      data: mockPastedRefactorSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<RefactoringView />);

    const codeInput = screen.getByTestId('refactor-code-input') as HTMLTextAreaElement;
    fireEvent.change(codeInput, { target: { value: 'def foo(): pass' } });
    fireEvent.click(screen.getByTestId('refactor-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('refactor-results-section')).toBeInTheDocument();
    });

    const clearBtn = screen.getByTestId('refactor-clear-btn');
    fireEvent.click(clearBtn);

    expect(codeInput.value).toBe('');
    expect(screen.queryByTestId('refactor-results-section')).not.toBeInTheDocument();
  });

  it('handles refactoring API error with retry banner', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRepoList,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(
      new ApiError('Ollama service timed out', 504)
    );

    renderWithClient(<RefactoringView />);

    fireEvent.change(screen.getByTestId('refactor-code-input'), { target: { value: 'def foo(): pass' } });
    fireEvent.click(screen.getByTestId('refactor-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('refactor-error-banner')).toBeInTheDocument();
      expect(screen.getByText(/Ollama service timed out/i)).toBeInTheDocument();
    });
  });
});
