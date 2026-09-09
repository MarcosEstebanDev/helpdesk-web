'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  ErrorText,
  Textarea,
} from '@/components/ui/primitives';
import { useSession } from '@/features/auth/session';
import { SlaPanel } from '@/features/tickets/components/sla-panel';
import {
  FechaRelativa,
  PriorityBadge,
  StatusBadge,
} from '@/features/tickets/components/ticket-badges';
import {
  useAddComment,
  useAssignment,
  useChangeStatus,
  useTicket,
} from '@/features/tickets/queries';
import { ApiError } from '@/lib/api/client';
import { useTicketWatch } from '@/lib/realtime/use-ticket-watch';
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

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;
  const { user } = useSession();
  const { data: ticket, isPending, isError, error } = useTicket(ticketId);

  // Entra en la sala de ESTE ticket mientras la pantalla esté abierta. Sin
  // esto, los comentarios y cambios de estado no llegarían en vivo: el backend
  // los manda solo a quien lo está mirando (ADR-0023).
  useTicketWatch(ticketId);

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Cargando ticket…</p>;
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <ErrorText>
          {error instanceof ApiError
            ? error.message
            : 'No se pudo cargar el ticket.'}
        </ErrorText>
        <Link href="/tickets" className="text-sm underline underline-offset-4">
          Volver a la bandeja
        </Link>
      </div>
    );
  }

  const esAgente = user?.role === 'AGENT' || user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/tickets"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Bandeja
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm text-muted-foreground">
            #{ticket.number}
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">
            {ticket.subject}
          </h1>
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          Abierto <FechaRelativa iso={ticket.createdAt} /> · Actualizado{' '}
          <FechaRelativa iso={ticket.updatedAt} />
        </p>
      </div>

      <Card className="p-4">
        <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
      </Card>

      {esAgente ? <AccionesAgente ticket={ticket} /> : null}

      <section className="space-y-2">
        <h2 className="text-sm font-medium">SLA</h2>
        <SlaPanel sla={ticket.sla} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">
          Conversación ({ticket.comments.length})
        </h2>
        <Conversacion ticket={ticket} />
      </section>
    </div>
  );
}

function AccionesAgente({ ticket }: { ticket: TicketDetail }) {
  const { user } = useSession();
  const cambiarEstado = useChangeStatus(ticket.id);
  const { asignar, desasignar } = useAssignment(ticket.id);

  const siguientes = ALLOWED_TRANSITIONS[ticket.status];
  const esMio = ticket.assigneeId === user?.id;

  return (
    <Card className="flex flex-wrap items-center gap-2 p-4">
      {/* Solo se ofrecen las transiciones legales (ADR-0015). El backend
          responde 409 igualmente: esto es para no ofrecer botones que fallan. */}
      {siguientes.length === 0 ? (
        <span className="text-sm text-muted-foreground">
          El ticket está cerrado: no admite más cambios.
        </span>
      ) : (
        siguientes.map((estado) => (
          <Button
            key={estado}
            variant="outline"
            size="sm"
            disabled={cambiarEstado.isPending}
            onClick={() => cambiarEstado.mutate(estado)}
          >
            {ESTADO_ACCION[estado]}
          </Button>
        ))
      )}

      <div className="ml-auto flex items-center gap-2">
        {/*
          No hay selector de personas porque el backend no expone ningún
          endpoint para listar los miembros de la organización: `assign` pide un
          UUID. Con "asignármelo a mí" se cubre el flujo real de un agente sin
          inventar un endpoint que no existe.
        */}
        {ticket.assigneeId === null ? (
          <Button
            size="sm"
            disabled={asignar.isPending || user === null}
            onClick={() => user && asignar.mutate(user.id)}
          >
            Asignármelo
          </Button>
        ) : (
          <>
            <span className="text-xs text-muted-foreground">
              {esMio ? 'Asignado a vos' : 'Asignado a otro agente'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={desasignar.isPending}
              onClick={() => desasignar.mutate()}
            >
              Quitar asignación
            </Button>
          </>
        )}
      </div>

      <ErrorText>
        {cambiarEstado.isError
          ? cambiarEstado.error instanceof ApiError
            ? cambiarEstado.error.message
            : 'No se pudo cambiar el estado.'
          : null}
      </ErrorText>
    </Card>
  );
}

function Conversacion({ ticket }: { ticket: TicketDetail }) {
  const [texto, setTexto] = useState('');
  const comentar = useAddComment(ticket.id);
  const cerrado = ticket.status === 'CLOSED';

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const cuerpo = texto.trim();
    if (cuerpo === '') return;
    comentar.mutate(cuerpo, { onSuccess: () => setTexto('') });
  }

  return (
    <div className="space-y-3">
      {ticket.comments.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Todavía no hay respuestas.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {ticket.comments.map((c) => (
            <div key={c.id} className="px-4 py-3">
              <p className="mb-1 text-xs text-muted-foreground">
                <FechaRelativa iso={c.createdAt} />
              </p>
              <p className="text-sm whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </Card>
      )}

      {cerrado ? null : (
        <form onSubmit={onSubmit} className="space-y-2">
          <Textarea
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribí una respuesta…"
          />
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              size="sm"
              disabled={comentar.isPending || texto.trim() === ''}
            >
              {comentar.isPending ? 'Enviando…' : 'Responder'}
            </Button>
            <ErrorText>
              {comentar.isError
                ? comentar.error instanceof ApiError
                  ? comentar.error.message
                  : 'No se pudo enviar el comentario.'
                : null}
            </ErrorText>
          </div>
        </form>
      )}
    </div>
  );
}
