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

export interface AuditEntry {
  id: string;
  actorId: string;
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
