import { apiFetch } from '@/lib/api/client';
import type { SavedView, SavedViewList, ViewFilters } from '@/lib/api/types';

/** Vistas guardadas (ADR-0033 del backend). Todo pide AGENT o superior. */
export function listViews(): Promise<SavedViewList> {
  return apiFetch<SavedViewList>('/views');
}

export function createView(input: {
  name: string;
  filters: ViewFilters;
  shared: boolean;
}): Promise<SavedView> {
  return apiFetch<SavedView>('/views', { method: 'POST', body: JSON.stringify(input) });
}

export function updateView(
  id: string,
  input: { name: string; filters: ViewFilters },
): Promise<SavedView> {
  return apiFetch<SavedView>(`/views/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteView(id: string): Promise<void> {
  return apiFetch<void>(`/views/${id}`, { method: 'DELETE' });
}
