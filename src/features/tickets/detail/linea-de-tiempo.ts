import type { Directorio } from '@/features/members/directory';
import {
  describirEntrada,
  etiquetaDelActor,
  type Participantes,
} from '@/features/tickets/audit';
import type {
  AuditEntry,
  TicketComment,
  TicketStatus,
} from '@/lib/api/types';

/** Cómo se nombra el estado al que pasó un ticket, en medio de la charla. */
const ESTADO_TEXTO: Record<TicketStatus, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En curso',
  WAITING_ON_CUSTOMER: 'Esperando al cliente',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
};

export type ItemDeLinea =
  | { tipo: 'comentario'; id: string; at: string; comentario: TicketComment }
  | {
      tipo: 'estado';
      id: string;
      at: string;
      texto: string;
      actor: string;
      /** Ausente si la metadata no traía un estado legible: no se adivina. */
      hasta: TicketStatus | undefined;
    };

/**
 * La conversación con los cambios de estado intercalados (UX 2026-11-13).
 *
 * Los cambios salen del historial de auditoría, que solo puede pedir el
 * equipo: sin historial (`undefined`, el caso del VIEWER o mientras carga) la
 * línea es la conversación tal cual. Del historial entran SOLO los cambios de
 * estado — asignaciones y etiquetas siguen en su pestaña —: son lo que explica
 * por qué la conversación siguió como siguió.
 *
 * A igual hora, el comentario va primero: "Responder y esperar al cliente"
 * manda la respuesta y DESPUÉS cambia el estado.
 */
export function lineaDeTiempo(
  comentarios: TicketComment[],
  historial: AuditEntry[] | undefined,
  participantes: Participantes,
  directorio: Directorio,
): ItemDeLinea[] {
  const items: ItemDeLinea[] = comentarios.map((c) => ({
    tipo: 'comentario',
    id: c.id,
    at: c.createdAt,
    comentario: c,
  }));

  for (const entrada of historial ?? []) {
    if (entrada.action !== 'ticket.status_changed') continue;
    const d = describirEntrada(entrada, participantes);
    const hasta = d.transicion?.hasta;
    items.push({
      tipo: 'estado',
      id: entrada.id,
      at: entrada.occurredAt,
      texto: d.automatico
        ? d.frase
        : hasta !== undefined
          ? `Pasó a ${ESTADO_TEXTO[hasta]}`
          : d.frase,
      actor: etiquetaDelActor(entrada.actorId, d.papel, directorio),
      hasta,
    });
  }

  return items.sort((a, b) => {
    const t = new Date(a.at).getTime() - new Date(b.at).getTime();
    if (t !== 0) return t;
    if (a.tipo === b.tipo) return 0;
    return a.tipo === 'comentario' ? -1 : 1;
  });
}

export type LadoDelMensaje = 'cliente' | 'equipo' | 'nota';

/**
 * Dónde va un mensaje en el chat: el cliente a la izquierda, el equipo a la
 * derecha, y la nota interna al centro — ni de un lado ni del otro, porque no
 * es parte de la charla con el cliente.
 *
 * "Cliente" es quien ABRIÓ el ticket, el único dato que existe: un VIEWER
 * comentando el ticket de otro (no pasa hoy) caería del lado del equipo.
 */
export function ladoDelMensaje(c: TicketComment, requesterId: string): LadoDelMensaje {
  if (c.visibility === 'INTERNAL') return 'nota';
  return c.authorId === requesterId ? 'cliente' : 'equipo';
}
