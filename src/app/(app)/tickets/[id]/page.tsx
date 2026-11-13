'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  Avatar,
  Card,
  ErrorText,
  Skeleton,
} from '@/components/ui/primitives';
import { useSession } from '@/features/auth/session';
import { crearDirectorio, type Directorio } from '@/features/members/directory';
import { useMembers } from '@/features/members/queries';
import { AiTriagePanel } from '@/features/tickets/components/ai-triage-card';
import { AssigneePicker } from '@/features/tickets/components/assignee-picker';
import { SlaPanel } from '@/features/tickets/components/sla-panel';
import { AccionesDeEstado } from '@/features/tickets/components/status-actions-bar';
import { TagEditor } from '@/features/tags/components/tag-editor';
import { TicketActivity } from '@/features/tickets/components/ticket-activity';
import {
  FechaRelativa,
  PriorityLabel,
  StatusBadge,
} from '@/features/tickets/components/ticket-badges';
import { useTicket } from '@/features/tickets/queries';
import { ApiError } from '@/lib/api/client';
import { useTicketWatch } from '@/lib/realtime/use-ticket-watch';
import type { TicketDetail } from '@/lib/api/types';

/**
 * Detalle de un ticket, con la anatomía de una vista de incidencia: a la
 * izquierda lo que se lee (asunto, descripción, conversación) y a la derecha lo
 * que se opera (estado, asignación, prioridad, relojes de SLA).
 *
 * La separación no es estética. Son dos modos de uso distintos: el solicitante
 * viene a leer y responder, el agente viene a cambiar algo. Cuando todo cuelga
 * de la misma columna, cada acción obliga a recorrer el hilo entero.
 *
 * UX 2026-11-13: las acciones de estado suben a la cabecera (son LO que viene a
 * hacer un agente), la conversación es un chat con los cambios de estado
 * intercalados, y el panel empieza por el SLA, que es lo que apura.
 */
