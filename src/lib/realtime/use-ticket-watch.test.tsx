import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTicketWatch } from '@/lib/realtime/use-ticket-watch';
import { WsProvider } from '@/providers/ws-provider';
import { useAuthStore } from '@/stores/auth-store';

const socketFalso = {
  handlers: new Map<string, (p: unknown) => void>(),
  emitidos: [] as { evento: string; dato: unknown }[],
  on(evento: string, handler: (p: unknown) => void) {
    this.handlers.set(evento, handler);
  },
  emit(evento: string, dato: unknown) {
    this.emitidos.push({ evento, dato });
  },
  removeAllListeners() {
    this.handlers.clear();
  },
  disconnect() {},
  reset() {
    this.handlers.clear();
    this.emitidos = [];
  },
};

vi.mock('@/lib/realtime/socket', () => ({
  createRealtimeSocket: () => socketFalso,
  CLIENT_EVENTS: { watch: 'ticket:watch', unwatch: 'ticket:unwatch' },
}));

vi.mock('@/lib/api/refresh', () => ({
  refreshAccessToken: () => Promise.resolve('token'),
}));

function Mirador({ ticketId }: { ticketId: string | null }) {
  useTicketWatch(ticketId);
  return null;
}

/**
 * El `QueryClient` se crea UNA vez por test y no en cada llamada.
 *
 * No es cosmético: el efecto del provider depende de él, así que un cliente
 * nuevo en cada `rerender` lo haría reconectar el socket entero en mitad del
 * test —algo que no pasa en la aplicación real— y se estaría midiendo el
 * remontaje en vez del cambio de suscripción.
 */
let queryClient: QueryClient;

function envolver(children: ReactNode) {
  return (
    <QueryClientProvider client={queryClient}>
      <WsProvider>{children}</WsProvider>
    </QueryClientProvider>
  );
}

const enviados = (evento: string) =>
  socketFalso.emitidos.filter((e) => e.evento === evento);

/**
 * Simula que el socket termina de conectarse.
 *
 * Hace falta en TODOS los tests, y el motivo es interesante: React ejecuta los
 * efectos de los hijos ANTES que los del padre, así que cuando `useTicketWatch`
 * pide seguir un ticket el provider todavía no ha creado el socket. Ese primer
 * `watch` no se pierde porque el handler de `connect` reenvía todo lo que haya
 * en la lista de seguidos — que es precisamente para lo que está.
 */
const conectar = () =>
  act(() => {
    socketFalso.handlers.get('connect')?.(undefined);
  });

beforeEach(() => {
  socketFalso.reset();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.getState().setAccessToken('token-1');
});

describe('useTicketWatch', () => {
  it('entra en la sala del ticket y sale al cerrar la pantalla', () => {
    // Se cierra SOLO el componente, dejando el provider montado: es lo que pasa
    // al navegar del detalle a la bandeja. Si se desmontara el árbol entero, el
    // provider cerraría el socket y el `unwatch` sobraría — cerrar la conexión
    // ya libera sus salas.
    const { rerender } = render(envolver(<Mirador ticketId="t-1" />));
    conectar();

    expect(enviados('ticket:watch')).toEqual([
      { evento: 'ticket:watch', dato: 't-1' },
    ]);

    rerender(envolver(<Mirador ticketId={null} />));

    expect(enviados('ticket:unwatch')).toEqual([
      { evento: 'ticket:unwatch', dato: 't-1' },
    ]);
  });

  it('no pide nada mientras no se sepa qué ticket es', () => {
    // Caso normal de una ruta cargando: el id llega después.
    render(envolver(<Mirador ticketId={null} />));
    conectar();

    expect(socketFalso.emitidos).toHaveLength(0);
  });

  it('cambiar de ticket sale de la sala anterior', () => {
    const { rerender } = render(envolver(<Mirador ticketId="t-1" />));
    conectar();

    rerender(envolver(<Mirador ticketId="t-2" />));

    expect(enviados('ticket:unwatch')).toContainEqual({
      evento: 'ticket:unwatch',
      dato: 't-1',
    });
    expect(enviados('ticket:watch')).toContainEqual({
      evento: 'ticket:watch',
      dato: 't-2',
    });
  });

  it('dos componentes mirando el mismo ticket solo se suscriben una vez', () => {
    render(
      envolver(
        <>
          <Mirador ticketId="t-5" />
          <Mirador ticketId="t-5" />
        </>,
      ),
    );
    conectar();

    expect(enviados('ticket:watch')).toHaveLength(1);
  });

  it('el primero en desmontarse NO deja sin avisos al que sigue mirando', () => {
    // El fallo que justifica llevar la cuenta: sin ella, cerrar un panel lateral
    // dejaría el detalle abierto sin actualizaciones, y el síntoma sería "a
    // veces el ticket no se refresca", que es imposible de reproducir.
    function Dos({
      ambos,
      soloUno = true,
    }: {
      ambos: boolean;
      soloUno?: boolean;
    }) {
      return (
        <>
          {soloUno ? <Mirador ticketId="t-5" /> : null}
          {ambos ? <Mirador ticketId="t-5" /> : null}
        </>
      );
    }

    const { rerender } = render(envolver(<Dos ambos />));
    conectar();
    rerender(envolver(<Dos ambos={false} />));

    expect(enviados('ticket:unwatch')).toHaveLength(0);

    rerender(envolver(<Dos ambos={false} soloUno={false} />));

    expect(enviados('ticket:unwatch')).toEqual([
      { evento: 'ticket:unwatch', dato: 't-5' },
    ]);
  });
});
