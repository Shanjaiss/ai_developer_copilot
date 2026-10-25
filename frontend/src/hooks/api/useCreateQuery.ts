import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import apiClient from '../../services/apiClient';
import { ApiError, type QueryParams } from '../../types/api';

export interface UseCreateQueryOptions<TData = unknown, TVariables = void, TError = ApiError>
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  /**
   * The destination URL or a function returning the URL based on payload.
   */
  url: string | ((variables: TVariables) => string);
  /**
   * Optional query parameters to include with the request.
   */
  params?: QueryParams;
  /**
   * Optional list of TanStack query keys to automatically invalidate on success.
   */
  invalidateQueries?: QueryKey[];
}

/**
 * Generic reusable hook for HTTP POST creation requests backed by TanStack useMutation.
 *
 * @template TData Response payload type.
 * @template TVariables Request body/variables type.
 * @template TError Error type, defaults to ApiError.
 *
 * @example
 * const { mutate, isPending } = useCreateQuery<Project, CreateProjectInput>({
 *   url: '/api/v1/projects',
 *   invalidateQueries: [['projects']],
 * });
 */
export function useCreateQuery<TData = unknown, TVariables = void, TError = ApiError>(
  options: UseCreateQueryOptions<TData, TVariables, TError>
): UseMutationResult<TData, TError, TVariables> {
  const queryClient = useQueryClient();
  const { url, params, invalidateQueries, onSuccess, retry = 0, ...restOptions } = options;

  return useMutation<TData, TError, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const endpoint = typeof url === 'function' ? url(variables) : url;
      const response = await apiClient.post<TData>(endpoint, variables, {
        params,
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

export default useCreateQuery;
