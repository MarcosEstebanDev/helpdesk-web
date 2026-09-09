import { io, type Socket } from 'socket.io-client';
import { clientEnv } from '@/lib/env';

/**
 * Abre la conexión de tiempo real contra el backend (ADR-0022).
 *
 * El token va en `auth`, que Socket.io manda en el handshake — **no** en la query
 * string. Es la misma razón que en el servidor: las URLs acaban en logs de
 * proxies y en el historial del navegador, y un access token en un log es un
 * access token filtrado.
 *
 * `transports: ['websocket']` salta el polling HTTP inicial: no aporta nada aquí
 * y multiplica las peticiones al reconectar.
 *
 * La reconexión automática queda ACTIVADA para los cortes de red, que es lo que
 * de verdad pasa (un túnel, un wifi que salta). Los cierres que decide el
 * servidor se manejan aparte, porque reintentar un `unauthorized` en bucle solo
 * genera ruido: ver `ws-provider`.
 */
export function createRealtimeSocket(token: string): Socket {
  return io(clientEnv.NEXT_PUBLIC_API_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 10_000,
  });
}

/** Mensajes que el cliente envía al servidor. */
export const CLIENT_EVENTS = {
  watch: 'ticket:watch',
  unwatch: 'ticket:unwatch',
} as const;
