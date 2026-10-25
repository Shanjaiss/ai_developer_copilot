import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import apiClient from '../../services/apiClient';
import { ApiError, type QueryParams } from '../../types/api';

export type UpdateHttpMethod = 'PUT' | 'PATCH';

export interface UseUpdateQueryOptions<TData = unknown, TVariables = void, TError = ApiError>
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  /**
   * The destination URL or a function returning the URL based on variables.
   */
  url: string | ((variables: TVariables) => string);
  /**
   * HTTP method to use for updating. Defaults to 'PUT'.
   */
  method?: UpdateHttpMethod;
  /**
   * Optional query parameters.
   */
  params?: QueryParams;
  /**
   * Optional query keys to invalidate on successful mutation.
   */
  invalidateQueries?: QueryKey[];
}

/**
 * Generic reusable hook for HTTP PUT / PATCH update requests backed by TanStack useMutation.
 *
 * @template TData Response payload type.
 * @template TVariables Update payload/variables type.
 * @template TError Error type, defaults to ApiError.
 *
 * @example
 * const { mutate, isPending } = useUpdateQuery<Project, UpdateProjectInput>({
 *   url: (vars) => `/api/v1/projects/${vars.id}`,
 *   method: 'PATCH',
 *   invalidateQueries: [['projects']],
 * });
 */
export function useUpdateQuery<TData = unknown, TVariables = void, TError = ApiError>(
  options: UseUpdateQueryOptions<TData, TVariables, TError>
): UseMutationResult<TData, TError, TVariables> {
  const queryClient = useQueryClient();
  const {
    url,
    method = 'PUT',
    params,
    invalidateQueries,
    onSuccess,
    retry = 0,
    ...restOptions
  } = options;

  return useMutation<TData, TError, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const endpoint = typeof url === 'function' ? url(variables) : url;
      const requestConfig = { params };

      const response =
        method === 'PATCH'
          ? await apiClient.patch<TData>(endpoint, variables, requestConfig)
          : await apiClient.put<TData>(endpoint, variables, requestConfig);

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

export default useUpdateQuery;
