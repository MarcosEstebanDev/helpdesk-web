import { apiFetch } from '@/lib/api/client';
import type {
  BusinessHours,
  BusinessHoursInput,
  BusinessStatus,
  CalendarException,
} from '@/lib/api/types';

/**
 * Horario laboral (ADR-0034 del backend). Todo pide ADMIN salvo el estado,
 * que cualquier rol puede pedir y solo dice si se atiende y cuándo se abre.
 */
export function getBusinessHours(): Promise<BusinessHours> {
  return apiFetch<BusinessHours>('/business-hours');
}

export function updateBusinessHours(input: BusinessHoursInput): Promise<BusinessHours> {
  return apiFetch<BusinessHours>('/business-hours', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function addCalendarException(
  input: Omit<CalendarException, 'id'>,
): Promise<CalendarException> {
  return apiFetch<CalendarException>('/business-hours/exceptions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function removeCalendarException(id: string): Promise<void> {
  return apiFetch<void>(`/business-hours/exceptions/${id}`, { method: 'DELETE' });
}

/** Solo el año actual y el siguiente; respeta lo ya cargado a mano. */
export function loadNationalHolidays(
  year: number,
): Promise<{ added: number; skipped: number }> {
  return apiFetch<{ added: number; skipped: number }>(
    `/business-hours/holidays/${year}`,
    { method: 'POST' },
  );
}

export function getBusinessStatus(): Promise<BusinessStatus> {
  return apiFetch<BusinessStatus>('/business-hours/status');
}
