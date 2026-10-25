import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCreateQuery } from '../useCreateQuery';
import { createQueryWrapper, createTestQueryClient } from '../../../test/testUtils';
import apiClient from '../../../services/apiClient';
import { ApiError } from '../../../types/api';

describe('useCreateQuery Generic Hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('performs POST request and invalidates target queries on success', async () => {
    const mockCreated = { id: 'proj-123', name: 'AI Copilot' };
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockCreated,
      status: 201,
      statusText: 'Created',
      headers: {},
      config: {} as any,
    });

    const queryClient = createTestQueryClient();
    // Populate cache with items to verify invalidation
    queryClient.setQueryData(['projects'], [{ id: 'proj-old' }]);
    queryClient.setQueryData(['unrelated'], { keepMe: true });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const onSuccessSpy = vi.fn();
    const { result } = renderHook(
      () =>
        useCreateQuery<{ id: string; name: string }, { name: string }>({
          url: '/api/v1/projects',
          invalidateQueries: [['projects']],
          onSuccess: onSuccessSpy,
        }),
      { wrapper: createQueryWrapper(queryClient) }
    );

    expect(result.current.isPending).toBe(false);

    act(() => {
      result.current.mutate({ name: 'AI Copilot' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(postSpy).toHaveBeenCalledWith('/api/v1/projects', { name: 'AI Copilot' }, { params: undefined });
    expect(result.current.data).toEqual(mockCreated);
    expect(onSuccessSpy).toHaveBeenCalledWith(mockCreated, { name: 'AI Copilot' }, undefined, expect.anything());

    // Verified: target query invalidated
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'] });
    // Verified: unrelated query NOT invalidated
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['unrelated'] });
  });

  it('supports dynamic URL function based on payload', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: { success: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () =>
        useCreateQuery<{ success: boolean }, { projectId: string; task: string }>({
          url: (vars) => `/api/v1/projects/${vars.projectId}/tasks`,
        }),
      { wrapper: createQueryWrapper(queryClient) }
    );

    await act(async () => {
      await result.current.mutateAsync({ projectId: 'p-99', task: 'Index codebase' });
    });

    expect(postSpy).toHaveBeenCalledWith(
      '/api/v1/projects/p-99/tasks',
      { projectId: 'p-99', task: 'Index codebase' },
      { params: undefined }
    );
  });

  it('handles mutation errors and does not automatically retry unsafe writes', async () => {
    const error = new ApiError('Conflict: Project already exists', 409);
    const postSpy = vi.spyOn(apiClient, 'post').mockRejectedValue(error);

    const onErrorSpy = vi.fn();
    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () =>
        useCreateQuery({
          url: '/api/v1/projects',
          onError: onErrorSpy,
        }),
      { wrapper: createQueryWrapper(queryClient) }
    );

    act(() => {
      result.current.mutate({ name: 'Duplicate' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Ensure unsafe write was called only once (no auto retries)
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(result.current.error?.message).toBe('Conflict: Project already exists');
    expect(onErrorSpy).toHaveBeenCalled();
  });
});
