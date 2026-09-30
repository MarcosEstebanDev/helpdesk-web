import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SessionProvider } from '@/features/auth/session';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';
import { WsProvider } from './ws-provider';

/**
 * Providers de cliente que envuelven la app en el layout raíz.
 *
 * El orden no es decorativo:
 * - **Theme** del todo afuera: no depende de nada y decide cómo se ve el resto,
 *   incluidas las capas en portal (avisos y tooltips) que se montan fuera del
 *   árbol del DOM pero dentro del árbol de React.
 * - **Tooltip** y **Toast**: capas de presentación, disponibles en toda la app.
 * - **Query** después: es la fuente de datos, y tanto la sesión como el
 *   realtime necesitan el `QueryClient` ya disponible.
 * - **Session** en medio: es quien pone el access token en el store al arrancar.
 * - **Ws** adentro: se conecta cuando aparece ese token e invalida queries, así
 *   que necesita a los dos anteriores montados.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <ToastProvider>
          <QueryProvider>
            <SessionProvider>
              <WsProvider>{children}</WsProvider>
            </SessionProvider>
          </QueryProvider>
        </ToastProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
