'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  ErrorText,
  Input,
  Label,
  Select,
  Textarea,
} from '@/components/ui/primitives';
import {
  FechaRelativa,
  PriorityBadge,
  StatusBadge,
} from '@/features/tickets/components/ticket-badges';
import { useCreateTicket, useTickets } from '@/features/tickets/queries';
import { ApiError } from '@/lib/api/client';
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/api/types';

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
  const { data, isPending, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTickets(filtros);

  const tickets = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>

        <Select
          aria-label="Filtrar por estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value as TicketStatus | '')}
        >
          <option value="">Todos los estados</option>
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>

        <Button className="ml-auto" onClick={() => setAbriendo((v) => !v)}>
          {abriendo ? 'Cancelar' : 'Abrir ticket'}
        </Button>
      </div>

      {abriendo ? <NuevoTicket onListo={() => setAbriendo(false)} /> : null}

      {isPending ? (
        <p className="text-sm text-muted-foreground">Cargando tickets…</p>
      ) : isError ? (
        <ErrorText>
          {error instanceof ApiError
            ? error.message
            : 'No se pudieron cargar los tickets.'}
        </ErrorText>
      ) : tickets.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No hay tickets{estado ? ' con ese estado' : ' todavía'}.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/tickets/${t.id}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-muted/50"
            >
              <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
                #{t.number}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {t.subject}
              </span>
              <PriorityBadge priority={t.priority} />
              <StatusBadge status={t.status} />
              <span className="w-28 shrink-0 text-right text-xs text-muted-foreground">
                <FechaRelativa iso={t.updatedAt} />
              </span>
            </Link>
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

function NuevoTicket({ onListo }: { onListo: () => void }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('NORMAL');
  const crear = useCreateTicket();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    crear.mutate(
      { subject: subject.trim(), description: description.trim(), priority },
      { onSuccess: onListo },
    );
  }

  return (
    <Card className="p-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="subject">Asunto</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="priority">Prioridad</Label>
            <Select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
            >
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>

          <Button type="submit" disabled={crear.isPending} className="ml-auto">
            {crear.isPending ? 'Abriendo…' : 'Abrir ticket'}
          </Button>
        </div>

        <ErrorText>
          {crear.isError
            ? crear.error instanceof ApiError
              ? crear.error.message
              : 'No se pudo abrir el ticket.'
            : null}
        </ErrorText>
      </form>
    </Card>
  );
}
