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
vi.mock('@/features/tickets/api', () => ({
  addComment: vi.fn(),
  changeStatus: vi.fn(),
  getHistory: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/features/canned-responses/api', () => ({ listCannedResponses: vi.fn() }));

const rolActual = { valor: 'AGENT' as Role };

vi.mock('@/features/auth/session', () => ({
  useSession: () => ({
    status: 'authenticated',
    user: { id: 'yo', email: 'yo@acme.test', tenantId: 't1', role: rolActual.valor },
  }),
}));

import { addComment, changeStatus, getHistory } from '@/features/tickets/api';
import { listCannedResponses } from '@/features/canned-responses/api';

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

const PLANTILLAS = [
  {
    id: 'p1',
    title: 'Saludo',
    body: 'Hola! Ya miramos el {{ticket.numero}}.',
    createdAt: '2026-11-12T10:00:00.000Z',
    updatedAt: '2026-11-12T10:00:00.000Z',
  },
  {
    id: 'p2',
    title: 'Para el cliente',
    body: 'Te escribimos a {{cliente.email}}',
    createdAt: '2026-11-12T10:00:00.000Z',
    updatedAt: '2026-11-12T10:00:00.000Z',
  },
];

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

describe('TicketComments: chat y "Responder y esperar al cliente" (UX 2026-11-13)', () => {
  const enCurso = (comments: TicketComment[] = []): TicketDetail => ({
    ...ticket(comments),
    status: 'IN_PROGRESS',
  });

  beforeEach(() => {
    rolActual.valor = 'AGENT';
    vi.mocked(addComment).mockReset();
    vi.mocked(addComment).mockResolvedValue({ id: 'nuevo' });
    vi.mocked(changeStatus).mockReset();
    vi.mocked(changeStatus).mockResolvedValue({} as never);
    vi.mocked(getHistory).mockReset();
    vi.mocked(getHistory).mockResolvedValue([]);
  });

  it('manda la respuesta y DESPUÉS pasa el ticket a esperar al cliente', async () => {
    montar(enCurso());

    await userEvent.type(screen.getByLabelText('Respuesta'), '¿Me pasás una captura?');
    await userEvent.click(screen.getByRole('button', { name: 'Responder y esperar al cliente' }));

    await waitFor(() => expect(changeStatus).toHaveBeenCalledWith('tk1', 'WAITING_ON_CUSTOMER'));
    expect(addComment).toHaveBeenCalledWith('tk1', {
      body: '¿Me pasás una captura?',
      visibility: 'PUBLIC',
    });
    expect(vi.mocked(addComment).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(changeStatus).mock.invocationCallOrder[0],
    );
  });

  it('si la respuesta no sale, el estado no cambia', async () => {
    vi.mocked(addComment).mockRejectedValueOnce(new Error('caído'));
    montar(enCurso());

    await userEvent.type(screen.getByLabelText('Respuesta'), 'Hola');
    await userEvent.click(screen.getByRole('button', { name: 'Responder y esperar al cliente' }));

    expect(await screen.findAllByText('No se pudo enviar la respuesta')).not.toHaveLength(0);
    expect(changeStatus).not.toHaveBeenCalled();
    // El borrador sigue ahí para reintentar.
    expect(screen.getByLabelText('Respuesta')).toHaveValue('Hola');
  });

  it('si la respuesta sale pero el cambio de estado no, lo dice sin ocultar que se envió', async () => {
    vi.mocked(changeStatus).mockRejectedValueOnce(new Error('409'));
    montar(enCurso());

    await userEvent.type(screen.getByLabelText('Respuesta'), 'Hola');
    await userEvent.click(screen.getByRole('button', { name: 'Responder y esperar al cliente' }));

    expect(
      await screen.findAllByText('La respuesta se envió, pero el ticket no pasó a esperar al cliente'),
    ).not.toHaveLength(0);
  });

  it('no se ofrece en una nota, a un VIEWER, ni desde un estado que no puede esperar', async () => {
    const { unmount } = montar(ticket()); // OPEN no puede pasar a la espera (ADR-0029)
    expect(screen.queryByRole('button', { name: 'Responder y esperar al cliente' })).toBeNull();
    unmount();

    montar(enCurso());
    await userEvent.click(screen.getByRole('button', { name: 'Nota interna' }));
    expect(screen.queryByRole('button', { name: 'Responder y esperar al cliente' })).toBeNull();
  });

  it('a un VIEWER no se le ofrece ni se le pide el historial', () => {
    rolActual.valor = 'VIEWER';
    montar(enCurso());

    expect(screen.queryByRole('button', { name: 'Responder y esperar al cliente' })).toBeNull();
    expect(getHistory).not.toHaveBeenCalled();
  });

  it('al equipo le intercala los cambios de estado en la conversación', async () => {
    vi.mocked(getHistory).mockResolvedValue([
      {
        id: 'e1',
        actorId: 'yo',
        action: 'ticket.status_changed',
        metadata: { from: 'OPEN', to: 'IN_PROGRESS' },
        occurredAt: '2026-09-10T11:00:00.000Z',
      },
    ]);
    montar(enCurso([comentario({ authorId: 'quien-lo-abrio' })]));

    expect(await screen.findByText('Pasó a En curso')).toBeInTheDocument();
  });

  it('el cliente va a un lado y el equipo al otro', () => {
    montar(
      enCurso([
        comentario({ id: 'c1', authorId: 'quien-lo-abrio', body: 'Del cliente' }),
        comentario({ id: 'c2', authorId: 'yo', body: 'Del equipo' }),
      ]),
    );

    expect(screen.getByText('Del cliente').closest('li')).toHaveAttribute('data-lado', 'cliente');
    expect(screen.getByText('Del equipo').closest('li')).toHaveAttribute('data-lado', 'equipo');
  });
});

describe('TicketComments: respuestas predefinidas (ADR-0030)', () => {
  beforeEach(() => {
    rolActual.valor = 'AGENT';
    vi.mocked(addComment).mockReset();
    vi.mocked(addComment).mockResolvedValue({ id: 'nuevo' });
    vi.mocked(listCannedResponses).mockReset();
    vi.mocked(listCannedResponses).mockResolvedValue({ items: PLANTILLAS });
  });

  it('el cliente no ve el botón ni se le piden las plantillas', () => {
    rolActual.valor = 'VIEWER';
    montar(ticket());

    expect(screen.queryByRole('button', { name: 'Respuestas' })).toBeNull();
    expect(listCannedResponses).not.toHaveBeenCalled();
  });

  it('elegir una inserta el texto rellenado y editable', async () => {
    montar(ticket());

    await userEvent.click(screen.getByRole('button', { name: 'Respuestas' }));
    await userEvent.click(await screen.findByRole('button', { name: /Saludo/ }));

    expect(screen.getByLabelText('Respuesta')).toHaveValue('Hola! Ya miramos el #1.');
  });

  it('inserta en el cursor sin borrar lo que ya estaba escrito', async () => {
    montar(ticket());
    const editor = screen.getByLabelText<HTMLTextAreaElement>('Respuesta');
    await userEvent.type(editor, 'Buenas. ');

    await userEvent.click(screen.getByRole('button', { name: 'Respuestas' }));
    await userEvent.click(await screen.findByRole('button', { name: /Saludo/ }));

    expect(editor).toHaveValue('Buenas. Hola! Ya miramos el #1.');
  });

  it('"/" con el editor vacío abre el selector', async () => {
    montar(ticket());

    await userEvent.type(screen.getByLabelText('Respuesta'), '/');

    expect(await screen.findByLabelText('Buscar respuesta')).toBeInTheDocument();
    expect(screen.getByLabelText('Respuesta')).toHaveValue('');
  });

  it('"/" con texto escrito es una barra común', async () => {
    montar(ticket());

    await userEvent.type(screen.getByLabelText('Respuesta'), 'a/b');

    expect(screen.queryByLabelText('Buscar respuesta')).toBeNull();
    expect(screen.getByLabelText('Respuesta')).toHaveValue('a/b');
  });

  it('una variable sin rellenar pide confirmar antes de mandarla al cliente', async () => {
    // SIN_DIRECTORIO: no se sabe el email del cliente, la variable queda literal.
    montar(ticket());
    await userEvent.click(screen.getByRole('button', { name: 'Respuestas' }));
    await userEvent.click(await screen.findByRole('button', { name: /Para el cliente/ }));

    await userEvent.click(screen.getByRole('button', { name: 'Responder' }));
    expect(screen.getByText(/Quedó una variable sin rellenar/)).toBeInTheDocument();
    expect(addComment).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Enviar igual' }));
    await waitFor(() =>
      expect(addComment).toHaveBeenCalledWith('tk1', {
        body: 'Te escribimos a {{cliente.email}}',
        visibility: 'PUBLIC',
      }),
    );
  });

  it('editar después de confirmar vuelve a pedir la confirmación', async () => {
    montar(ticket());
    const editor = screen.getByLabelText('Respuesta');
    await userEvent.type(editor, 'Hola {{{{cliente.email}}');

    await userEvent.click(screen.getByRole('button', { name: 'Responder' }));
    await userEvent.type(editor, '!');

    expect(screen.queryByRole('button', { name: 'Enviar igual' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Responder' }));
    expect(addComment).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Enviar igual' })).toBeInTheDocument();
  });

  it('en una nota interna no se pide confirmación', async () => {
    montar(ticket());
    await userEvent.click(screen.getByRole('button', { name: 'Nota interna' }));
    await userEvent.type(screen.getByLabelText('Nota interna'), 'Mandale {{{{cliente.email}}');

    await userEvent.click(screen.getByRole('button', { name: 'Guardar nota' }));

    await waitFor(() =>
      expect(addComment).toHaveBeenCalledWith('tk1', {
        body: 'Mandale {{cliente.email}}',
        visibility: 'INTERNAL',
      }),
    );
  });

  it('"Enviar igual" no se puede pulsar dos veces mientras envía', async () => {
    vi.mocked(addComment).mockReturnValue(new Promise(() => {}));
    montar(ticket());
    await userEvent.type(screen.getByLabelText('Respuesta'), 'Hola {{{{cliente.email}}');
    await userEvent.click(screen.getByRole('button', { name: 'Responder' }));

    await userEvent.click(screen.getByRole('button', { name: 'Enviar igual' }));

    expect(addComment).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Enviar igual' })).toBeNull();
  });

  it('pasar a nota interna saca el aviso (una nota no le llega al cliente)', async () => {
    montar(ticket());
    await userEvent.type(screen.getByLabelText('Respuesta'), 'Hola {{{{cliente.email}}');
    await userEvent.click(screen.getByRole('button', { name: 'Responder' }));
    expect(screen.getByText(/Quedó una variable sin rellenar/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Nota interna' }));

    expect(screen.queryByText(/Quedó una variable sin rellenar/)).toBeNull();
  });
});

