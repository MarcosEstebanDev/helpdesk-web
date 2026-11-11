import { ApiError, apiFetch } from '@/lib/api/client';
import type {
  AuditEntry,
  TicketDetail,
  TicketPage,
  TicketPriority,
  TicketStatus,
  TicketSummary,
  TicketTriage,
} from '@/lib/api/types';

export interface ListTicketsParams {
  status?: TicketStatus;
  assigneeId?: string;
  requesterId?: string;
  /** Solo AGENT o superior: tickets donde la IA sugiere más urgencia. */
  aiSuggestsHigher?: true;
  limit?: number;
  /** Id del último ticket recibido (paginación por cursor, no por offset). */
  cursor?: string;
}

export function listTickets(params: ListTicketsParams): Promise<TicketPage> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.assigneeId) query.set('assigneeId', params.assigneeId);
  // Faltaba: el filtro "Los que abrí yo" de un VIEWER se armaba bien en
  // `filtrosDeBandeja` y se perdía acá, así que no filtraba nada.
  if (params.requesterId) query.set('requesterId', params.requesterId);
  if (params.aiSuggestsHigher) query.set('aiSuggestsHigher', 'true');
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.cursor) query.set('cursor', params.cursor);

  const qs = query.toString();
  return apiFetch<TicketPage>(`/tickets${qs ? `?${qs}` : ''}`);
}

export function getTicket(ticketId: string): Promise<TicketDetail> {
  return apiFetch<TicketDetail>(`/tickets/${ticketId}`);
}

/** Solo AGENT o superior: el rastro de auditoría no es para el solicitante. */
export function getHistory(ticketId: string): Promise<AuditEntry[]> {
  return apiFetch<AuditEntry[]>(`/tickets/${ticketId}/history`);
}

/**
 * Solo AGENT o superior. Un 404 NO es un error para la pantalla: significa que
 * no hay sugerencia (la IA esta apagada o el ticket es anterior a ella), y se
 * devuelve `null` para que la tarjeta lo diga en vez de pintar un fallo.
 */
export async function getTriage(ticketId: string): Promise<TicketTriage | null> {
  try {
    return await apiFetch<TicketTriage>(`/tickets/${ticketId}/triage`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export function createTicket(input: {
  subject: string;
  description: string;
  priority?: TicketPriority;
}): Promise<TicketSummary> {
  return apiFetch<TicketSummary>('/tickets', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function addComment(
  ticketId: string,
  body: string,
): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/tickets/${ticketId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export function assignTicket(
  ticketId: string,
  assigneeId: string,
): Promise<TicketSummary> {
  return apiFetch<TicketSummary>(`/tickets/${ticketId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ assigneeId }),
  });
}

export function unassignTicket(ticketId: string): Promise<TicketSummary> {
  return apiFetch<TicketSummary>(`/tickets/${ticketId}/assign`, {
    method: 'DELETE',
  });
}

export function changeStatus(
  ticketId: string,
  status: TicketStatus,
): Promise<TicketSummary> {
  return apiFetch<TicketSummary>(`/tickets/${ticketId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
