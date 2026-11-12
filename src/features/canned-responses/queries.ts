'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/features/canned-responses/api';
import { ApiError } from '@/lib/api/client';
import { cannedResponseKeys } from '@/lib/query/keys';
import type { CannedResponseInput } from '@/lib/api/types';

/**
 * Las plantillas cambian poco y se abren en cada ticket: un minuto de frescura
 * alcanza, y guardar desde Configuración invalida la clave igual.
 */
const UN_MINUTO = 60 * 1000;

/** `habilitado` = el usuario es del equipo; a un VIEWER ni se le pide (403). */
export function useCannedResponses(habilitado: boolean) {
  return useQuery({
    queryKey: cannedResponseKeys.all,
    queryFn: api.listCannedResponses,
    enabled: habilitado,
    staleTime: UN_MINUTO,
    retry: (intentos, error) =>
      !(error instanceof ApiError && error.status < 500) && intentos < 1,
  });
}

function useInvalidar() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: cannedResponseKeys.all });
}

export function useCreateCannedResponse() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (input: CannedResponseInput) => api.createCannedResponse(input),
    onSuccess: invalidar,
  });
}

export function useUpdateCannedResponse() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CannedResponseInput }) =>
      api.updateCannedResponse(id, input),
    onSuccess: invalidar,
  });
}

export function useDeleteCannedResponse() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: string) => api.deleteCannedResponse(id),
    onSuccess: invalidar,
  });
}
