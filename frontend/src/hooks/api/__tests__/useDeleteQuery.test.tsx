import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDeleteQuery } from '../useDeleteQuery';
import { createQueryWrapper, createTestQueryClient } from '../../../test/testUtils';
import apiClient from '../../../services/apiClient';

describe('useDeleteQuery Generic Hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('performs DELETE request and invalidates target queries', async () => {
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValueOnce({
      data: { success: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () =>
        useDeleteQuery<{ success: boolean }, string>({
          url: (id) => `/api/v1/projects/${id}`,
          invalidateQueries: [['projects']],
        }),
      { wrapper: createQueryWrapper(queryClient) }
    );

    act(() => {
      result.current.mutate('proj-delete-123');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(deleteSpy).toHaveBeenCalledWith('/api/v1/projects/proj-delete-123', {
      params: undefined,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'] });
  });

  it('supports query parameters on DELETE operations', async () => {
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValueOnce({
      data: { deleted: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () =>
        useDeleteQuery<unknown, { id: string; hard: boolean }>({
          url: (v) => `/api/v1/projects/${v.id}`,
          params: (v) => ({ hard: v.hard }),
        }),
      { wrapper: createQueryWrapper(queryClient) }
    );

    await act(async () => {
      await result.current.mutateAsync({ id: 'p-1', hard: true });
    });

    expect(deleteSpy).toHaveBeenCalledWith('/api/v1/projects/p-1', {
      params: { hard: true },
    });
  });
});
