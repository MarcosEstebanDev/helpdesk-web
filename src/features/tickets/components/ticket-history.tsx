'use client';

import { ArrowRight } from 'lucide-react';
import { Avatar, ErrorText, Skeleton } from '@/components/ui/primitives';
import { useSession } from '@/features/auth/session';
import { describirEntrada, etiquetaDelActor } from '@/features/tickets/audit';
import {
  FechaRelativa,
  StatusBadge,
} from '@/features/tickets/components/ticket-badges';
import { useTicketHistory } from '@/features/tickets/queries';
import { ApiError } from '@/lib/api/client';
import { fechaCorta } from '@/lib/format/relative-time';
import type { Directorio } from '@/features/members/directory';
import type { AuditEntry, TicketDetail } from '@/lib/api/types';

const PRIORIDAD_TEXTO = {
  LOW: 'baja',
  NORMAL: 'normal',
  HIGH: 'alta',
  URGENT: 'urgente',
} as const;

const RELOJ_TEXTO = {
  RESPONSE: 'primera respuesta',
  RESOLUTION: 'resolución',
} as const;

/**
 * Rastro de auditoría del ticket.
 *
 * Se pide **solo cuando la pestaña está abierta** (`habilitado`): es un registro
 * secundario, y traerlo al montar el detalle sería una petición extra en cada
 * apertura de ticket para algo que casi nadie mira. Una vez cargado queda en
 * caché, así que alternar entre pestañas no vuelve a pedir nada.
 *
 * Tampoco hace falta invalidarlo a mano desde el WebSocket: `ticketKeys.history`
 * cuelga de `ticketKeys.detail`, así que la invalidación que ya existe lo
 * alcanza.
 */
export function TicketHistory({
  ticket,
  directorio,
  habilitado,
}: {
  ticket: TicketDetail;
  directorio: Directorio;
  habilitado: boolean;
}) {
  const { user } = useSession();
  const { data, isPending, isError, error } = useTicketHistory(
    ticket.id,
    habilitado,
  );

  if (!habilitado || isPending) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((fila) => (
          <div key={fila} className="flex items-center gap-2.5">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-3 w-56" />
          </div>
        ))}
        <span className="sr-only" role="status">
          Cargando el historial
        </span>
      </div>
    );
  }

  if (isError) {
    // El gating por rol ya evita ofrecer la pestaña a quien no puede verla, pero
    // si igual llega un 403 (rol cambiado en otra pestaña, sesión vieja) se
    // explica en vez de escupir el texto crudo de la API.
    const esProhibido = error instanceof ApiError && error.status === 403;
    return (
      <ErrorText>
        {esProhibido
          ? 'El historial es solo para agentes.'
          : error instanceof ApiError
            ? error.message
            : 'No se pudo cargar el historial.'}
      </ErrorText>
    );
  }

  if (data.length === 0) {
    // Vacío no es lo mismo que error: un ticket recién creado por una vía que no
    // audita puede no tener entradas todavía.
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay actividad registrada.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ol className="space-y-3">
        {data.map((entrada) => (
          <Entrada
            key={entrada.id}
            entrada={entrada}
            ticket={ticket}
            miId={user?.id}
            directorio={directorio}
          />
        ))}
      </ol>

      {/*
        La API devuelve el historial de lo más nuevo a lo más viejo, y así se
        respeta: en un registro de auditoría lo último es lo que se busca. Pero
        los comentarios de la otra pestaña van al revés, y tener dos órdenes
        distintos en la misma zona sin avisar es una trampa. Por eso se dice.
      */}
      <p className="border-t border-border pt-2 text-xs text-muted-foreground">
        De lo más reciente a lo más antiguo.
      </p>
    </div>
  );
}

function Entrada({
  entrada,
  ticket,
  miId,
  directorio,
}: {
  entrada: AuditEntry;
  ticket: TicketDetail;
  miId: string | undefined;
  directorio: Directorio;
}) {
  const d = describirEntrada(entrada, {
    miId,
    requesterId: ticket.requesterId,
    assigneeId: ticket.assigneeId,
  });

  return (
    <li className="flex items-start gap-2.5">
      <Avatar variante={d.papel === 'vos' ? 'vos' : 'otro'} aria-hidden />

      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-semibold">
            {etiquetaDelActor(entrada.actorId, d.papel, directorio)}
          </span>
          <span>{d.frase}</span>
          {d.prioridad ? (
            <span className="text-muted-foreground">
              con prioridad {PRIORIDAD_TEXTO[d.prioridad]}
            </span>
          ) : null}
          <span className="text-xs text-muted-foreground">
            <FechaRelativa iso={entrada.occurredAt} />
          </span>
        </p>

        {d.transicion ? (
          <span className="flex items-center gap-1.5">
            <StatusBadge status={d.transicion.desde} />
            <ArrowRight className="size-3 text-muted-foreground" aria-hidden />
            <StatusBadge status={d.transicion.hasta} />
          </span>
        ) : null}

        {d.reloj ? (
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            {RELOJ_TEXTO[d.reloj.kind]}, vencía el {fechaCorta(d.reloj.dueAt)}
          </p>
        ) : null}

        {d.accionCruda ? (
          <p className="font-mono text-xs text-muted-foreground">
            {d.accionCruda}
          </p>
        ) : null}
      </div>
    </li>
  );
}
