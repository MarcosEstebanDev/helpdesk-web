import { describe, expect, it, vi } from 'vitest';
import {
  addCalendarException,
  getBusinessStatus,
  loadNationalHolidays,
  removeCalendarException,
  updateBusinessHours,
} from './api';
import { apiFetch } from '@/lib/api/client';

vi.mock('@/lib/api/client', async (original) => ({
  ...(await original<typeof import('@/lib/api/client')>()),
  apiFetch: vi.fn().mockResolvedValue({}),
}));

describe('API del horario laboral (ADR-0034)', () => {
  it('guarda la semana con PUT', async () => {
    const input = {
      mode: 'business_hours' as const,
      timeZone: 'America/Argentina/Buenos_Aires',
      weekdays: [1, 2, 3, 4, 5],
      opensAt: '08:00',
      closesAt: '18:00',
    };
    await updateBusinessHours(input);
    expect(apiFetch).toHaveBeenLastCalledWith('/business-hours', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  });

  it('agrega, borra y precarga feriados en sus rutas', async () => {
    await addCalendarException({ date: '2026-12-25', working: false, name: 'Navidad' });
    expect(apiFetch).toHaveBeenLastCalledWith('/business-hours/exceptions', {
      method: 'POST',
      body: JSON.stringify({ date: '2026-12-25', working: false, name: 'Navidad' }),
    });
    await removeCalendarException('abc');
    expect(apiFetch).toHaveBeenLastCalledWith('/business-hours/exceptions/abc', {
      method: 'DELETE',
    });
    await loadNationalHolidays(2027);
    expect(apiFetch).toHaveBeenLastCalledWith('/business-hours/holidays/2027', {
      method: 'POST',
    });
  });

  it('el estado se pide a su propia ruta (la que puede pedir el cliente)', async () => {
    await getBusinessStatus();
    expect(apiFetch).toHaveBeenLastCalledWith('/business-hours/status');
  });
});
