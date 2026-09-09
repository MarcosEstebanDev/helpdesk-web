/**
 * Claves canónicas de TanStack Query.
 *
 * Existen antes que las pantallas que las van a usar, y con motivo: el realtime
 * invalida caché por clave, así que si cada feature se inventara la suya, un
 * mensaje del servidor invalidaría algo que nadie está leyendo y la pantalla se
 * quedaría desactualizada sin que fallara nada. Al centralizarlas, "qué se
 * refresca cuando pasa X" es una decisión de un solo sitio.
 *
 * La jerarquía es la convención habitual: invalidar `ticketKeys.all` alcanza a
 * listas y detalles, `ticketKeys.lists()` solo a las listas, y
 * `ticketKeys.detail(id)` a un ticket concreto.
 */
export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (filtros: Record<string, unknown> = {}) =>
    [...ticketKeys.lists(), filtros] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (ticketId: string) => [...ticketKeys.details(), ticketId] as const,
  /** Rastro de auditoría de un ticket (`GET /tickets/:id/history`). */
  history: (ticketId: string) =>
    [...ticketKeys.detail(ticketId), 'history'] as const,
};

/** Configuración de SLA de la organización (`GET /sla-policy`, solo ADMIN). */
export const slaKeys = {
  policy: ['sla', 'policy'] as const,
};
