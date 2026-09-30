import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { TicketActivity } from './ticket-activity';
import { TicketHistory } from './ticket-history';
import { ToastProvider } from '@/components/ui/toast';
import { crearDirectorio, SIN_DIRECTORIO } from '@/features/members/directory';
import { ApiError } from '@/lib/api/client';
import type { Role } from '@/stores/auth-store';
import type { TicketDetail } from '@/lib/api/types';

// Se dobla el módulo de la API, no `fetch`: lo que se prueba acá es cuándo se
// pide el historial y qué se hace con lo que vuelve, no cómo viaja.
vi.mock('@/features/tickets/api', () => ({
  getHistory: vi.fn(),
}));

const rolActual = { valor: 'ADMIN' as Role };

vi.mock('@/features/auth/session', () => ({
  useSession: () => ({
    status: 'authenticated',
    user: {
      id: 'yo',
      email: 'yo@acme.test',
      tenantId: 't1',
      role: rolActual.valor,
    },
  }),
}));

import * as api from '@/features/tickets/api';

const TICKET: TicketDetail = {
  id: 'tk1',
  number: 1,
  subject: 'Asunto',
  status: 'OPEN',
  priority: 'NORMAL',
  requesterId: 'quien-lo-abrio',
  assigneeId: null,
  createdAt: '2026-09-10T10:00:00.000Z',
  updatedAt: '2026-09-10T10:00:00.000Z',
  description: 'Descripción',
  resolvedAt: null,
  closedAt: null,
  comments: [],
  sla: [],
};

function envolver(children: ReactNode) {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // El `ToastProvider` hace falta porque la conversación avisa los errores de
  // envío con `useAvisos`, y el gestor de Base UI exige su provider montado.
  return (
    <QueryClientProvider client={cliente}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(api.getHistory).mockReset();
  rolActual.valor = 'ADMIN';
});

describe('TicketActivity', () => {
  // El historial es un registro secundario: pedirlo al abrir cada ticket sería
  // una petición extra por cada apertura para algo que casi nadie mira.
  it('no pide el historial hasta que se abre la pestaña', async () => {
    vi.mocked(api.getHistory).mockResolvedValue([]);
    render(envolver(<TicketActivity ticket={TICKET} directorio={SIN_DIRECTORIO} />));

    expect(api.getHistory).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('tab', { name: /historial/i }));

    await waitFor(() => expect(api.getHistory).toHaveBeenCalledWith('tk1'));
  });

  // `GET /tickets/:id/history` pide AGENT. Ofrecerle a un VIEWER una pestaña
  // que responde 403 es peor que no ofrecérsela.
  it('un viewer no ve la pestaña de historial', () => {
    rolActual.valor = 'VIEWER';
    render(envolver(<TicketActivity ticket={TICKET} directorio={SIN_DIRECTORIO} />));

    expect(
      screen.queryByRole('tab', { name: /historial/i }),
    ).not.toBeInTheDocument();
    expect(api.getHistory).not.toHaveBeenCalled();
  });
});

describe('TicketHistory', () => {
  it('un historial vacío no se confunde con un error', async () => {
    vi.mocked(api.getHistory).mockResolvedValue([]);
    render(envolver(<TicketHistory ticket={TICKET} directorio={SIN_DIRECTORIO} habilitado />));

    expect(
      await screen.findByText(/todavía no hay actividad registrada/i),
    ).toBeInTheDocument();
  });

  it('un 403 se explica en vez de mostrar el mensaje crudo de la API', async () => {
    vi.mocked(api.getHistory).mockRejectedValue(
      new ApiError(403, 'Forbidden resource', 'iam.forbidden'),
    );
    render(envolver(<TicketHistory ticket={TICKET} directorio={SIN_DIRECTORIO} habilitado />));

    expect(
      await screen.findByText(/el historial es solo para agentes/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/forbidden resource/i)).not.toBeInTheDocument();
  });

  /**
   * El directorio solo lo tiene un AGENT (`GET /members` responde 403 a un
   * VIEWER), así que la MISMA entrada se lee distinto según quién mire: con
   * nombre para el agente, con el papel para el cliente. No es inconsistencia,
   * es lo que cada uno tiene derecho a ver.
   */
  it('nombra a la persona cuando el directorio la tiene, y cae al papel cuando no', async () => {
    const entrada = {
      id: 'a2',
      actorId: 'otra-persona',
      action: 'comment.added',
      metadata: null,
      occurredAt: '2026-09-10T11:00:00.000Z',
    };
    vi.mocked(api.getHistory).mockResolvedValue([entrada]);

    const conDirectorio = crearDirectorio([
      {
        userId: 'otra-persona',
        email: 'lucia@acme.test',
        role: 'AGENT',
        joinedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const { unmount } = render(
      envolver(
        <TicketHistory ticket={TICKET} directorio={conDirectorio} habilitado />,
      ),
    );
    expect(await screen.findByText('lucia')).toBeInTheDocument();
    unmount();

    render(
      envolver(
        <TicketHistory ticket={TICKET} directorio={SIN_DIRECTORIO} habilitado />,
      ),
    );
    expect(await screen.findByText('Otro miembro')).toBeInTheDocument();
  });

  it('describe cada entrada sin inventar lo que la metadata no dice', async () => {
    vi.mocked(api.getHistory).mockResolvedValue([
      {
        id: 'a1',
        actorId: 'yo',
        action: 'ticket.status_changed',
        metadata: { desconocido: true },
        occurredAt: '2026-09-10T11:00:00.000Z',
      },
    ]);
    render(envolver(<TicketHistory ticket={TICKET} directorio={SIN_DIRECTORIO} habilitado />));

    expect(await screen.findByText('Cambió el estado')).toBeInTheDocument();
    // Sin `from`/`to` legibles no se pinta ninguna insignia de estado.
    expect(screen.queryByText('Abierto')).not.toBeInTheDocument();
  });
});
