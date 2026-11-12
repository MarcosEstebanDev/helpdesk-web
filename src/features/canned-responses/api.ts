import { apiFetch } from '@/lib/api/client';
import type {
  CannedResponse,
  CannedResponseInput,
  CannedResponseList,
} from '@/lib/api/types';

/**
 * Respuestas predefinidas (ADR-0030 del backend). Listar pide AGENT: un VIEWER
 * recibe 403, así que quien llame tiene que haber mirado el rol antes. Crear,
 * editar y borrar piden ADMIN.
 */
export function listCannedResponses(): Promise<CannedResponseList> {
  return apiFetch<CannedResponseList>('/canned-responses');
}

export function createCannedResponse(
  input: CannedResponseInput,
): Promise<CannedResponse> {
  return apiFetch<CannedResponse>('/canned-responses', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateCannedResponse(
  id: string,
  input: CannedResponseInput,
): Promise<CannedResponse> {
  return apiFetch<CannedResponse>(`/canned-responses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteCannedResponse(id: string): Promise<void> {
  return apiFetch<void>(`/canned-responses/${id}`, { method: 'DELETE' });
}
