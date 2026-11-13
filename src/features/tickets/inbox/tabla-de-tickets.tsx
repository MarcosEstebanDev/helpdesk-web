'use client';

import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/primitives';
import { Tooltip } from '@/components/ui/tooltip';
import type { Directorio } from '@/features/members/directory';
import { TagDot } from '@/features/tags/components/tag-lozenge';
import {
  CATEGORIA_IA,
  PRIORIDAD_IA,
  direccion,
  etiqueta,
} from '@/features/tickets/ai-labels';
import { FechaRelativa } from '@/features/tickets/components/ticket-badges';
import { describirSla, iniciales, type TonoSla } from './presentacion';
import { ATRIBUTO_FILA, useNavegacionConTeclado } from './teclado';
import { cn } from '@/lib/utils';
import { useWs } from '@/providers/ws-provider';
import type { TicketPriority, TicketStatus, TicketSummary } from '@/lib/api/types';

/**
 * Columnas de la bandeja. El equipo ve siete; un VIEWER cuatro, porque el
 * backend no le manda etiquetas, email ni SLA — no se le arman columnas vacías.
 * Literales completos a propósito: Tailwind solo genera las clases que lee.
 */
const COLUMNAS = {
  equipo:
    'md:grid-cols-[3.5rem_minmax(0,1fr)_9rem_4rem_9.5rem_8.5rem_5rem]',
  cliente: 'md:grid-cols-[3.5rem_minmax(0,1fr)_9.5rem_5rem]',
} as const;

/** Cada minuto basta: el SLA más fino que se pinta es "vence en N min". */
function useAhora(cadaMs = 60_000): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), cadaMs);
    return () => clearInterval(id);
  }, [cadaMs]);
  return ahora;
}

/**
 * La bandeja como tabla (UX 2026-11-13). Principio: **el color solo para lo
 * que pide atención** — prioridad alta/urgente, SLA por vencer o vencido y
 * esperando al cliente. Todo lo demás, neutro y en columnas alineadas.
 *
 * Es una lista de enlaces y no un `<table>`: la fila entera es el enlace al
 * ticket, y un `<a>` no puede envolver un `<tr>`. En pantallas chicas cada
 * fila se vuelve una tarjeta.
 */
