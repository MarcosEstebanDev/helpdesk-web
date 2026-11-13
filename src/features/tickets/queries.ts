'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import * as api from '@/features/tickets/api';
import type { FiltrosDeBandeja } from '@/features/tickets/filters';
import { ApiError } from '@/lib/api/client';
import { ticketKeys, ticketMutationKeys } from '@/lib/query/keys';
import type {
  CommentVisibility,
  TicketPriority,
  TicketStatus,
} from '@/lib/api/types';

const PAGE_SIZE = 20;

/**
 * Bandeja paginada **por cursor** (ADR del backend: nada de offset).
 *
 * Con offset, insertar un ticket mientras alguien pagina desplaza la ventana y
 * se acaba viendo el mismo ticket dos veces o saltándose uno. En un sistema
 * donde los tickets entran solos —los crea el worker, los crea el email— eso no
 * es un caso raro: es el caso normal.
 */
export function useTickets(filtros: FiltrosDeBandeja = {}) {
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

/**
 * Números de las pestañas. Se le quita el estado a los filtros ANTES de armar
 * la clave: así cambiar de pestaña no pide los conteos otra vez.
 */
export function useTicketCounts(filtros: FiltrosDeBandeja = {}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { status, ...sinEstado } = filtros;
  return useQuery({
    queryKey: ticketKeys.counts(sinEstado),
    queryFn: () => api.countTickets(sinEstado),
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
    // No se reintentan los 4xx. El default de TanStack Query es `retry: 1`, así
    // que un 403 —rol cambiado, sesión vieja— dispararía dos peticiones contra
    // el mismo "no". Los 5xx sí se reintentan: ahí el retry sirve para algo.
    retry: (intentos, error) =>
      !(error instanceof ApiError && error.status < 500) && intentos < 1,
  });
}

/**
 * Sugerencia de la IA. La actualiza el evento `ticket.triaged` del WebSocket;
 * ademas, MIENTRAS esta `pending`, se vuelve a pedir cada 5 s. No es
 * desconfianza del socket: si esta caido, la tarjeta se quedaria en
 * "Analizando" para siempre. En cuanto llega `ready` o `null`, deja de consultar.
 */
export function useTicketTriage(ticketId: string, habilitado: boolean) {
  return useQuery({
    queryKey: ticketKeys.triage(ticketId),
    queryFn: () => api.getTriage(ticketId),
    enabled: habilitado,
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' ? 5_000 : false,
    retry: (intentos, error) =>
      !(error instanceof ApiError && error.status < 500) && intentos < 1,
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
    mutationFn: (input: { body: string; visibility: CommentVisibility }) =>
      api.addComment(ticketId, input),
    // Las listas también: la primera respuesta del equipo cambia el SLA que
    // muestra la fila de la bandeja.
    onSuccess: () => invalidarTicket(queryClient, ticketId),
  });
}

export function useChangeStatus(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ticketMutationKeys.cambioDeEstado(ticketId),
    mutationFn: (status: TicketStatus) => api.changeStatus(ticketId, status),
    onSuccess: () => invalidarTicket(queryClient, ticketId),
  });
}

/** La respuesta salió, pero el ticket no pasó a la espera. */
export class EsperaNoAplicada extends Error {
  constructor(readonly causa: unknown) {
    super('La respuesta se envió, pero el ticket no pasó a esperar al cliente');
  }
}

/**
 * "Responder y esperar al cliente" (UX 2026-11-13) como UNA mutación.
 *
 * Los dos pasos van dentro de `mutationFn`, y los avisos en las opciones del
 * hook, no en las de `mutate()`: TanStack Query v5 NO ejecuta los callbacks de
 * `mutate()` si el componente se desmontó, así que con el cambio de estado
 * encadenado ahí, volver a la bandeja enseguida dejaba la respuesta enviada y
 * el ticket sin pasar a la espera, sin aviso. Orden y regla: si la respuesta
 * no sale, el estado no se toca (pausaría el SLA por una pregunta que el
 * cliente nunca recibió).
 *
 * Comparte `mutationKey` con `useChangeStatus`: mientras corre, los botones de
 * estado de la cabecera se deshabilitan.
 */
export function useResponderYEsperar(
  ticketId: string,
  avisos: { onExito: () => void; onError: (error: unknown) => void },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ticketMutationKeys.cambioDeEstado(ticketId),
    mutationFn: async (body: string) => {
      await api.addComment(ticketId, { body, visibility: 'PUBLIC' });
      try {
        await api.changeStatus(ticketId, 'WAITING_ON_CUSTOMER');
      } catch (e) {
        throw new EsperaNoAplicada(e);
      }
    },
    onSuccess: avisos.onExito,
    onError: avisos.onError,
    // Aun si falló el segundo paso, el comentario existe: hay que refrescar.
    onSettled: () => invalidarTicket(queryClient, ticketId),
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
