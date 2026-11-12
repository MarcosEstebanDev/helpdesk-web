import { apiFetch } from '@/lib/api/client';
import type { Tag, TagColor, TagList } from '@/lib/api/types';

/**
 * Etiquetas (ADR-0031 del backend). Leer, crear y etiquetar piden AGENT;
 * renombrar, recolorear y borrar, ADMIN. Un VIEWER recibe 403: quien llame
 * tiene que haber mirado el rol antes.
 */
export function listTags(): Promise<TagList> {
  return apiFetch<TagList>('/tags');
}

export function createTag(input: { name: string; color?: TagColor }): Promise<Tag> {
  return apiFetch<Tag>('/tags', { method: 'POST', body: JSON.stringify(input) });
}

export function updateTag(
  id: string,
  input: { name?: string; color?: TagColor },
): Promise<Tag> {
  return apiFetch<Tag>(`/tags/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteTag(id: string): Promise<void> {
  return apiFetch<void>(`/tags/${id}`, { method: 'DELETE' });
}

/** Reemplaza el conjunto entero de etiquetas del ticket (máx. 10). */
export function setTicketTags(
  ticketId: string,
  tagIds: string[],
): Promise<{ tags: Tag[] }> {
  return apiFetch<{ tags: Tag[] }>(`/tickets/${ticketId}/tags`, {
    method: 'PUT',
    body: JSON.stringify({ tagIds }),
  });
}
