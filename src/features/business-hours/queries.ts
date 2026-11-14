'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/features/business-hours/api';
import { ApiError } from '@/lib/api/client';
import { businessHoursKeys } from '@/lib/query/keys';
import type { BusinessHoursInput, CalendarException } from '@/lib/api/types';

const sinReintentar4xx = (intentos: number, error: unknown) =>
  !(error instanceof ApiError && error.status < 500) && intentos < 1;

/** Solo ADMIN: a cualquier otro el backend le responde 403. */
export function useBusinessHours(habilitado: boolean) {
  return useQuery({
    queryKey: businessHoursKeys.config,
    queryFn: api.getBusinessHours,
    enabled: habilitado,
    retry: sinReintentar4xx,
  });
}

/**
 * Si se atiende ahora y cuándo se abre. Se vuelve a pedir cada 5 minutos: el
 * aviso al cliente tiene que dejar de decir "cerrado" cuando abre la oficina
 * aunque la pantalla siga abierta, y el backend no emite un evento por eso.
 */
export function useBusinessStatus(habilitado: boolean) {
  return useQuery({
    queryKey: businessHoursKeys.status,
    queryFn: api.getBusinessStatus,
    enabled: habilitado,
    refetchInterval: 5 * 60 * 1000,
    retry: sinReintentar4xx,
  });
}

/** Cambiar el horario cambia también el estado: se invalida todo lo del horario. */
function useInvalidarHorario() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: businessHoursKeys.all });
}

export function useUpdateBusinessHours() {
  const invalidar = useInvalidarHorario();
  return useMutation({
    mutationFn: (input: BusinessHoursInput) => api.updateBusinessHours(input),
    onSuccess: invalidar,
  });
}

export function useAddCalendarException() {
  const invalidar = useInvalidarHorario();
  return useMutation({
    mutationFn: (input: Omit<CalendarException, 'id'>) => api.addCalendarException(input),
    onSuccess: invalidar,
  });
}

export function useRemoveCalendarException() {
  const invalidar = useInvalidarHorario();
  return useMutation({
    mutationFn: (id: string) => api.removeCalendarException(id),
    onSuccess: invalidar,
  });
}

export function useLoadNationalHolidays() {
  const invalidar = useInvalidarHorario();
  return useMutation({
    mutationFn: (year: number) => api.loadNationalHolidays(year),
    onSuccess: invalidar,
  });
}
