import { etiquetaDe, type Directorio } from '@/features/members/directory';
import {
  SYSTEM_ACTOR_ID,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type AuditEntry,
  type SlaKind,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/api/types';

/**
 * Traduce una entrada de auditoría a algo que una persona pueda leer.
 *
 * Devuelve un **descriptor de datos, no JSX**, para poder probarlo sin DOM: la
 * decisión difícil de este archivo no es cómo se pinta, es qué se puede afirmar.
 *
 * Porque `AuditEntry.metadata` es `unknown`. El backend escribe una forma
 * concreta por cada acción, pero eso no llega tipado hasta acá, así que **cada
 * campo se lee con una guarda y lo que no se pueda leer simplemente no se
 * muestra**. Un cambio de estado sin `from`/`to` legibles se cuenta como
 * "cambió el estado" a secas; jamás se rellena con una transición supuesta.
 *
 * Es la misma regla que rige el panel de SLA y la conversación: si el dato no
 * está, se dice lo que sí se sabe.
 */

/** Qué es esta persona EN ESTE ticket. No hay nombres: la API solo da UUIDs. */
export type PapelActor = 'sistema' | 'vos' | 'solicitante' | 'asignado' | 'otro';

export interface Participantes {
  miId: string | undefined;
  requesterId: string;
  assigneeId: string | null;
}

const PAPEL_TEXTO: Record<PapelActor, string> = {
  sistema: 'El sistema',
  vos: 'Vos',
  solicitante: 'Solicitante',
  asignado: 'Agente asignado',
  otro: 'Otro miembro',
};

export function papelDelActor(
  actorId: string,
  { miId, requesterId, assigneeId }: Participantes,
): PapelActor {
  // Va primero: el actor del sistema no es de nadie, y si alguna vez coincidiera
  // con otro id, "lo hizo el sistema" es lo que hay que decir.
  if (actorId === SYSTEM_ACTOR_ID) return 'sistema';
  if (miId !== undefined && actorId === miId) return 'vos';
  if (actorId === requesterId) return 'solicitante';
  if (assigneeId !== null && actorId === assigneeId) return 'asignado';
  return 'otro';
}

export function textoDelPapel(papel: PapelActor): string {
  return PAPEL_TEXTO[papel];
}

/**
 * Cómo nombrar a quien hizo algo.
 *
 * El orden importa. "Vos" y "El sistema" ganan siempre: son más informativos que
 * un correo, y en el caso del sistema no hay persona detrás. Para el resto se
 * usa el nombre real **si el directorio lo tiene**, y si no se cae al papel.
 *
 * El directorio solo existe para AGENT o superior (`GET /members` responde 403 a
 * un VIEWER, ADR-0025), así que esta misma pantalla dice "Solicitante" para el
 * cliente final y el correo de la persona para un agente. No es una
 * inconsistencia: es exactamente la información que cada uno tiene derecho a ver.
 */
export function etiquetaDelActor(
  actorId: string,
  papel: PapelActor,
  directorio: Directorio,
): string {
  if (papel === 'vos' || papel === 'sistema') return PAPEL_TEXTO[papel];
  const miembro = directorio(actorId);
  return miembro === null ? PAPEL_TEXTO[papel] : etiquetaDe(miembro);
}

export interface EntradaDescrita {
  papel: PapelActor;
  /** Qué pasó, en una frase. Nunca vacía. */
  frase: string;
  /** Solo cuando la metadata trae dos estados legibles. */
  transicion?: { desde: TicketStatus; hasta: TicketStatus };
  /** Solo en `ticket.created`, si la prioridad vino legible. */
  prioridad?: TicketPriority;
  /** Solo en `sla.breached`. */
  reloj?: { kind: SlaKind; dueAt: string };
  /** `true` cuando el backend marcó la acción como automática. */
  automatico?: boolean;
  /** Presente solo si la acción no está en `AUDIT_ACTIONS`. */
  accionCruda?: string;
}

export function describirEntrada(
  entrada: AuditEntry,
  participantes: Participantes,
): EntradaDescrita {
  const papel = papelDelActor(entrada.actorId, participantes);
  const meta = comoObjeto(entrada.metadata);

  switch (entrada.action) {
    case 'ticket.created': {
      const prioridad = comoPrioridad(meta?.priority);
      return {
        papel,
        frase: 'Abrió el ticket',
        // El `number` también viene en la metadata y no se usa: ya está en las
        // migas de pan, repetirlo en cada entrada es ruido.
        ...(prioridad === null ? {} : { prioridad }),
      };
    }

    case 'ticket.status_changed': {
      const desde = comoEstado(meta?.from);
      const hasta = comoEstado(meta?.to);
      if (desde === null || hasta === null) {
        return { papel, frase: 'Cambió el estado' };
      }
      return { papel, frase: 'Cambió el estado', transicion: { desde, hasta } };
    }

    case 'ticket.assigned': {
      const automatico = meta?.automatic === true;
      const destinatario = comoTexto(meta?.assigneeId);
      const esParaMi =
        participantes.miId !== undefined && destinatario === participantes.miId;

      if (automatico) {
        return {
          papel,
          frase: esParaMi
            ? 'Reparto automático: el ticket es tuyo'
            : 'Reparto automático',
          automatico: true,
        };
      }
      return {
        papel,
        frase: esParaMi
          ? 'Asignó el ticket a vos'
          : destinatario === null
            ? 'Asignó el ticket'
            : 'Asignó el ticket a otra persona',
      };
    }

    case 'ticket.unassigned':
      return { papel, frase: 'Quitó la asignación' };

    case 'comment.added':
      // El cuerpo no viaja en el historial, y además está en la otra pestaña.
      return { papel, frase: 'Comentó' };

    case 'sla.breached': {
      const kind = comoSlaKind(meta?.kind);
      const dueAt = comoTexto(meta?.dueAt);
      return {
        papel,
        frase: 'Se incumplió el SLA',
        ...(kind !== null && dueAt !== null ? { reloj: { kind, dueAt } } : {}),
      };
    }

    case 'ticket.priority_changed':
      // A propósito sin `from`/`to`: hoy NINGÚN caso de uso del backend emite
      // esta acción ni hay endpoint para cambiar la prioridad, así que la forma
      // de su metadata sería una invención. El día que exista, se mira qué
      // escribe y se completa.
      return { papel, frase: 'Cambió la prioridad' };

    case 'sla.policy_changed':
      return { papel, frase: 'Cambió la política de SLA de la organización' };

    default:
      // El contrato se mantiene a mano: una acción nueva en el backend llega
      // acá sin avisar. Se muestra cruda en vez de romper o de esconderla.
      return {
        papel,
        frase: 'Acción no reconocida',
        accionCruda: entrada.action,
      };
  }
}

// ------------------------------------------------------------------ guardas

function comoObjeto(valor: unknown): Record<string, unknown> | null {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

function comoTexto(valor: unknown): string | null {
  return typeof valor === 'string' && valor !== '' ? valor : null;
}

function comoEstado(valor: unknown): TicketStatus | null {
  return typeof valor === 'string' &&
    (TICKET_STATUSES as readonly string[]).includes(valor)
    ? (valor as TicketStatus)
    : null;
}

function comoPrioridad(valor: unknown): TicketPriority | null {
  return typeof valor === 'string' &&
    (TICKET_PRIORITIES as readonly string[]).includes(valor)
    ? (valor as TicketPriority)
    : null;
}

function comoSlaKind(valor: unknown): SlaKind | null {
  return valor === 'RESPONSE' || valor === 'RESOLUTION' ? valor : null;
}
