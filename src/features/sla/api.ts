import { apiFetch } from '@/lib/api/client';
import type { EffectiveSlaTarget, TicketPriority } from '@/lib/api/types';

/**
 * Configuración de SLA de la organización. **Todo pide ADMIN, incluida la
 * lectura** (Decisión 6 del ADR-0020): no se está mirando un ticket, se está
 * mirando lo que la organización se comprometió a cumplir.
 */
export function getSlaPolicy(): Promise<EffectiveSlaTarget[]> {
  return apiFetch<EffectiveSlaTarget[]>('/sla-policy');
}

export function updateSlaPolicy(
  priority: TicketPriority,
  target: { responseMinutes: number; resolutionMinutes: number },
): Promise<EffectiveSlaTarget[]> {
  return apiFetch<EffectiveSlaTarget[]>(`/sla-policy/${priority}`, {
    method: 'PUT',
    body: JSON.stringify(target),
  });
}

/** Vuelve al objetivo de fábrica; no borra la prioridad. */
export function resetSlaPolicy(
  priority: TicketPriority,
): Promise<EffectiveSlaTarget[]> {
  return apiFetch<EffectiveSlaTarget[]>(`/sla-policy/${priority}`, {
    method: 'DELETE',
  });
}
