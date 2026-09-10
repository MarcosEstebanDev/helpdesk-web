'use client';

import { Inbox, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  Card,
  ErrorText,
  Input,
  Label,
  Lozenge,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui/primitives';
import { Tooltip } from '@/components/ui/tooltip';
import { useAvisos } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session';
import {
  FechaRelativa,
  PriorityBadge,
  StatusBadge,
} from '@/features/tickets/components/ticket-badges';
import { useCreateTicket, useTickets } from '@/features/tickets/queries';
import { ApiError } from '@/lib/api/client';
import { useWs } from '@/providers/ws-provider';
import { cn } from '@/lib/utils';
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketPriority,
  type TicketStatus,
  type TicketSummary,
} from '@/lib/api/types';

const ESTADO_TEXTO: Record<TicketStatus, string> = {
  OPEN: 'Abiertos',
  IN_PROGRESS: 'En curso',
  RESOLVED: 'Resueltos',
  CLOSED: 'Cerrados',
};

const PRIORIDAD_TEXTO: Record<TicketPriority, string> = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

/**
 * Bandeja de tickets.
 *
 * Se actualiza sola: el `WsProvider` invalida `ticketKeys.lists()` cuando llega
 * un `ticket.created` o un cambio de estado, así que no hace falta refrescar ni
 * hay ningún `setInterval` sondeando el servidor.
 */
export default function TicketsPage() {
  const [estado, setEstado] = useState<TicketStatus | ''>('');
  const [abriendo, setAbriendo] = useState(false);

  const filtros = estado === '' ? {} : { status: estado };
  const {
    data,
    isPending,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTickets(filtros);

  const tickets = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Tickets</h1>

        <Select
          aria-label="Filtrar por estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value as TicketStatus | '')}
        >
          <option value="">Todos los estados</option>
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ESTADO_TEXTO[s]}
            </option>
          ))}
        </Select>

        <Button className="ml-auto" onClick={() => setAbriendo(true)}>
          <Plus />
          Abrir ticket
        </Button>
      </div>

      <Dialog
        abierto={abriendo}
        onAbiertoChange={setAbriendo}
        titulo="Abrir un ticket"
        descripcion="Contá qué pasa. Un agente lo va a tomar desde la bandeja."
      >
        <NuevoTicket onListo={() => setAbriendo(false)} />
      </Dialog>

      {isPending ? (
        <ListaEsqueleto />
      ) : isError ? (
        <Card className="p-4">
          <ErrorText>
            {error instanceof ApiError
              ? error.message
              : 'No se pudieron cargar los tickets.'}
          </ErrorText>
        </Card>
      ) : tickets.length === 0 ? (
        <BandejaVacia
          filtrada={estado !== ''}
          onVerTodos={() => setEstado('')}
          onAbrir={() => setAbriendo(true)}
        />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {tickets.map((ticket) => (
            <Fila key={ticket.id} ticket={ticket} />
          ))}
        </Card>
      )}

      {hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Una fila de la bandeja.
 *
 * En pantalla ancha es una línea de 40px que se recorre en vertical; por debajo
 * de `sm` los metadatos bajan a una segunda línea en vez de comprimir el asunto,
 * que es el único dato por el que alguien busca un ticket.
 */
function Fila({ ticket }: { ticket: TicketSummary }) {
  const { user } = useSession();
  const { cambiosRecientes } = useWs();

  // Que la fila haya cambiado por un aviso del servidor mientras la pantalla
  // estaba abierta. Se señala una vez y se apaga sola: es un cambio que ocurrió
  // donde el usuario no estaba mirando.
  const recienCambiado = cambiosRecientes[ticket.id] !== undefined;

  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5 transition-colors',
        'hover:bg-muted/60 focus-visible:bg-muted/60',
        recienCambiado && 'animate-destello',
      )}
    >
      <PriorityBadge priority={ticket.priority} />

      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        #{ticket.number}
      </span>

      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {ticket.subject}
      </span>

      <span className="flex shrink-0 items-center gap-3 max-sm:w-full max-sm:pl-7">
        <Asignacion ticket={ticket} miId={user?.id} />
        <StatusBadge status={ticket.status} />
        <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">
          <FechaRelativa iso={ticket.updatedAt} />
        </span>
      </span>
    </Link>
  );
}

/**
 * Quién lo tiene.
 *
 * El backend no expone un endpoint de miembros, así que de un asignado solo se
 * conoce el UUID. Lo único que se puede decir con honestidad —y lo único que un
 * agente necesita para decidir— es si le toca a él.
 */
function Asignacion({
  ticket,
  miId,
}: {
  ticket: TicketSummary;
  miId: string | undefined;
}) {
  if (ticket.assigneeId === null) {
    return (
      <Tooltip contenido="Sin asignar">
        <span className="text-xs text-muted-foreground">Libre</span>
      </Tooltip>
    );
  }

  if (ticket.assigneeId === miId) {
    return <Lozenge tone="info">Tuyo</Lozenge>;
  }

  return (
    <Tooltip contenido="Asignado a otro agente">
      <span className="text-xs text-muted-foreground">Asignado</span>
    </Tooltip>
  );
}

function ListaEsqueleto() {
  return (
    <Card className="divide-y divide-border overflow-hidden">
      {[0, 1, 2, 3, 4].map((fila) => (
        <div key={fila} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="size-4 rounded-full" />
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 flex-1 max-w-80" />
          <Skeleton className="ml-auto h-4 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
      <span className="sr-only" role="status">
        Cargando los tickets
      </span>
    </Card>
  );
}

function BandejaVacia({
  filtrada,
  onVerTodos,
  onAbrir,
}: {
  filtrada: boolean;
  onVerTodos: () => void;
  onAbrir: () => void;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <Inbox className="size-8 text-muted-foreground/60" aria-hidden />
      <p className="text-sm text-muted-foreground">
        {filtrada
          ? 'Ningún ticket con ese estado.'
          : 'La bandeja está vacía. Los tickets aparecen acá en cuanto alguien abre uno.'}
      </p>
      {filtrada ? (
        <Button variant="outline" size="sm" onClick={onVerTodos}>
          Ver todos los estados
        </Button>
      ) : (
        <Button size="sm" onClick={onAbrir}>
          <Plus />
          Abrir el primero
        </Button>
      )}
    </Card>
  );
}

function NuevoTicket({ onListo }: { onListo: () => void }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('NORMAL');
  const avisos = useAvisos();
  const crear = useCreateTicket();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    crear.mutate(
      { subject: subject.trim(), description: description.trim(), priority },
      {
        onSuccess: (ticket) => {
          avisos.exito(`Ticket #${ticket.number} abierto`);
          onListo();
        },
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="subject">Asunto</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Qué pasa, en una línea"
          maxLength={200}
          autoFocus
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Qué esperabas que pasara y qué pasó en su lugar"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="priority">Prioridad</Label>
        <Select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as TicketPriority)}
        >
          {TICKET_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORIDAD_TEXTO[p]}
            </option>
          ))}
        </Select>
      </div>

      <ErrorText>
        {crear.isError
          ? crear.error instanceof ApiError
            ? crear.error.message
            : 'No se pudo abrir el ticket.'
          : null}
      </ErrorText>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onListo}>
          Cancelar
        </Button>
        <Button type="submit" disabled={crear.isPending}>
          {crear.isPending ? 'Abriendo…' : 'Abrir ticket'}
        </Button>
      </div>
    </form>
  );
}
