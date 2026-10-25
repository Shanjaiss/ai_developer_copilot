import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useUpdateQuery } from '../useUpdateQuery';
import { createQueryWrapper, createTestQueryClient } from '../../../test/testUtils';
import apiClient from '../../../services/apiClient';

describe('useUpdateQuery Generic Hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('performs PUT request by default and updates query cache', async () => {
    const mockUpdated = { id: 'proj-1', name: 'Updated Name', version: 2 };
    const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValueOnce({
      data: mockUpdated,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () =>
        useUpdateQuery<{ id: string; name: string; version: number }, { id: string; name: string }>({
          url: (v) => `/api/v1/projects/${v.id}`,
          invalidateQueries: [['projects', 'proj-1']],
        }),
      { wrapper: createQueryWrapper(queryClient) }
    );

    act(() => {
      result.current.mutate({ id: 'proj-1', name: 'Updated Name' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(putSpy).toHaveBeenCalledWith(
      '/api/v1/projects/proj-1',
      { id: 'proj-1', name: 'Updated Name' },
      { params: undefined }
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects', 'proj-1'] });
  });

  it('performs PATCH request when method is specified as PATCH', async () => {
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      data: { id: 'proj-1', status: 'archived' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () =>
        useUpdateQuery<unknown, { status: string }>({
          url: '/api/v1/projects/proj-1',
          method: 'PATCH',
        }),
      { wrapper: createQueryWrapper(queryClient) }
    );

    await act(async () => {
      await result.current.mutateAsync({ status: 'archived' });
    });

    expect(patchSpy).toHaveBeenCalledWith(
      '/api/v1/projects/proj-1',
      { status: 'archived' },
      { params: undefined }
    );
  });
});
