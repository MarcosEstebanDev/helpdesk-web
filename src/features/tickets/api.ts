import { apiFetch } from '@/lib/api/client';
import type {
  AuditEntry,
  TicketDetail,
  TicketPage,
  TicketPriority,
  TicketStatus,
  TicketSummary,
} from '@/lib/api/types';

export interface ListTicketsParams {
  status?: TicketStatus;
  assigneeId?: string;
  limit?: number;
  /** Id del último ticket recibido (paginación por cursor, no por offset). */
  cursor?: string;
}

export function listTickets(params: ListTicketsParams): Promise<TicketPage> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.assigneeId) query.set('assigneeId', params.assigneeId);
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
