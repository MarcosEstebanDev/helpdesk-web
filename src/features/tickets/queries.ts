'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import * as api from '@/features/tickets/api';
import { ticketKeys } from '@/lib/query/keys';
import type { TicketPriority, TicketStatus } from '@/lib/api/types';

const PAGE_SIZE = 20;

/**
 * Bandeja paginada **por cursor** (ADR del backend: nada de offset).
 *
 * Con offset, insertar un ticket mientras alguien pagina desplaza la ventana y
 * se acaba viendo el mismo ticket dos veces o saltándose uno. En un sistema
 * donde los tickets entran solos —los crea el worker, los crea el email— eso no
 * es un caso raro: es el caso normal.
 */
export function useTickets(filtros: { status?: TicketStatus } = {}) {
  return useInfiniteQuery({
    queryKey: ticketKeys.list(filtros),
    queryFn: ({ pageParam }) =>
      api.listTickets({
        ...filtros,
        limit: PAGE_SIZE,
        cursor: pageParam ?? undefined,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (ultima) => ultima.nextCursor,
  });
}

export function useTicket(ticketId: string) {
  return useQuery({
    queryKey: ticketKeys.detail(ticketId),
    queryFn: () => api.getTicket(ticketId),
  });
}

export function useTicketHistory(ticketId: string, habilitado: boolean) {
  return useQuery({
    queryKey: ticketKeys.history(ticketId),
    queryFn: () => api.getHistory(ticketId),
    enabled: habilitado,
  });
}

/**
 * Las mutaciones invalidan igual que lo haría el WebSocket.
 *
 * Es redundante a propósito: el evento de realtime llega por el outbox, o sea
 * unos milisegundos después y solo si el socket está conectado. Esperar a que
 * llegue para refrescar dejaría al usuario mirando su propio cambio sin efecto
 * cuando el tiempo real está caído. Invalidar dos veces no cuesta nada.
 */
export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      subject: string;
      description: string;
      priority?: TicketPriority;
    }) => api.createTicket(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
    },
  });
}

export function useAddComment(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => api.addComment(ticketId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ticketKeys.detail(ticketId),
      });
    },
  });
}

export function useChangeStatus(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: TicketStatus) => api.changeStatus(ticketId, status),
    onSuccess: () => invalidarTicket(queryClient, ticketId),
  });
}

export function useAssignment(ticketId: string) {
  const queryClient = useQueryClient();

  const asignar = useMutation({
    mutationFn: (assigneeId: string) => api.assignTicket(ticketId, assigneeId),
    onSuccess: () => invalidarTicket(queryClient, ticketId),
  });

  const desasignar = useMutation({
    mutationFn: () => api.unassignTicket(ticketId),
    onSuccess: () => invalidarTicket(queryClient, ticketId),
  });

  return { asignar, desasignar };
}

function invalidarTicket(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketId: string,
) {
  void queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
  void queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
}
