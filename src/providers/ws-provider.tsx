'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Socket } from 'socket.io-client';
import { refreshAccessToken } from '@/lib/api/refresh';
import { ticketKeys } from '@/lib/query/keys';
import type {
  CommentAddedMessage,
  DisconnectedMessage,
  SlaBreachedMessage,
  TicketAssignmentMessage,
  TicketCreatedMessage,
  TicketStatusChangedMessage,
} from '@/lib/realtime/events';
import { CLIENT_EVENTS, createRealtimeSocket } from '@/lib/realtime/socket';
import { useAuthStore } from '@/stores/auth-store';

/** Cuánto se considera "recién cambiado" a un ticket, en milisegundos. */
const VENTANA_DE_CAMBIO = 10_000;

type WsContextValue = {
  connected: boolean;
  /**
   * Sigue un ticket mientras el componente lo necesite. Devuelve la función para
   * dejar de seguirlo; usar `useTicketWatch` en vez de llamar a esto a mano.
   */
  watchTicket: (ticketId: string) => () => void;
  /**
   * Qué tickets acaban de cambiar por un aviso del servidor, con el instante en
   * que llegó. Es lo único que se toma del payload además del id, y no sustituye
   * a la invalidación: los datos siguen viniendo de la API.
   */
  cambiosRecientes: Record<string, number>;
};

const WsContext = createContext<WsContextValue>({
  connected: false,
  watchTicket: () => () => {},
  cambiosRecientes: {},
});

/**
 * Conexión de tiempo real con el backend (ADR-0022 / ADR-0023).
 *
 * **Lo que llega por el socket no se pinta: invalida caché.** Los mensajes traen
 * lo justo para saber QUÉ cambió (y `comment.added` ni siquiera trae el cuerpo,
 * a propósito), así que la pantalla se actualiza cuando TanStack Query recarga
 * con los permisos del usuario. Pintar directamente lo que llega por el cable
 * sería confiar en que el servidor ya filtró por rol, y duplicaría en el cliente
 * una decisión que ya vive en el backend.
 *
 * Los mensajes son **at-least-once**: el mismo aviso puede llegar dos veces. No
 * es un problema porque invalidar dos veces la misma clave es idempotente — otra
 * razón para no llevar contadores ni acumular estado a partir de los eventos.
 *
 * El ciclo de vida se ata al access token: sin token no se conecta, y cambiar de
 * token (login, refresh) reconecta con el nuevo. Así el socket nunca sobrevive a
 * la credencial con la que se abrió.
 */
