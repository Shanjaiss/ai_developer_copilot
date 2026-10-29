import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { AIChatView } from '../AIChatView';
import { renderWithClient } from '../../../test/testUtils';
import apiClient from '../../../services/apiClient';
import { ApiError } from '../../../types/api';
import type { ChatResponse } from '../../../types/ai';

describe('AIChatView Feature Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockChatSuccess: ChatResponse = {
    reply: 'Decorators wrap functions to extend their behavior without modifying source code.',
    model: 'qwen2.5-coder:1.5b',
    context_used: false,
    warnings: [],
  };

  const mockMultiTurnSuccess: ChatResponse = {
    reply: 'Here is the line-by-line breakdown of the decorator function.',
    model: 'qwen2.5-coder:1.5b',
    context_used: true,
    warnings: [],
  };

  it('renders initial empty state with hero heading, model tag, input dock, and prompt suggestions', () => {
    renderWithClient(<AIChatView />);

    expect(
      screen.getByRole('heading', { level: 2, name: /Conversational Coding Assistant & Pair Programmer/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/0 Messages/i)).toBeInTheDocument();
    expect(screen.getByText(/Model: qwen2.5-coder:1.5b/i)).toBeInTheDocument();
    expect(screen.getByText(/Antigravity Conversational Coding Assistant/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Chat message input/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send message to AI assistant/i })).toBeDisabled();
    expect(screen.getByText(/Explain Python decorators with a simple example/i)).toBeInTheDocument();
  });

  it('submits a user message and renders AI response', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockChatSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<AIChatView />);

    const textarea = screen.getByLabelText(/Chat message input/i);
    fireEvent.change(textarea, { target: { value: 'Explain Python decorators.' } });

    const sendBtn = screen.getByRole('button', { name: /Send message to AI assistant/i });
    expect(sendBtn).not.toBeDisabled();
    fireEvent.click(sendBtn);

    // Verify user message appears in stream
    expect(screen.getByText('Explain Python decorators.')).toBeInTheDocument();

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/api/v1/ai/chat',
        expect.objectContaining({
          message: 'Explain Python decorators.',
          conversation: [],
        }),
        expect.anything()
      );
    });

    // Verify AI reply appears in stream
    await waitFor(() => {
      expect(screen.getByText(/Decorators wrap functions to extend their behavior/i)).toBeInTheDocument();
      expect(screen.getByText(/2 Messages/i)).toBeInTheDocument();
    });
  });

  it('maintains multi-turn conversation history in request payload', async () => {
    const postSpy = vi.spyOn(apiClient, 'post')
      .mockResolvedValueOnce({
        data: mockChatSuccess,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      })
      .mockResolvedValueOnce({
        data: mockMultiTurnSuccess,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

    renderWithClient(<AIChatView />);

    const textarea = screen.getByLabelText(/Chat message input/i);
    const sendBtn = screen.getByRole('button', { name: /Send message to AI assistant/i });

    // Turn 1
    fireEvent.change(textarea, { target: { value: 'What is a decorator?' } });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText(mockChatSuccess.reply)).toBeInTheDocument();
    });

    // Turn 2: Follow up
    fireEvent.change(textarea, { target: { value: 'Now explain each line.' } });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenLastCalledWith(
        '/api/v1/ai/chat',
        expect.objectContaining({
          message: 'Now explain each line.',
          conversation: [
            { role: 'user', content: 'What is a decorator?' },
            { role: 'assistant', content: mockChatSuccess.reply },
          ],
        }),
        expect.anything()
      );
    });

    await waitFor(() => {
      expect(screen.getByText(mockMultiTurnSuccess.reply)).toBeInTheDocument();
      expect(screen.getByText(/4 Messages/i)).toBeInTheDocument();
    });
  });

  it('submits optional code context and language', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockChatSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<AIChatView />);

    // Expand code context drawer
    const contextToggle = screen.getByLabelText(/Toggle Code Context Panel/i);
    fireEvent.click(contextToggle);

    // Enter code context
    const codeArea = screen.getByLabelText(/Code context snippet/i);
    fireEvent.change(codeArea, { target: { value: 'def add(a, b):\n    return a + b' } });

    // Change language
    const langSelect = screen.getByLabelText(/Code Context Language/i);
    fireEvent.change(langSelect, { target: { value: 'typescript' } });

    // Enter message and submit
    const textarea = screen.getByLabelText(/Chat message input/i);
    fireEvent.change(textarea, { target: { value: 'How to write tests for this?' } });

    const sendBtn = screen.getByRole('button', { name: /Send message to AI assistant/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/api/v1/ai/chat',
        expect.objectContaining({
          message: 'How to write tests for this?',
          language: 'typescript',
          code_context: 'def add(a, b):\n    return a + b',
        }),
        expect.anything()
      );
    });
  });

  it('displays loading state and prevents duplicate submissions while request is pending', async () => {
    vi.spyOn(apiClient, 'post').mockImplementation(
      () => new Promise(() => {}) // Pending promise
    );

    renderWithClient(<AIChatView />);

    const textarea = screen.getByLabelText(/Chat message input/i);
    fireEvent.change(textarea, { target: { value: 'Tell me a story.' } });

    const sendBtn = screen.getByRole('button', { name: /Send message to AI assistant/i });
    fireEvent.click(sendBtn);

    // Verify thinking indicator is displayed
    await waitFor(() => {
      expect(screen.getByText(/Synthesizing response with qwen2.5-coder:1.5b.../i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Send message to AI assistant/i })).toBeDisabled();
    });
  });

  it('displays error message and enables retry on request failure', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(
      new ApiError('Ollama service timed out after 60s.', 504)
    );

    renderWithClient(<AIChatView />);

    const textarea = screen.getByLabelText(/Chat message input/i);
    fireEvent.change(textarea, { target: { value: 'Heavy analysis query' } });

    const sendBtn = screen.getByRole('button', { name: /Send message to AI assistant/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Ollama service timed out after 60s/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });
  });

  it('allows copying AI message to clipboard with visual feedback', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockChatSuccess,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<AIChatView />);

    const textarea = screen.getByLabelText(/Chat message input/i);
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: /Send message to AI assistant/i }));

    await waitFor(() => {
      expect(screen.getByText(mockChatSuccess.reply)).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole('button', { name: /Copy/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(mockChatSuccess.reply);
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('clears active dialogue and ignores late in-flight responses when starting new conversation', async () => {
    let resolvePromise: (val: any) => void;
    const delayedPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.spyOn(apiClient, 'post').mockReturnValueOnce(delayedPromise as any);

    renderWithClient(<AIChatView />);

    const textarea = screen.getByLabelText(/Chat message input/i);
    fireEvent.change(textarea, { target: { value: 'Question for old session' } });
    fireEvent.click(screen.getByRole('button', { name: /Send message to AI assistant/i }));

    // User message is visible
    expect(screen.getByText('Question for old session')).toBeInTheDocument();

    // Click New Conversation while request is still in flight
    const newChatBtn = screen.getByRole('button', { name: /New Conversation/i });
    fireEvent.click(newChatBtn);

    // Messages are cleared
    expect(screen.queryByText('Question for old session')).not.toBeInTheDocument();
    expect(screen.getByText(/0 Messages/i)).toBeInTheDocument();

    // Now resolve the in-flight request
    resolvePromise!({
      data: { reply: 'Late reply from old session', model: 'qwen2.5-coder:1.5b', context_used: false, warnings: [] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    // In-flight isolation: Late reply must NOT appear in the newly reset conversation
    await waitFor(() => {
      expect(screen.queryByText('Late reply from old session')).not.toBeInTheDocument();
    });
  });

  it('renders context truncation warnings when returned by API', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        reply: 'Response with truncated context.',
        model: 'qwen2.5-coder:1.5b',
        context_used: true,
        warnings: ['Conversation history exceeded context budget. Older messages were truncated.'],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithClient(<AIChatView />);

    const textarea = screen.getByLabelText(/Chat message input/i);
    fireEvent.change(textarea, { target: { value: 'Continue conversation' } });
    fireEvent.click(screen.getByRole('button', { name: /Send message to AI assistant/i }));

    await waitFor(() => {
      expect(screen.getByText(/Conversation history exceeded context budget/i)).toBeInTheDocument();
    });
  });
});
