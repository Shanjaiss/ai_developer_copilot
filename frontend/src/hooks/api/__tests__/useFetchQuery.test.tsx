import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFetchQuery } from '../useFetchQuery';
import { createQueryWrapper, createTestQueryClient } from '../../../test/testUtils';
import apiClient from '../../../services/apiClient';
import { ApiError } from '../../../types/api';

describe('useFetchQuery Generic Hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches data successfully and updates query cache', async () => {
    const mockHealth = {
      status: 'healthy',
      service: 'ai-developer-copilot-backend',
      environment: 'development',
      version: '0.1.0',
      timestamp: '2026-10-25T14:30:00Z',
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockHealth,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () =>
        useFetchQuery({
          queryKey: ['health'],
          url: '/health',
        }),
      { wrapper: createQueryWrapper(queryClient) }
    );

    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockHealth);
    expect(getSpy).toHaveBeenCalledWith(
      '/health',
      expect.objectContaining({
        params: undefined,
        signal: expect.any(AbortSignal),
      })
    );

    // Verify Query cache contains the fetched data
    const cachedData = queryClient.getQueryData(['health']);
    expect(cachedData).toEqual(mockHealth);
  });

  it('passes query parameters properly', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: { results: [] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () =>
        useFetchQuery({
          queryKey: ['projects', { page: 1, limit: 10 }],
          url: '/api/v1/projects',
          params: { page: 1, limit: 10 },
        }),
      { wrapper: createQueryWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getSpy).toHaveBeenCalledWith(
      '/api/v1/projects',
      expect.objectContaining({
        params: { page: 1, limit: 10 },
      })
    );
  });

  it('handles error states and populates typed error', async () => {
    const testError = new ApiError('Service Unavailable', 503, 'SERVICE_DOWN');
    vi.spyOn(apiClient, 'get').mockRejectedValueOnce(testError);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () =>
        useFetchQuery({
          queryKey: ['error-test'],
          url: '/error-endpoint',
          retry: false,
        }),
      { wrapper: createQueryWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.message).toBe('Service Unavailable');
    expect(result.current.error?.status).toBe(503);
  });

  it('supports manual refetch', async () => {
    let callCount = 0;
    vi.spyOn(apiClient, 'get').mockImplementation(async () => {
      callCount += 1;
      return {
        data: { count: callCount },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
    });

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () =>
        useFetchQuery({
          queryKey: ['counter'],
          url: '/counter',
        }),
      { wrapper: createQueryWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ count: 1 });

    await result.current.refetch();
    await waitFor(() => expect(result.current.data).toEqual({ count: 2 }));
  });

  it('passes AbortSignal to enable request cancellation', async () => {
    let receivedSignal: any;
    vi.spyOn(apiClient, 'get').mockImplementation(async (_, config) => {
      receivedSignal = config?.signal;
      return new Promise(() => {}); // never resolves to simulate in-flight request
    });

    const queryClient = createTestQueryClient();
    const { unmount } = renderHook(
      () =>
        useFetchQuery({
          queryKey: ['cancellation-test'],
          url: '/long-running',
        }),
      { wrapper: createQueryWrapper(queryClient) }
    );

    expect(receivedSignal).toBeDefined();
    expect(receivedSignal?.aborted).toBe(false);

    // Unmount hook while request is pending
    unmount();

    // TanStack Query aborts the signal when query is unmounted/cancelled
    expect(receivedSignal?.aborted).toBe(true);
  });
});
