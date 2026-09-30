'use client';

import { useQuery } from '@tanstack/react-query';
import * as api from '@/features/members/api';
import { ApiError } from '@/lib/api/client';
import { memberKeys } from '@/lib/query/keys';

/** Cinco minutos: el personal de una organización no cambia entre dos clics. */
const CINCO_MINUTOS = 5 * 60 * 1000;

export function useMembers(habilitado: boolean) {
  return useQuery({
    queryKey: memberKeys.list(),
    queryFn: api.listMembers,
    enabled: habilitado,
    staleTime: CINCO_MINUTOS,
    // Igual que el historial: un 4xx es una respuesta, no un fallo transitorio.
    // Reintentarlo solo duplica la petición contra el mismo "no".
    retry: (intentos, error) =>
      !(error instanceof ApiError && error.status < 500) && intentos < 1,
  });
}
