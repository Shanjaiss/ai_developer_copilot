import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

/**
 * Creates an isolated QueryClient instance optimized for unit testing.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function createQueryWrapper(queryClient: QueryClient = createTestQueryClient()) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

export function renderWithClient(
  ui: ReactElement,
  client: QueryClient = createTestQueryClient(),
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const Wrapper = createQueryWrapper(client);
  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient: client,
  };
}