export function TablaDeTickets({
  tickets,
  esEquipo,
  miId,
  directorio,
}: {
  tickets: TicketSummary[];
  esEquipo: boolean;
  miId: string | undefined;
  directorio: Directorio;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  useNavegacionConTeclado(contenedor);
  const ahora = useAhora();
  const columnas = esEquipo ? COLUMNAS.equipo : COLUMNAS.cliente;

  return (
    <div
      ref={contenedor}
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <Encabezado columnas={columnas} esEquipo={esEquipo} />
      <ul aria-label="Tickets" className="divide-y divide-border">
        {tickets.map((t) => (
          <li key={t.id}>
            <Fila
              ticket={t}
              columnas={columnas}
              esEquipo={esEquipo}
              miId={miId}
              directorio={directorio}
              ahora={ahora}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Encabezado({ columnas, esEquipo }: { columnas: string; esEquipo: boolean }) {
  const celdas = esEquipo
    ? ['N.º', 'Asunto', 'Etiquetas', 'Asignado', 'Estado', 'SLA', 'Actualizado']
    : ['N.º', 'Asunto', 'Estado', 'Actualizado'];
  return (
    <div
      aria-hidden
      className={cn(
        'hidden gap-3 border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground md:grid',
        columnas,
      )}
    >
      {celdas.map((c) => (
        <span key={c} className={c === 'Actualizado' ? 'text-right' : undefined}>
          {c}
        </span>
      ))}
    </div>
  );
}

const BARRA: Partial<Record<TicketPriority, string>> = {
  URGENT: 'border-l-destructive',
  HIGH: 'border-l-warning-foreground',
};

const PRIORIDAD_TEXTO: Partial<Record<TicketPriority, string>> = {
  URGENT: 'Prioridad urgente',
  HIGH: 'Prioridad alta',
};

function Fila({
  ticket,
  columnas,
  esEquipo,
  miId,
  directorio,
  ahora,
}: {
  ticket: TicketSummary;
  columnas: string;
  esEquipo: boolean;
  miId: string | undefined;
  directorio: Directorio;
  ahora: Date;
}) {
  const { cambiosRecientes } = useWs();
  const recienCambiado = cambiosRecientes[ticket.id] !== undefined;
  const prioridad = PRIORIDAD_TEXTO[ticket.priority];

  return (
    <Link
      href={`/tickets/${ticket.id}`}
      {...{ [ATRIBUTO_FILA]: '' }}
      title={prioridad}
      className={cn(
        // Móvil: tarjeta (asunto arriba, metadatos debajo). md+: fila de grilla.
        'flex flex-wrap items-center gap-x-3 gap-y-1.5 border-l-[3px] px-3 py-3 transition-colors md:grid md:py-2.5',
        columnas,
        BARRA[ticket.priority] ?? 'border-l-transparent',
        'outline-none hover:bg-muted/60 focus-visible:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        recienCambiado && 'animate-destello',
      )}
    >
      <span className="font-mono text-xs text-muted-foreground max-md:order-1">
        #{ticket.number}
      </span>

      <span className="min-w-0 max-md:order-first max-md:basis-full">
        <span className="flex min-w-0 items-center gap-2">
          {prioridad !== undefined ? <span className="sr-only">{prioridad}</span> : null}
          <span className="truncate text-sm font-medium">{ticket.subject}</span>
          {ticket.aiTriage ? (
            <IaSiSube
              sugerida={ticket.aiTriage.suggestedPriority}
              categoria={ticket.aiTriage.category}
              actual={ticket.priority}
            />
          ) : null}
        </span>
        {ticket.requesterEmail !== undefined ? (
          <span className="block truncate text-xs text-muted-foreground">
            {ticket.requesterEmail}
          </span>
        ) : null}
      </span>

      {esEquipo ? <Etiquetas ticket={ticket} /> : null}
      {esEquipo ? (
        <span className="max-md:order-3">
          <Asignado id={ticket.assigneeId} miId={miId} directorio={directorio} />
        </span>
      ) : null}

      <span className="max-md:order-2">
        <Estado status={ticket.status} />
      </span>

      {esEquipo ? (
        <span className="max-md:order-4">
          <Sla ticket={ticket} ahora={ahora} />
        </span>
      ) : null}

      <span className="text-xs whitespace-nowrap text-muted-foreground max-md:order-5 max-md:ml-auto md:text-right">
        <FechaRelativa iso={ticket.updatedAt} />
      </span>
    </Link>
  );
}

/**
 * La IA junto al asunto, SOLO cuando sugiere más urgencia de la que tiene: es
 * el incendio que entró como "normal". Si coincide o sugiere menos, no se
 * dibuja nada — ruido que enseñaría a no mirar.
 */
function IaSiSube({
  sugerida,
  categoria,
  actual,
}: {
  sugerida: TicketPriority;
  categoria: string;
  actual: TicketPriority;
}) {
  if (direccion(actual, sugerida) !== 'sube') return null;
  const texto = etiqueta(PRIORIDAD_IA, sugerida).toLowerCase();
  return (
    <Tooltip
      contenido={`La IA lo clasifica como ${etiqueta(CATEGORIA_IA, categoria).toLowerCase()} y sugiere prioridad ${texto}`}
    >
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-destructive">
        <Sparkles className="size-3" aria-hidden />
        IA: {texto}
      </span>
    </Tooltip>
  );
}

function Etiquetas({ ticket }: { ticket: TicketSummary }) {
  const tags = ticket.tags ?? [];
  // En móvil se ocultan: la tarjeta prioriza asunto, estado y SLA.
  return (
    <span className="flex min-w-0 items-center gap-2 max-md:hidden">
      {tags.slice(0, 2).map((tag) => (
        <TagDot key={tag.id} tag={tag} />
      ))}
      {tags.length > 2 ? (
        <span className="text-xs text-muted-foreground">+{tags.length - 2}</span>
      ) : null}
    </span>
  );
}

/**
 * Iniciales a partir del email del directorio. Si no se conoce a la persona
 * (baja, o el directorio aún no cargó) se dice "?" en vez de inventar.
 */
function Asignado({
  id,
  miId,
  directorio,
}: {
  id: string | null;
  miId: string | undefined;
  directorio: Directorio;
}) {
  if (id === null) {
    return (
      <span className="text-xs text-muted-foreground">
        <span aria-hidden>—</span>
        <span className="sr-only">Sin asignar</span>
      </span>
    );
  }
  const email = directorio(id)?.email;
  const esMio = id === miId;
  const descripcion = esMio
    ? `Asignado a vos${email ? ` (${email})` : ''}`
    : `Asignado a ${email ?? 'otra persona'}`;
  return (
    <Tooltip contenido={descripcion}>
      <span
        className={cn(
          'inline-flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground',
          esMio && 'bg-primary/10 text-primary ring-2 ring-primary',
        )}
      >
        <span aria-hidden>{email ? iniciales(email) : '?'}</span>
        {/* Texto y no `aria-label`: en un <span> sin rol el lector lo ignora y
            dentro del enlace de la fila se leía "AP". */}
        <span className="sr-only">{descripcion}</span>
      </span>
    </Tooltip>
  );
}

const ESTADO: Record<TicketStatus, { texto: string; punto: string; texto_clase?: string }> = {
  OPEN: { texto: 'Abierto', punto: 'border border-muted-foreground' },
  IN_PROGRESS: { texto: 'En curso', punto: 'bg-muted-foreground' },
  // El único estado con color: la pelota está del lado del cliente (ADR-0029).
  WAITING_ON_CUSTOMER: {
    texto: 'Esperando al cliente',
    punto: 'bg-warning-foreground',
    texto_clase: 'text-warning-foreground',
  },
  RESOLVED: { texto: 'Resuelto', punto: 'bg-muted-foreground/50' },
  CLOSED: { texto: 'Cerrado', punto: 'border border-muted-foreground/50' },
};

function Estado({ status }: { status: TicketStatus }) {
  const e = ESTADO[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs whitespace-nowrap', e.texto_clase ?? 'text-foreground')}>
      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', e.punto)} />
      {e.texto}
    </span>
  );
}

const TONO: Record<TonoSla, string> = {
  neutro: 'text-muted-foreground',
  aviso: 'font-medium text-warning-foreground',
  peligro: 'font-medium text-destructive',
};

function Sla({ ticket, ahora }: { ticket: TicketSummary; ahora: Date }) {
  const { texto, tono } = describirSla(ticket.slaSummary, ahora);
  return <span className={cn('text-xs whitespace-nowrap', TONO[tono])}>{texto}</span>;
}

/** Esqueleto con la forma de la tabla: la página no "salta" al cargar. */
export function TablaEsqueleto({ esEquipo }: { esEquipo: boolean }) {
  const columnas = esEquipo ? COLUMNAS.equipo : COLUMNAS.cliente;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Encabezado columnas={columnas} esEquipo={esEquipo} />
      <div className="divide-y divide-border">
        {[0, 1, 2, 3, 4, 5].map((fila) => (
          <div
            key={fila}
            className={cn('flex flex-wrap items-center gap-3 px-3 py-3 md:grid md:py-2.5', columnas)}
          >
            <Skeleton className="h-3 w-8" />
            <div className="space-y-1.5 max-md:basis-full">
              <Skeleton className="h-3.5 w-3/4 max-w-80" />
              {esEquipo ? <Skeleton className="h-2.5 w-32" /> : null}
            </div>
            {esEquipo ? <Skeleton className="h-3 w-20 max-md:hidden" /> : null}
            {esEquipo ? <Skeleton className="size-6 rounded-full" /> : null}
            <Skeleton className="h-3 w-16" />
            {esEquipo ? <Skeleton className="h-3 w-20" /> : null}
            <Skeleton className="ml-auto h-3 w-10" />
          </div>
        ))}
      </div>
      <span className="sr-only" role="status">
        Cargando los tickets
      </span>
    </div>
  );
}