export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;
  const { user } = useSession();
  const { data: ticket, isPending, isError, error } = useTicket(ticketId);

  // Entra en la sala de ESTE ticket mientras la pantalla esté abierta. Sin
  // esto, los comentarios y cambios de estado no llegarían en vivo: el backend
  // los manda solo a quien lo está mirando (ADR-0023).
  useTicketWatch(ticketId);

  // El directorio solo existe para AGENT o superior: `GET /members` le responde
  // 403 a un VIEWER. Se pide una vez cada cinco minutos para toda la aplicación
  // (clave compartida y `staleTime` largo), no una vez por ticket abierto.
  const esAgente = user?.role === 'AGENT' || user?.role === 'ADMIN';
  const { data: miembros } = useMembers(esAgente);
  const directorio = crearDirectorio(miembros?.items);

  if (isPending) return <DetalleEsqueleto />;

  if (isError) {
    return (
      <div className="space-y-4">
        <Card className="p-4">
          <ErrorText>
            {error instanceof ApiError
              ? error.message
              : 'No se pudo cargar el ticket.'}
          </ErrorText>
        </Card>
        <Link
          href="/tickets"
          className="inline-flex items-center gap-1 text-sm text-accent-foreground hover:underline"
        >
          <ChevronLeft className="size-4" />
          Volver a la bandeja
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <nav aria-label="Migas de pan" className="flex items-center gap-1.5 text-xs">
        <Link
          href="/tickets"
          className="rounded-sm text-muted-foreground hover:text-accent-foreground hover:underline"
        >
          Tickets
        </Link>
        <span className="text-muted-foreground/60" aria-hidden>
          /
        </span>
        <span className="font-mono text-muted-foreground">#{ticket.number}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-border pb-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            {ticket.subject}
          </h1>
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
            <span>Abierto por {quienLoAbrio(ticket, user?.id, directorio)}</span>
            <span aria-hidden>·</span>
            <FechaRelativa iso={ticket.createdAt} />
            <span aria-hidden>·</span>
            <StatusBadge status={ticket.status} />
          </p>
        </div>
        {esAgente ? (
          <AccionesDeEstado ticketId={ticket.id} status={ticket.status} />
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-6">

          {/* Sin tarjeta: la descripción es prosa, y encerrarla en un borde la
              hace parecer un campo de formulario deshabilitado. */}
          <p className="max-w-prose text-sm leading-6 whitespace-pre-wrap">
            {ticket.description}
          </p>

          <TicketActivity ticket={ticket} directorio={directorio} />
        </div>

        <aside className="space-y-3 lg:sticky lg:top-16 lg:self-start">
          {/* El SLA primero: es lo que apura. Sin barra de progreso a propósito
              (el DTO no trae el inicio del reloj y una pausa la rompería). */}
          <section className="space-y-2">
            <h2 className="px-1 text-xs font-semibold text-muted-foreground">
              SLA
            </h2>
            <SlaPanel sla={ticket.sla} />
          </section>
          <PanelDetalles
            ticket={ticket}
            esAgente={esAgente}
            directorio={directorio}
          />
          <AiTriagePanel
            ticketId={ticket.id}
            prioridadActual={ticket.priority}
            esAgente={esAgente}
          />
        </aside>
      </div>
    </div>
  );
}

/** Panel de operación. En Jira es el bloque "Details"; aquí hace lo mismo. */
function PanelDetalles({
  ticket,
  esAgente,
  directorio,
}: {
  ticket: TicketDetail;
  esAgente: boolean;
  directorio: Directorio;
}) {
  return (
    <Card>
      <dl className="space-y-3 p-3 text-sm">
        <Dato etiqueta="Prioridad">
          <PriorityLabel priority={ticket.priority} />
        </Dato>

        <Dato etiqueta="Asignado">
          <Asignacion
            ticket={ticket}
            esAgente={esAgente}
            directorio={directorio}
          />
        </Dato>

        {/* Clasificación interna (ADR-0031): al cliente ni le llega la clave. */}
        {esAgente && ticket.tags !== undefined ? (
          <Dato etiqueta="Etiquetas">
            <TagEditor
              ticketId={ticket.id}
              tags={ticket.tags}
              cerrado={ticket.status === 'CLOSED'}
            />
          </Dato>
        ) : null}

        <Dato etiqueta="Abierto">
          <span className="text-muted-foreground">
            <FechaRelativa iso={ticket.createdAt} />
          </span>
        </Dato>

        <Dato etiqueta="Actualizado">
          <span className="text-muted-foreground">
            <FechaRelativa iso={ticket.updatedAt} />
          </span>
        </Dato>
      </dl>
    </Card>
  );
}

function Dato({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-2">
      <dt className="text-xs font-semibold text-muted-foreground">{etiqueta}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/**
 * Quién abrió el ticket, con lo que cada rol tiene derecho a saber: el equipo
 * ve el email (directorio, ADR-0025); el cliente se ve a sí mismo como "vos".
 * Si no hay dato, se dice el papel, no un nombre inventado.
 */
function quienLoAbrio(
  ticket: TicketDetail,
  miId: string | undefined,
  directorio: Directorio,
): string {
  if (ticket.requesterId === miId) return 'vos';
  return directorio(ticket.requesterId)?.email ?? 'el cliente';
}

/**
 * Quién tiene el ticket.
 *
 * Un AGENT ve un selector con todas las personas de la organización; un VIEWER
 * ve texto, porque `GET /members` le responde 403 a propósito (ADR-0025 del
 * backend): el listado de empleados no es para el cliente final.
 */
function Asignacion({
  ticket,
  esAgente,
  directorio,
}: {
  ticket: TicketDetail;
  esAgente: boolean;
  directorio: Directorio;
}) {
  const { user } = useSession();

  if (esAgente) {
    return <AssigneePicker ticket={ticket} directorio={directorio} />;
  }

  if (ticket.assigneeId === null) {
    return <span className="text-muted-foreground">Sin asignar</span>;
  }

  return (
    <span className="flex items-center gap-2">
      <Avatar
        variante={ticket.assigneeId === user?.id ? 'vos' : 'otro'}
        aria-hidden
      />
      <span>{ticket.assigneeId === user?.id ? 'Vos' : 'Un agente'}</span>
    </span>
  );
}

function DetalleEsqueleto() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-3 w-24" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-16 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
      <span className="sr-only" role="status">
        Cargando el ticket
      </span>
    </div>
  );
}
