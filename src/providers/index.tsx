import type { ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { WsProvider } from './ws-provider';

/**
 * Composición única de providers de cliente para envolver la app en el layout
 * raíz. Orden intencional: Query afuera (fuente de datos), Ws adentro (el
 * realtime invalida queries, así que necesita el QueryClient ya disponible).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <WsProvider>{children}</WsProvider>
    </QueryProvider>
  );
}
