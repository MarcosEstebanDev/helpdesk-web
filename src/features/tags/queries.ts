'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/features/tags/api';
import { ApiError } from '@/lib/api/client';
import { tagKeys, ticketKeys } from '@/lib/query/keys';
import type { TagColor } from '@/lib/api/types';

const UN_MINUTO = 60 * 1000;

/** `habilitado` = el usuario es del equipo; a un VIEWER ni se le pide (403). */
export function useTags(habilitado: boolean) {
  return useQuery({
    queryKey: tagKeys.all,
    queryFn: api.listTags,
    enabled: habilitado,
    staleTime: UN_MINUTO,
    retry: (intentos, error) =>
      !(error instanceof ApiError && error.status < 500) && intentos < 1,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; color?: TagColor }) => api.createTag(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tagKeys.all }),
  });
}

/**
 * Renombrar o borrar cambia cómo se pinta CADA ticket que la usa, y el backend
 * no emite un evento por ticket (sería una tormenta): se invalidan los dos.
 */
function useInvalidarCatalogoYTickets() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: tagKeys.all });
    await queryClient.invalidateQueries({ queryKey: ticketKeys.all });
  };
}

export function useUpdateTag() {
  const invalidar = useInvalidarCatalogoYTickets();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: { name?: string; color?: TagColor };
    }) => api.updateTag(id, input),
    onSuccess: invalidar,
  });
}

export function useDeleteTag() {
  const invalidar = useInvalidarCatalogoYTickets();
  return useMutation({
    mutationFn: (id: string) => api.deleteTag(id),
    onSuccess: invalidar,
  });
}

export function useSetTicketTags(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tagIds: string[]) => api.setTicketTags(ticketId, tagIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
      await queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
    },
  });
}
