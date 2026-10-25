import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from './queryClient';

export interface QueryProviderProps {
  children: ReactNode;
  /**
   * Optional custom QueryClient instance, useful for isolated testing.
   */
  client?: QueryClient;
}

/**
 * Application-wide React Query Provider.
 */
export function QueryProvider({ children, client }: QueryProviderProps) {
  // Use state to ensure the client is created only once per component lifecycle when not provided
  const [queryClient] = useState(() => client ?? createQueryClient());

  return (
    <QueryClientProvider client={client ?? queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export default QueryProvider;
