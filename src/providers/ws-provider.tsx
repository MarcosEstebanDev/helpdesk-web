'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Placeholder del provider de WebSocket (realtime — Fase 7).
 *
 * El backend expone Socket.io con rooms por tenant; acá vivirá la conexión
 * autenticada y el contexto para suscribirse a eventos (ticket actualizado,
 * SLA breach, etc.) e invalidar queries de TanStack Query en consecuencia.
 * Por ahora es un no-op: fija la forma del árbol de providers sin acoplar
 * todavía la dependencia de socket.io-client.
 */
type WsContextValue = {
  connected: boolean;
};

const WsContext = createContext<WsContextValue>({ connected: false });

export function WsProvider({ children }: { children: ReactNode }) {
  // TODO(Fase 7): conectar socket.io-client con el access token y exponer
  // helpers de suscripción por tenant.
  return (
    <WsContext.Provider value={{ connected: false }}>
      {children}
    </WsContext.Provider>
  );
}

export function useWs(): WsContextValue {
  return useContext(WsContext);
}
