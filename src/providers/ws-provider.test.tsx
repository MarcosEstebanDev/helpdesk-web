import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ticketKeys } from '@/lib/query/keys';
import { useAuthStore } from '@/stores/auth-store';
import { WsProvider, useWs } from '@/providers/ws-provider';

/**
 * Doble del socket de Socket.io.
 *
 * Se sustituye la fábrica (`createRealtimeSocket`) y no la librería entera: lo
 * que se está probando es el ORQUESTADOR —a qué reacciona, qué invalida, cuándo
 * reconecta—, no que socket.io sepa hablar por la red.
 */
const socketFalso = {
  handlers: new Map<string, (payload: unknown) => void>(),
  emitidos: [] as { evento: string; dato: unknown }[],
  desconectado: false,

  on(evento: string, handler: (payload: unknown) => void) {
    this.handlers.set(evento, handler);
  },
  emit(evento: string, dato: unknown) {
    this.emitidos.push({ evento, dato });
  },
  removeAllListeners() {
    this.handlers.clear();
  },
  disconnect() {
    this.desconectado = true;
  },
  /** Simula que el servidor manda algo. */
  recibir(evento: string, payload: unknown = {}) {
    act(() => {
      this.handlers.get(evento)?.(payload);
    });
  },
  reset() {
    this.handlers.clear();
    this.emitidos = [];
    this.desconectado = false;
  },
};

const crearSocket = vi.fn<(token: string) => typeof socketFalso>(
  () => socketFalso,
);
const refrescar = vi.fn(async () => 'token-nuevo');

vi.mock('@/lib/realtime/socket', () => ({
  createRealtimeSocket: (token: string) => crearSocket(token),
  CLIENT_EVENTS: { watch: 'ticket:watch', unwatch: 'ticket:unwatch' },
}));

vi.mock('@/lib/api/refresh', () => ({
  refreshAccessToken: () => refrescar(),
}));

let queryClient: QueryClient;
let invalidarSpy: ReturnType<typeof vi.spyOn>;

function montar(ui: ReactNode = <Estado />) {
  return render(
    <QueryClientProvider client={queryClient}>
      <WsProvider>{ui}</WsProvider>
    </QueryClientProvider>,
  );
}

function Estado() {
  const { connected } = useWs();
  return <span data-testid="estado">{connected ? 'vivo' : 'caido'}</span>;
}

beforeEach(() => {
  socketFalso.reset();
  crearSocket.mockClear();
  refrescar.mockClear();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  invalidarSpy = vi.spyOn(queryClient, 'invalidateQueries');
});

describe('ciclo de vida de la conexión', () => {
  it('no conecta si no hay sesión', () => {
    montar();

    expect(crearSocket).not.toHaveBeenCalled();
    expect(screen.getByTestId('estado')).toHaveTextContent('caido');
  });

  it('conecta con el access token cuando aparece', () => {
    useAuthStore.getState().setAccessToken('token-1');
    montar();

    expect(crearSocket).toHaveBeenCalledWith('token-1');
  });

  it('reconecta con el token nuevo cuando cambia', () => {
    useAuthStore.getState().setAccessToken('token-1');
    montar();

    act(() => {
      useAuthStore.getState().setAccessToken('token-2');
    });

    // Un socket abierto no puede sobrevivir a la credencial con la que se abrió.
    expect(socketFalso.desconectado).toBe(true);
    expect(crearSocket).toHaveBeenLastCalledWith('token-2');
  });

  it('cierra el socket al desmontar', () => {
    useAuthStore.getState().setAccessToken('token-1');
    const { unmount } = montar();

    unmount();

    expect(socketFalso.desconectado).toBe(true);
  });
});

