'use client';

import { Menu } from '@base-ui/react/menu';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Avatar,
  Card,
  ErrorText,
  Skeleton,
} from '@/components/ui/primitives';
import { useAvisos } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session';
import { crearDirectorio, type Directorio } from '@/features/members/directory';
import { useMembers } from '@/features/members/queries';
import { AssigneePicker } from '@/features/tickets/components/assignee-picker';
import { SlaPanel } from '@/features/tickets/components/sla-panel';
import { TicketActivity } from '@/features/tickets/components/ticket-activity';
import {
  FechaRelativa,
  PriorityLabel,
  StatusBadge,
} from '@/features/tickets/components/ticket-badges';
import { useChangeStatus, useTicket } from '@/features/tickets/queries';
import { ApiError } from '@/lib/api/client';
import { useTicketWatch } from '@/lib/realtime/use-ticket-watch';
import { cn } from '@/lib/utils';
import {
  ALLOWED_TRANSITIONS,
  type TicketDetail,
  type TicketStatus,
} from '@/lib/api/types';

const ESTADO_ACCION: Record<TicketStatus, string> = {
  OPEN: 'Reabrir',
  IN_PROGRESS: 'Empezar',
  RESOLVED: 'Resolver',
  CLOSED: 'Cerrar',
};

/**
 * Detalle de un ticket, con la anatomía de una vista de incidencia: a la
 * izquierda lo que se lee (asunto, descripción, conversación) y a la derecha lo
 * que se opera (estado, asignación, prioridad, relojes de SLA).
 *
 * La separación no es estética. Son dos modos de uso distintos: el solicitante
 * viene a leer y responder, el agente viene a cambiar algo. Cuando todo cuelga
 * de la misma columna, cada acción obliga a recorrer el hilo entero.
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-6">
          <h1 className="text-xl font-semibold tracking-tight">
            {ticket.subject}
          </h1>

          {/* Sin tarjeta: la descripción es prosa, y encerrarla en un borde la
              hace parecer un campo de formulario deshabilitado. */}
          <p className="max-w-prose text-sm leading-6 whitespace-pre-wrap">
            {ticket.description}
          </p>

          <TicketActivity ticket={ticket} directorio={directorio} />
        </div>

        <aside className="space-y-3 lg:sticky lg:top-16 lg:self-start">
          <PanelDetalles
            ticket={ticket}
            esAgente={esAgente}
            directorio={directorio}
          />
          <section className="space-y-2">
            <h2 className="px-1 text-xs font-semibold text-muted-foreground">
              SLA
            </h2>
            <SlaPanel sla={ticket.sla} />
          </section>
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
    <Card className="divide-y divide-border">
      <div className="p-3">
        {esAgente ? (
          <MenuDeEstado ticket={ticket} />
        ) : (
          <StatusBadge status={ticket.status} />
        )}
      </div>

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
 * El estado como menú de transiciones, no como etiqueta pasiva.
 *
 * Solo se ofrecen las **transiciones legales** (ADR-0015, replicado en
 * `lib/api/types.ts`). El backend responde 409 igual: esto es UX, no validación.
 * Que el estado actual sea también el disparador del menú es el punto — el sitio
 * donde se lee en qué anda el ticket es el mismo donde se cambia.
 */
function MenuDeEstado({ ticket }: { ticket: TicketDetail }) {
  const avisos = useAvisos();
  const cambiarEstado = useChangeStatus(ticket.id);
  const siguientes = ALLOWED_TRANSITIONS[ticket.status];

  if (siguientes.length === 0) {
    return (
      <div className="space-y-1.5">
        <StatusBadge status={ticket.status} />
        <p className="text-xs text-muted-foreground">
          Un ticket cerrado no admite más cambios.
        </p>
      </div>
    );
  }

  function transicionar(estado: TicketStatus) {
    cambiarEstado.mutate(estado, {
      onSuccess: () => avisos.exito(`Ticket ${ESTADO_ACCION[estado].toLowerCase()}`),
      onError: (e) =>
        avisos.error(
          'No se pudo cambiar el estado',
          e instanceof ApiError ? e.message : undefined,
        ),
    });
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={cambiarEstado.isPending}
        render={
          <Button variant="outline" size="sm" className="w-full justify-between" />
        }
      >
        <StatusBadge status={ticket.status} />
        <ChevronDown />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={4} align="start">
          <Menu.Popup
            className={cn(
              'z-50 min-w-44 rounded-lg border border-border bg-popover p-1 shadow-lg',
              'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
              'transition-opacity duration-100',
            )}
          >
            {siguientes.map((estado) => (
              <Menu.Item
                key={estado}
                onClick={() => transicionar(estado)}
                className="flex cursor-default items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
              >
                {ESTADO_ACCION[estado]}
                <StatusBadge status={estado} />
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
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
