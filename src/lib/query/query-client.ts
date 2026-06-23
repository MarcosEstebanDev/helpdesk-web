import { QueryClient } from '@tanstack/react-query';

/**
 * Factory de QueryClient. En SSR queremos un cliente nuevo por request (no
 * compartir caché entre usuarios); en el browser, uno solo reutilizado.
 * El ensamblado de esa estrategia vive en query-provider.tsx.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Evita un refetch inmediato apenas se hidrata lo render izado en server.
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  });
}