describe('cierre decidido por el servidor', () => {
  it('un token caducado se refresca en vez de reintentar a ciegas', () => {
    useAuthStore.getState().setAccessToken('token-viejo');
    montar();

    socketFalso.recibir('disconnected', { reason: 'token_expired' });

    expect(refrescar).toHaveBeenCalled();
    // No cierra la sesión: el usuario sigue dentro, solo cambia el token.
    expect(useAuthStore.getState().accessToken).not.toBeNull();
  });

  it('un `unauthorized` cierra la sesión y no insiste', () => {
    // Reintentar contra un servidor que ya dijo que no solo genera ruido.
    useAuthStore.getState().setAccessToken('token-invalido');
    montar();

    socketFalso.recibir('disconnected', { reason: 'unauthorized' });

    expect(refrescar).not.toHaveBeenCalled();
    expect(socketFalso.desconectado).toBe(true);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});

describe('lo que llega invalida caché', () => {
  beforeEach(() => {
    useAuthStore.getState().setAccessToken('token-1');
    montar();
    invalidarSpy.mockClear();
  });

  it('un ticket nuevo refresca las listas, no los detalles', () => {
    socketFalso.recibir('ticket.created', { ticketId: 't-1' });

    expect(invalidarSpy).toHaveBeenCalledWith({
      queryKey: ticketKeys.lists(),
    });
  });

  it('un comentario refresca SOLO el detalle de ese ticket', () => {
    // Un comentario no cambia nada de lo que se ve en la lista; invalidarla
    // haría recargar la bandeja entera de todo el que la tenga abierta.
    socketFalso.recibir('comment.added', { ticketId: 't-9' });

    expect(invalidarSpy).toHaveBeenCalledWith({
      queryKey: ticketKeys.detail('t-9'),
    });
    expect(invalidarSpy).not.toHaveBeenCalledWith({
      queryKey: ticketKeys.lists(),
    });
  });

  it('un cambio de estado refresca la lista y el detalle', () => {
    socketFalso.recibir('ticket.status_changed', { ticketId: 't-3' });

    expect(invalidarSpy).toHaveBeenCalledWith({ queryKey: ticketKeys.lists() });
    expect(invalidarSpy).toHaveBeenCalledWith({
      queryKey: ticketKeys.detail('t-3'),
    });
  });

  it('recibir dos veces el mismo aviso es inofensivo', () => {
    // Los mensajes son at-least-once. Invalidar es idempotente, y por eso el
    // provider no acumula estado a partir de los eventos.
    socketFalso.recibir('ticket.created', { ticketId: 't-1' });
    socketFalso.recibir('ticket.created', { ticketId: 't-1' });

    expect(invalidarSpy).toHaveBeenCalledTimes(2);
  });
});

describe('reconexión', () => {
  it('al reconectar cierra el hueco y vuelve a las salas seguidas', async () => {
    useAuthStore.getState().setAccessToken('token-1');
    montar(<ConSeguimiento ticketId="t-7" />);

    socketFalso.recibir('connect');
    await waitFor(() => {
      expect(screen.getByTestId('estado')).toHaveTextContent('vivo');
    });
    socketFalso.emitidos = [];
    invalidarSpy.mockClear();

    // Segundo `connect`: lo ocurrido mientras estuvo caído no llega, así que se
    // invalida todo lo de tickets en vez de arrastrar una pantalla desfasada.
    socketFalso.recibir('connect');

    expect(invalidarSpy).toHaveBeenCalledWith({ queryKey: ticketKeys.all });
    // Y se vuelve a entrar en la sala: las rooms son del socket, y este es nuevo.
    expect(socketFalso.emitidos).toContainEqual({
      evento: 'ticket:watch',
      dato: 't-7',
    });
  });
});

/**
 * Componente de prueba que sigue un ticket. Usa `watchTicket` directamente y no
 * `useTicketWatch`, que tiene su propio test: así un fallo aquí señala al
 * provider y no al hook.
 */
function ConSeguimiento({ ticketId }: { ticketId: string }) {
  const { watchTicket, connected } = useWs();

  useEffect(() => watchTicket(ticketId), [watchTicket, ticketId]);

  return <span data-testid="estado">{connected ? 'vivo' : 'caido'}</span>;
}
