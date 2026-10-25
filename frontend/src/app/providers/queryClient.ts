import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a configured QueryClient with production defaults.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 30, // 30 seconds
        gcTime: 1000 * 60 * 5, // 5 minutes
        retry: (failureCount, error) => {
          // Do not retry 4xx client errors (unauthorized, not found, forbidden)
          if (typeof error === 'object' && error !== null && 'status' in error) {
            const status = (error as { status?: number }).status;
            if (status && status >= 400 && status < 500) {
              return false;
            }
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Enforce: mutation hooks do not automatically retry unsafe writes
        retry: 0,
      },
    },
  });
}
