'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/features/views/api';
import { ApiError } from '@/lib/api/client';
import { viewKeys } from '@/lib/query/keys';
import type { ViewFilters } from '@/lib/api/types';

/** `habilitado` = el usuario es del equipo; a un VIEWER ni se le pide (403). */
export function useViews(habilitado: boolean) {
  return useQuery({
    queryKey: viewKeys.all,
    queryFn: api.listViews,
    enabled: habilitado,
    staleTime: 60 * 1000,
    retry: (intentos, error) =>
      !(error instanceof ApiError && error.status < 500) && intentos < 1,
  });
}

function useInvalidar() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: viewKeys.all });
}

export function useCreateView() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (input: { name: string; filters: ViewFilters; shared: boolean }) =>
      api.createView(input),
    onSuccess: invalidar,
  });
}

export function useUpdateView() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name: string; filters: ViewFilters }) =>
      api.updateView(id, input),
    onSuccess: invalidar,
  });
}

export function useDeleteView() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: string) => api.deleteView(id),
    onSuccess: invalidar,
  });
}
