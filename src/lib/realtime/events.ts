/**
 * Contrato de los mensajes que llegan por WebSocket (ADR-0023 del backend).
 *
 * **Este fichero se mantiene a mano y a ojo.** El ADR-0004 hace que el contrato
 * REST se genere desde el OpenAPI del backend, pero los mensajes de Socket.io no
 * están en ese spec: si alguien cambia `BroadcastTicketEvent` en `helpdesk-api`
 * y no toca esto, no falla la compilación — simplemente llega un payload que no
 * es el que dice el tipo. Es deuda conocida y asumida; el día que duela, la
 * salida es generar ambos lados desde un esquema compartido.
 *
 * Lo que NO viaja es tan importante como lo que viaja: `comment.added` trae el id
 * del comentario y no su cuerpo, a propósito, para que el cliente lo recargue con
 * SUS permisos. Ese es el motivo por el que casi todo aquí sirve para invalidar
 * caché y no para pintar directamente.
 */

/** Campos que llevan todos los mensajes. */
interface MensajeBase {
  ticketId: string;
  /** ISO-8601. Es el instante del HECHO, no el de la emisión. */
  occurredAt: string;
}

export interface TicketCreatedMessage extends MensajeBase {
  number: number;
  subject: string;
  priority: string;
  status: string;
}

export interface TicketStatusChangedMessage extends MensajeBase {
  status: string;
}

export interface CommentAddedMessage extends MensajeBase {
  commentId: string;
}

/** Solo llega a AGENT o ADMIN: el backend lo manda a la sala del equipo. */
export interface TicketAssignmentMessage extends MensajeBase {
  assigneeId: string | null;
  status: string;
}

/** Solo llega a AGENT o ADMIN. */
export interface SlaBreachedMessage extends MensajeBase {
  kind: string;
  dueAt: string;
  priority: string;
  assigneeId: string | null;
}

/** Mapa de nombre de evento a su payload. */
export interface RealtimeEvents {
  'ticket.created': TicketCreatedMessage;
  'ticket.status_changed': TicketStatusChangedMessage;
  'comment.added': CommentAddedMessage;
  'ticket.assigned': TicketAssignmentMessage;
  'ticket.unassigned': TicketAssignmentMessage;
  'sla.breached': SlaBreachedMessage;
}

export type RealtimeEventName = keyof RealtimeEvents;

/**
 * Por qué cerró el servidor la conexión (llega en el evento `disconnected`).
 *
 * La distinción es la que decide qué hacer: con `token_expired` hay que refrescar
 * y reconectar, con `unauthorized` no hay nada que reintentar y reconectar en
 * bucle solo genera ruido.
 */
export type CloseReason = 'unauthorized' | 'token_expired';

export interface DisconnectedMessage {
  reason: CloseReason;
}
