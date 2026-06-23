'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { makeQueryClient } from '@/lib/query/query-client';

/**
 * Provee TanStack Query al árbol de cliente. `useState(makeQueryClient)` crea
 * un único cliente por montaje en el browser (no se recrea en cada render);
 * en server cada request monta de nuevo, evitando filtrar caché entre usuarios.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  );
}
