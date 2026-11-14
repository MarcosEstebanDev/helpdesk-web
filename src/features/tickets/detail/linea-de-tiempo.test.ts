import { describe, expect, it } from 'vitest';
import { ladoDelMensaje, lineaDeTiempo } from './linea-de-tiempo';
import { SIN_DIRECTORIO } from '@/features/members/directory';
import { SYSTEM_ACTOR_ID, type AuditEntry, type TicketComment } from '@/lib/api/types';

const P = { miId: 'yo', requesterId: 'cli', assigneeId: 'yo' };

const comentario = (id: string, at: string, extra: Partial<TicketComment> = {}): TicketComment => ({
  id,
  authorId: 'cli',
  body: id,
  visibility: 'PUBLIC',
  createdAt: at,
  ...extra,
});

const entrada = (id: string, at: string, action: string, metadata: unknown, actorId = 'yo'): AuditEntry => ({
  id,
  actorId,
  action,
  metadata,
  occurredAt: at,
});

describe('lineaDeTiempo (UX 2026-11-13)', () => {
  it('sin historial (VIEWER) es la conversación tal cual', () => {
    const items = lineaDeTiempo([comentario('a', '2026-11-13T10:00:00Z')], undefined, P, SIN_DIRECTORIO);

    expect(items).toEqual([expect.objectContaining({ tipo: 'comentario', id: 'a' })]);
  });

  it('intercala los cambios de estado por fecha, y nada más del historial', () => {
    const items = lineaDeTiempo(
      [comentario('a', '2026-11-13T10:00:00Z'), comentario('b', '2026-11-13T12:00:00Z')],
      [
        entrada('e1', '2026-11-13T11:00:00Z', 'ticket.status_changed', { from: 'OPEN', to: 'IN_PROGRESS' }),
        entrada('e2', '2026-11-13T11:30:00Z', 'ticket.assigned', { assigneeId: 'yo' }),
        entrada('e3', '2026-11-13T11:31:00Z', 'comment.added', {}),
      ],
      P,
      SIN_DIRECTORIO,
    );

    expect(items.map((i) => i.id)).toEqual(['a', 'e1', 'b']);
    expect(items[1]).toMatchObject({ tipo: 'estado', texto: 'Pasó a En curso', actor: 'Vos', hasta: 'IN_PROGRESS' });
  });

  it('a igual hora, el comentario va antes que el cambio de estado', () => {
    // "Responder y esperar al cliente": primero la respuesta, después la espera.
    const at = '2026-11-13T10:00:00Z';
    const items = lineaDeTiempo(
      [comentario('a', at, { authorId: 'yo' })],
      [entrada('e1', at, 'ticket.status_changed', { from: 'IN_PROGRESS', to: 'WAITING_ON_CUSTOMER' })],
      P,
      SIN_DIRECTORIO,
    );

    expect(items.map((i) => i.id)).toEqual(['a', 'e1']);
  });

  it('la vuelta automática dice por qué, y la firma el sistema', () => {
    const [item] = lineaDeTiempo(
      [],
      [
        entrada(
          'e1',
          '2026-11-13T10:00:00Z',
          'ticket.status_changed',
          { from: 'WAITING_ON_CUSTOMER', to: 'IN_PROGRESS', automatic: true, trigger: 'customer_reply' },
          SYSTEM_ACTOR_ID,
        ),
      ],
      P,
      SIN_DIRECTORIO,
    );

    expect(item).toMatchObject({ texto: 'El cliente respondió y el ticket volvió a curso', actor: 'El sistema' });
  });

  it('un cambio sin from/to legibles no se inventa una transición', () => {
    const [item] = lineaDeTiempo(
      [],
      [entrada('e1', '2026-11-13T10:00:00Z', 'ticket.status_changed', null)],
      P,
      SIN_DIRECTORIO,
    );

    expect(item).toMatchObject({ texto: 'Cambió el estado', hasta: undefined });
  });
});

describe('ladoDelMensaje', () => {
  it('el cliente a la izquierda, el equipo a la derecha y la nota al centro', () => {
    expect(ladoDelMensaje(comentario('a', '', { authorId: 'cli' }), 'cli')).toBe('cliente');
    expect(ladoDelMensaje(comentario('a', '', { authorId: 'yo' }), 'cli')).toBe('equipo');
    expect(ladoDelMensaje(comentario('a', '', { authorId: 'yo', visibility: 'INTERNAL' }), 'cli')).toBe('nota');
  });
});
