import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { TicketComments } from './ticket-comments';
import { ToastProvider } from '@/components/ui/toast';
import { SIN_DIRECTORIO } from '@/features/members/directory';
import type { Role } from '@/stores/auth-store';
import type { TicketComment, TicketDetail } from '@/lib/api/types';

// Se dobla el módulo de la API: lo que se prueba es qué se manda y cómo se
// pinta lo que vuelve, no cómo viaja.
vi.mock('@/features/tickets/api', () => ({ addComment: vi.fn() }));

const rolActual = { valor: 'AGENT' as Role };

vi.mock('@/features/auth/session', () => ({
  useSession: () => ({
    status: 'authenticated',
    user: { id: 'yo', email: 'yo@acme.test', tenantId: 't1', role: rolActual.valor },
  }),
}));

import { addComment } from '@/features/tickets/api';

const comentario = (parcial: Partial<TicketComment>): TicketComment => ({
  id: 'c1',
  authorId: 'otro',
  body: 'Hola',
  visibility: 'PUBLIC',
  createdAt: '2026-09-10T10:00:00.000Z',
  ...parcial,
});

const ticket = (comments: TicketComment[] = []): TicketDetail => ({
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
  comments,
  sla: [],
});

function montar(t: TicketDetail) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const envolver = (children: ReactNode) => (
    <QueryClientProvider client={cliente}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
  return render(envolver(<TicketComments ticket={t} directorio={SIN_DIRECTORIO} />));
}

describe('TicketComments: notas internas', () => {
  beforeEach(() => {
    vi.mocked(addComment).mockReset();
    vi.mocked(addComment).mockResolvedValue({ id: 'nuevo' });
  });

  it('una nota interna se marca en el hilo', () => {
    montar(ticket([comentario({ visibility: 'INTERNAL', body: 'Es el bug de la 4.2.0' })]));

    // Dentro del hilo: el selector del editor también dice "Nota interna".
    expect(within(screen.getByRole('listitem')).getByText('Nota interna')).toBeInTheDocument();
  });

  it('el cliente (VIEWER) no ve el selector y responde en público', async () => {
    rolActual.valor = 'VIEWER';
    montar(ticket());

    expect(screen.queryByRole('group', { name: 'A quién va el mensaje' })).toBeNull();
    await userEvent.type(screen.getByLabelText('Respuesta'), 'Sigo igual');
    await userEvent.click(screen.getByRole('button', { name: 'Responder' }));

    await waitFor(() =>
      expect(addComment).toHaveBeenCalledWith('tk1', {
        body: 'Sigo igual',
        visibility: 'PUBLIC',
      }),
    );
  });

  it('el equipo responde en público por defecto y puede pasar a nota interna', async () => {
    rolActual.valor = 'AGENT';
    montar(ticket());

    const nota = screen.getByRole('button', { name: 'Nota interna' });
    expect(screen.getByRole('button', { name: 'Responder al cliente' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.click(nota);
    expect(nota).toHaveAttribute('aria-pressed', 'true');
    await userEvent.type(screen.getByLabelText('Nota interna'), 'Lo miro mañana');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar nota' }));

    await waitFor(() =>
      expect(addComment).toHaveBeenCalledWith('tk1', {
        body: 'Lo miro mañana',
        visibility: 'INTERNAL',
      }),
    );
  });
});
