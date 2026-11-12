import { ALLOWED_TRANSITIONS, type TicketStatus } from '@/lib/api/types';

export interface AccionDeEstado {
  to: TicketStatus;
  label: string;
}

/** Cómo se dice ir a cada estado, en el caso general. */
const ACCION: Record<TicketStatus, string> = {
  OPEN: 'Reabrir',
  IN_PROGRESS: 'Empezar',
  WAITING_ON_CUSTOMER: 'Esperar al cliente',
  RESOLVED: 'Resolver',
  CLOSED: 'Cerrar',
};

/**
 * Las acciones que ofrece el menú de estado desde `from`: las transiciones
 * legales (copia de UX del ADR-0015, ver `ALLOWED_TRANSITIONS`) con su nombre.
 *
 * El nombre depende también del ORIGEN, y por eso es una función y no una tabla
 * por destino: ir a `IN_PROGRESS` desde la espera del cliente no es "empezar",
 * es retomar un ticket que ya estaba en marcha (ADR-0029).
 */
export function accionesDesde(from: TicketStatus): AccionDeEstado[] {
  return ALLOWED_TRANSITIONS[from].map((to) => ({
    to,
    label:
      from === 'WAITING_ON_CUSTOMER' && to === 'IN_PROGRESS'
        ? 'Retomar'
        : ACCION[to],
  }));
}
