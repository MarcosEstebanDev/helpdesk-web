import type { ReactNode } from 'react';
import { SessionProvider } from '@/features/auth/session';
import { QueryProvider } from './query-provider';
import { WsProvider } from './ws-provider';

/**
 * Providers de cliente que envuelven la app en el layout raíz.
 *
 * El orden no es decorativo:
 * - **Query** afuera: es la fuente de datos, y tanto la sesión como el realtime
 *   necesitan el `QueryClient` ya disponible.
 * - **Session** en medio: es quien pone el access token en el store al arrancar.
 * - **Ws** adentro: se conecta cuando aparece ese token e invalida queries, así
 *   que necesita a los dos anteriores montados.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <SessionProvider>
        <WsProvider>{children}</WsProvider>
      </SessionProvider>
    </QueryProvider>
  );
}
