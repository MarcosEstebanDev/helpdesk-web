/**
 * Espejo de los DTOs del backend.
 *
 * Igual que el contrato del WebSocket, **se mantiene a mano**: el ADR-0004 dice
 * que el cliente tipado se genera desde el OpenAPI, y eso sigue pendiente. Hasta
 * entonces, un cambio en los DTOs de `helpdesk-api` no rompe la compilación aquí.
 *
 * Las fechas llegan como string ISO-8601 (JSON no tiene tipo fecha), aunque en
 * el backend estén declaradas como `Date`.
 */

export const TICKET_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export type Role = 'ADMIN' | 'AGENT' | 'VIEWER';

/**
 * Transiciones legales (ADR-0015 del backend). Se replican para no ofrecer
 * botones que van a devolver 409, pero **el backend sigue siendo la autoridad**:
 * esto es UX, no validación.
 */
export const ALLOWED_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> =
  {
    OPEN: ['IN_PROGRESS', 'RESOLVED'],
    IN_PROGRESS: ['RESOLVED', 'OPEN'],
    RESOLVED: ['CLOSED', 'OPEN'],
    CLOSED: [],
  };

// ------------------------------------------------------------------- auth

export interface AuthResponse {
  accessToken: string;
}

export interface MeResponse {
  userId: string;
  tenantId: string;
  role: Role;
}

// ---------------------------------------------------------------- tickets

export interface TicketSummary {
  id: string;
  /** Correlativo POR organización, no global (ADR-0017). */
  number: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  requesterId: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketComment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export type SlaKind = 'RESPONSE' | 'RESOLUTION';
export type SlaStatus = 'running' | 'met' | 'breached';

export interface TicketSla {
  kind: SlaKind;
  dueAt: string;
  stoppedAt: string | null;
  breachedAt: string | null;
  status: SlaStatus;
  /** Negativo si se pasó del objetivo. */
  remainingMinutes: number;
}

export interface TicketDetail extends TicketSummary {
  description: string;
  resolvedAt: string | null;
  closedAt: string | null;
  comments: TicketComment[];
  /**
   * Vacío en los tickets anteriores a la fase 6 y en los que el worker todavía
   * no procesó: el backend no miente diciendo que cumplen.
   */
  sla: TicketSla[];
}

export interface TicketPage {
  items: TicketSummary[];
  /** `null` cuando no hay más páginas. */
  nextCursor: string | null;
}

/**
 * Acciones del rastro de auditoría, espejadas a mano desde `AUDIT_ACTIONS` del
 * backend. Como todo `types.ts`, esto NO lo genera nadie: si allá aparece una
 * acción nueva, acá no rompe la compilación — llega como una cadena que no está
 * en la lista. Por eso `describirEntrada` tiene un caso por defecto que la
 * muestra tal cual en vez de tragársela.
 */
export const AUDIT_ACTIONS = [
  'ticket.created',
  'ticket.assigned',
  'ticket.unassigned',
  'ticket.status_changed',
  'ticket.priority_changed',
  'comment.added',
  'sla.breached',
  'sla.policy_changed',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * UUID reservado para las acciones que no hizo una persona (ADR-0019).
 *
 * `audit_logs.actor_id` no tiene clave foránea a `users` justamente para que la
 * auditoría sobreviva al borrado de lo que audita; el backend aprovecha esa
 * propiedad para tener un actor que no es un usuario. Que estos ceros
 * signifiquen "el sistema" es una convención documentada, no una deducción.
 */
export const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

export interface AuditEntry {
  id: string;
  actorId: string;
  /** Una de `AUDIT_ACTIONS`, pero se tipa ancho a propósito: el contrato se
      mantiene a ojo y el backend puede sumar acciones sin avisar. */
  action: string;
  metadata: unknown;
  occurredAt: string;
}

// -------------------------------------------------------------------- SLA

export interface EffectiveSlaTarget {
  priority: TicketPriority;
  responseMinutes: number;
  resolutionMinutes: number;
  /** `default` = el valor de fábrica; `organization` = pactado por el tenant. */
  source: 'default' | 'organization';
}
