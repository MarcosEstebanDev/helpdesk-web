import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TablaDeTickets } from './tabla-de-tickets';
import type { Member, TicketSummary } from '@/lib/api/types';
import { crearDirectorio } from '@/features/members/directory';

vi.mock('@/providers/ws-provider', () => ({
  useWs: () => ({ cambiosRecientes: {} }),
}));

const enMinutos = (min: number) => new Date(Date.now() + min * 60_000).toISOString();

const ticket = (extra: Partial<TicketSummary> = {}): TicketSummary => ({
  id: 't1',
  number: 12,
  subject: 'No puedo exportar el PDF',
  status: 'IN_PROGRESS',
  priority: 'NORMAL',
  requesterId: 'cli',
  assigneeId: null,
  createdAt: enMinutos(-120),
  updatedAt: enMinutos(-5),
  ...extra,
});

const miembros: Member[] = [
  { userId: 'yo', email: 'ana.perez@acme.test', role: 'AGENT' } as Member,
  { userId: 'otro', email: 'bruno@acme.test', role: 'AGENT' } as Member,
];

const deEquipo = (tickets: TicketSummary[]) =>
  render(
    <TablaDeTickets
      tickets={tickets}
      esEquipo
      miId="yo"
      directorio={crearDirectorio(miembros)}
    />,
  );

describe('TablaDeTickets (UX 2026-11-13)', () => {
  it('al equipo le muestra el email del cliente y el SLA que más apura', () => {
    deEquipo([
      ticket({
        requesterEmail: 'cliente@empresa.test',
        slaSummary: { state: 'running', dueAt: enMinutos(40) },
      }),
    ]);

    expect(screen.getByText('cliente@empresa.test')).toBeInTheDocument();
    expect(screen.getByText('vence en 40 min')).toBeInTheDocument();
  });

  it('a un VIEWER no le arma columnas que el backend no le manda', () => {
    render(<TablaDeTickets tickets={[ticket()]} esEquipo={false} miId="cli" directorio={crearDirectorio([])} />);

    expect(screen.queryByText('SLA')).not.toBeInTheDocument();
    expect(screen.queryByText('Etiquetas')).not.toBeInTheDocument();
    expect(screen.queryByText('Asignado')).not.toBeInTheDocument();
  });

  it('muestra como mucho dos etiquetas y cuenta el resto', () => {
    const tag = (id: string) => ({ id, name: `tag-${id}`, color: 'blue' as const });
    deEquipo([ticket({ tags: [tag('a'), tag('b'), tag('c')] })]);

    expect(screen.getByText('tag-a')).toBeInTheDocument();
    expect(screen.getByText('tag-b')).toBeInTheDocument();
    expect(screen.queryByText('tag-c')).not.toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('el asignado va en iniciales, y el tuyo se distingue', () => {
    deEquipo([ticket({ id: 'a', assigneeId: 'yo' }), ticket({ id: 'b', number: 13, assigneeId: 'otro' })]);

    const mio = screen.getByText('Asignado a vos (ana.perez@acme.test)').parentElement!;
    const otro = screen.getByText('Asignado a bruno@acme.test').parentElement!;
    expect(mio).toHaveTextContent('AP');
    expect(otro).toHaveTextContent('BR');
    // El tuyo se distingue con el anillo.
    expect(mio.className).toMatch(/ring-2/);
    expect(otro.className).not.toMatch(/ring-2/);
  });

  it('la IA aparece junto al asunto solo si sugiere MÁS urgencia', () => {
    deEquipo([
      ticket({ id: 'a', aiTriage: { category: 'billing', suggestedPriority: 'URGENT' } }),
      ticket({ id: 'b', number: 13, aiTriage: { category: 'billing', suggestedPriority: 'LOW' } }),
    ]);

    const filas = screen.getAllByRole('link');
    expect(within(filas[0]).getByText(/IA: urgente/i)).toBeInTheDocument();
    expect(within(filas[1]).queryByText(/IA:/i)).not.toBeInTheDocument();
  });

  it('marca la prioridad alta o urgente, y solo esas', () => {
    deEquipo([ticket({ id: 'a', priority: 'URGENT' }), ticket({ id: 'b', number: 13, priority: 'LOW' })]);

    const filas = screen.getAllByRole('link');
    expect(within(filas[0]).getByText('Prioridad urgente')).toBeInTheDocument();
    expect(within(filas[1]).queryByText(/Prioridad/)).not.toBeInTheDocument();
  });

  it('j y k mueven el foco entre filas', () => {
    deEquipo([ticket({ id: 'a' }), ticket({ id: 'b', number: 13 })]);
    const filas = screen.getAllByRole('link');

    fireEvent.keyDown(document.body, { key: 'j' });
    expect(filas[0]).toHaveFocus();
    fireEvent.keyDown(document.body, { key: 'j' });
    expect(filas[1]).toHaveFocus();
    fireEvent.keyDown(filas[1], { key: 'k' });
    expect(filas[0]).toHaveFocus();
  });

  it('j escrita en la búsqueda es una letra, no una orden', () => {
    render(
      <>
        <input aria-label="Buscar tickets" />
        <TablaDeTickets tickets={[ticket()]} esEquipo miId="yo" directorio={crearDirectorio(miembros)} />
      </>,
    );
    const busqueda = screen.getByLabelText('Buscar tickets');
    busqueda.focus();

    fireEvent.keyDown(busqueda, { key: 'j' });

    expect(busqueda).toHaveFocus();
  });
});
