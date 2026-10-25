import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import apiClient from '../../services/apiClient';
import { ApiError, type QueryParams } from '../../types/api';

export interface UseDeleteQueryOptions<TData = unknown, TVariables = void, TError = ApiError>
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  /**
   * The destination URL or a function returning the URL based on variables.
   */
  url: string | ((variables: TVariables) => string);
  /**
   * Optional query parameters or function returning parameters.
   */
  params?: QueryParams | ((variables: TVariables) => QueryParams);
  /**
   * Optional query keys to invalidate on successful deletion.
   */
  invalidateQueries?: QueryKey[];
}

/**
 * Generic reusable hook for HTTP DELETE requests backed by TanStack useMutation.
 *
 * @template TData Response payload type (often void or { success: boolean }).
 * @template TVariables Target identifier or deletion payload.
 * @template TError Error type, defaults to ApiError.
 *
 * @example
 * const { mutate: deleteProject, isPending } = useDeleteQuery<void, string>({
 *   url: (id) => `/api/v1/projects/${id}`,
 *   invalidateQueries: [['projects']],
 * });
 */
export function useDeleteQuery<TData = unknown, TVariables = void, TError = ApiError>(
  options: UseDeleteQueryOptions<TData, TVariables, TError>
): UseMutationResult<TData, TError, TVariables> {
  const queryClient = useQueryClient();
  const { url, params, invalidateQueries, onSuccess, retry = 0, ...restOptions } = options;

  return useMutation<TData, TError, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const endpoint = typeof url === 'function' ? url(variables) : url;
      const resolvedParams = typeof params === 'function' ? params(variables) : params;

      const response = await apiClient.delete<TData>(endpoint, {
        params: resolvedParams,
      });
      return response.data;
    },
    retry,
    onSuccess: async (...args) => {
      if (invalidateQueries && invalidateQueries.length > 0) {
        await Promise.all(
          invalidateQueries.map((key) => queryClient.invalidateQueries({ queryKey: key }))
        );
      }
      if (onSuccess) {
        await (onSuccess as (...a: typeof args) => unknown)(...args);
      }
    },
    ...restOptions,
  });
}

export default useDeleteQuery;