export function WsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [connected, setConnected] = useState(false);
  const [cambiosRecientes, setCambiosRecientes] = useState<
    Record<string, number>
  >({});
  const socketRef = useRef<Socket | null>(null);
  /** Tickets seguidos, con cuántos componentes los están mirando. */
  const watched = useRef(new Map<string, number>());

  /**
   * Anota qué ticket acaba de cambiar, para que la lista pueda señalarlo.
   *
   * Una pantalla que se actualiza sola tiene un problema propio: el cambio
   * ocurre donde el usuario no está mirando y se lo pierde. Invalidar la caché
   * hace que el dato sea correcto; esto hace que además se note.
   *
   * De paso se descartan los anotados hace rato, para que el objeto no crezca
   * durante una sesión larga.
   */
  const anotarCambio = useCallback((ticketId: string) => {
    const ahora = Date.now();
    setCambiosRecientes((previos) => {
      const vigentes: Record<string, number> = {};
      for (const [id, momento] of Object.entries(previos)) {
        if (ahora - momento < VENTANA_DE_CAMBIO) vigentes[id] = momento;
      }
      vigentes[ticketId] = ahora;
      return vigentes;
    });
  }, []);

  useEffect(() => {
    // Sin token no hay conexión. No hace falta poner `connected` en false aquí:
    // si veníamos de una sesión, el cleanup del efecto anterior ya lo hizo.
    if (accessToken === null) return;

    const socket = createRealtimeSocket(accessToken);
    socketRef.current = socket;
    let vivo = true;

    socket.on('connect', () => {
      setConnected(true);
      // Al reconectar hay un hueco: lo que pasó mientras el socket estuvo caído
      // no llega. Se invalida todo lo de tickets para cerrarlo, en vez de
      // arrastrar una pantalla que lleva minutos mintiendo.
      void queryClient.invalidateQueries({ queryKey: ticketKeys.all });
      // Y se vuelven a pedir los tickets que se estaban siguiendo: las rooms son
      // del socket, y el socket es nuevo.
      for (const ticketId of watched.current.keys()) {
        socket.emit(CLIENT_EVENTS.watch, ticketId);
      }
    });

    socket.on('disconnect', () => setConnected(false));

    // Cierre decidido por el SERVIDOR, distinto de un corte de red.
    socket.on('disconnected', (msg: DisconnectedMessage) => {
      if (!vivo) return;

      if (msg.reason === 'token_expired') {
        // Refrescar cambia el token del store, y eso vuelve a ejecutar este
        // efecto con una conexión nueva. No se reconecta a mano.
        void refreshAccessToken();
        return;
      }
      // `unauthorized`: no hay nada que reintentar. Insistir solo genera ruido
      // contra un servidor que ya dijo que no.
      socket.disconnect();
      useAuthStore.getState().clear();
    });

    // ---------------------------------------------------------- invalidación

    socket.on('ticket.created', (msg: TicketCreatedMessage) => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      anotarCambio(msg.ticketId);
    });

    socket.on('ticket.status_changed', (msg: TicketStatusChangedMessage) => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: ticketKeys.detail(msg.ticketId),
      });
      anotarCambio(msg.ticketId);
    });

    socket.on('comment.added', (msg: CommentAddedMessage) => {
      // Solo el detalle: un comentario no cambia nada de lo que se ve en la lista.
      void queryClient.invalidateQueries({
        queryKey: ticketKeys.detail(msg.ticketId),
      });
    });

    // `ticket.assigned` / `ticket.unassigned` / `sla.breached` solo llegan a
    // AGENT y ADMIN; el backend no los manda a la sala general (ADR-0023).
    for (const evento of ['ticket.assigned', 'ticket.unassigned'] as const) {
      socket.on(evento, (msg: TicketAssignmentMessage) => {
        void queryClient.invalidateQueries({ queryKey: ticketKeys.all });
        anotarCambio(msg.ticketId);
      });
    }

    socket.on('sla.breached', (msg: SlaBreachedMessage) => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.all });
      anotarCambio(msg.ticketId);
    });

    return () => {
      vivo = false;
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [accessToken, queryClient, anotarCambio]);

  /**
   * Se lleva la cuenta de cuántos componentes siguen cada ticket porque dos
   * pueden mirar el mismo a la vez (el detalle y un panel lateral): si el
   * primero en desmontarse mandara `unwatch`, dejaría al otro sin avisos.
   */
  const watchTicket = useCallback((ticketId: string) => {
    const previos = watched.current.get(ticketId) ?? 0;
    watched.current.set(ticketId, previos + 1);
    if (previos === 0) {
      socketRef.current?.emit(CLIENT_EVENTS.watch, ticketId);
    }

    return () => {
      const actuales = watched.current.get(ticketId) ?? 0;
      if (actuales <= 1) {
        watched.current.delete(ticketId);
        socketRef.current?.emit(CLIENT_EVENTS.unwatch, ticketId);
        return;
      }
      watched.current.set(ticketId, actuales - 1);
    };
  }, []);

  const value = useMemo(
    () => ({ connected, watchTicket, cambiosRecientes }),
    [connected, watchTicket, cambiosRecientes],
  );

  return <WsContext.Provider value={value}>{children}</WsContext.Provider>;
}

export function useWs(): WsContextValue {
  return useContext(WsContext);
}
