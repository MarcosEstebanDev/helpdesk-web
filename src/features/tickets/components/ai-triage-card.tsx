'use client';

import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, Skeleton } from '@/components/ui/primitives';
import { Tooltip } from '@/components/ui/tooltip';
import {
  FechaRelativa,
  PriorityLabel,
} from '@/features/tickets/components/ticket-badges';
import {
  CATEGORIA_IA,
  IDIOMA_IA,
  TONO_IA,
  etiqueta,
} from '@/features/tickets/ai-labels';
import { useTicketTriage } from '@/features/tickets/queries';
import type { TicketPriority, TicketTriage } from '@/lib/api/types';

/** Contenedor: solo pide la sugerencia si quien mira es del equipo. */
export function AiTriagePanel({
  ticketId,
  prioridadActual,
  esAgente,
}: {
  ticketId: string;
  prioridadActual: TicketPriority;
  esAgente: boolean;
}) {
  // Para un VIEWER ni se hace la petición: el backend respondería 403, y la
  // sugerencia incluye el tono que la IA le atribuye al cliente.
  const { data, isPending, isError } = useTicketTriage(ticketId, esAgente);
  if (!esAgente) return null;

  return (
    <AiTriageCard
      estado={isError ? 'error' : isPending ? 'cargando' : data}
      prioridadActual={prioridadActual}
    />
  );
}

type Estado = TicketTriage | null | 'cargando' | 'error';

/**
 * Tarjeta de la sugerencia. Presentacional: recibe el estado ya resuelto.
 *
 * Cuatro estados y ninguno se adorna. `null` (404) no es un fallo, es "no hay
 * sugerencia", y se dice así; un error de red sí se distingue, porque no es lo
 * mismo que la IA esté apagada que no poder preguntarle.
 */
export function AiTriageCard({
  estado,
  prioridadActual,
}: {
  estado: Estado;
  prioridadActual: TicketPriority;
}) {
  return (
    <section className="space-y-2" aria-labelledby="ia-titulo">
      <h2
        id="ia-titulo"
        className="flex items-center gap-1.5 px-1 text-xs font-semibold text-muted-foreground"
      >
        <Sparkles className="size-3.5" aria-hidden />
        Sugerencia de la IA
        <Tooltip contenido="La genera un modelo automáticamente. Es orientativa: no cambia el ticket.">
          <span
            tabIndex={0}
            className="cursor-help rounded-full px-1 text-[0.65rem] leading-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Qué es esto"
          >
            ⓘ
          </span>
        </Tooltip>
      </h2>
      <Card className="p-3 text-sm">
        <Contenido estado={estado} prioridadActual={prioridadActual} />
      </Card>
    </section>
  );
}

function Contenido({
  estado,
  prioridadActual,
}: {
  estado: Estado;
  prioridadActual: TicketPriority;
}) {
  if (estado === 'cargando') {
    return (
      <div className="space-y-2" aria-hidden>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (estado === 'error') {
    return (
      <p className="text-xs text-muted-foreground">
        No se pudo consultar la sugerencia.
      </p>
    );
  }

  if (estado === null) {
    return (
      <p className="text-xs text-muted-foreground">
        Este ticket no tiene sugerencia de la IA.
      </p>
    );
  }

  if (estado.status === 'disabled') {
    return (
      <p className="text-xs text-muted-foreground">La IA no está disponible.</p>
    );
  }

  if (estado.status === 'pending') {
    return (
      <p role="status" className="text-xs text-muted-foreground">
        Analizando el ticket…
      </p>
    );
  }

  const difiere = estado.suggestedPriority !== prioridadActual;

  return (
    <div className="space-y-3">
      <dl className="space-y-2">
        <Fila etiqueta="Categoría">
          {etiqueta(CATEGORIA_IA, estado.category)}
        </Fila>
        <Fila etiqueta="Prioridad">
          <span className="flex flex-wrap items-center gap-x-2">
            <PriorityLabel priority={estado.suggestedPriority} />
            {difiere ? (
              <span className="text-xs text-muted-foreground">
                (actual: <PrioridadTexto priority={prioridadActual} />)
              </span>
            ) : null}
          </span>
        </Fila>
        <Fila etiqueta="Tono">
          {etiqueta(TONO_IA, estado.sentiment)} · {etiqueta(IDIOMA_IA, estado.language)}
        </Fila>
      </dl>
      {/* Trazabilidad visible: quien lee sabe que lo dijo una máquina, cuál y
          con qué versión del prompt. */}
      <p className="text-xs text-muted-foreground">
        {estado.model} · {estado.promptVersion} ·{' '}
        <FechaRelativa iso={estado.triagedAt} />
      </p>
    </div>
  );
}

const PRIORIDAD_CORTA: Record<TicketPriority, string> = {
  LOW: 'baja',
  NORMAL: 'normal',
  HIGH: 'alta',
  URGENT: 'urgente',
};

function PrioridadTexto({ priority }: { priority: TicketPriority }) {
  return <>{PRIORIDAD_CORTA[priority]}</>;
}

function Fila({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-2">
      <dt className="text-xs font-semibold text-muted-foreground">{etiqueta}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
