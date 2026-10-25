import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import apiClient from '../../services/apiClient';
import { ApiError, type QueryParams } from '../../types/api';

export interface UseFetchQueryOptions<TData = unknown, TError = ApiError>
  extends Omit<UseQueryOptions<TData, TError, TData, QueryKey>, 'queryKey' | 'queryFn'> {
  /**
   * The TanStack query key for cache storage and invalidation.
   */
  queryKey: QueryKey;
  /**
   * The API endpoint URL to fetch.
   */
  url: string;
  /**
   * Optional query string parameters.
   */
  params?: QueryParams;
}

/**
 * Generic reusable hook for HTTP GET requests backed by TanStack Query and Axios.
 *
 * @template TData Expected response payload type.
 * @template TError Expected error type, defaults to ApiError.
 */
export function useFetchQuery<TData = unknown, TError = ApiError>(
  options: UseFetchQueryOptions<TData, TError>
): UseQueryResult<TData, TError> {
  const { queryKey, url, params, enabled, staleTime, retry, ...restOptions } = options;

  const queryOptions: UseQueryOptions<TData, TError, TData, QueryKey> = {
    queryKey,
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<TData>(url, {
        params,
        signal,
      });
      return response.data;
    },
    enabled,
    staleTime,
    ...restOptions,
  };

  if (retry !== undefined) {
    queryOptions.retry = retry;
  }

  return useQuery<TData, TError, TData, QueryKey>(queryOptions);
}

export default useFetchQuery;
