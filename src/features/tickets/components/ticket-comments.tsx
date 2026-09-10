'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, Textarea } from '@/components/ui/primitives';
import { useAvisos } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session';
import { etiquetaDelActor, papelDelActor } from '@/features/tickets/audit';
import { FechaRelativa } from '@/features/tickets/components/ticket-badges';
import { useAddComment } from '@/features/tickets/queries';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { Directorio } from '@/features/members/directory';
import type { TicketComment, TicketDetail } from '@/lib/api/types';

/**
 * El hilo de conversación de un ticket, con el formulario de respuesta.
 *
 * Salió de `page.tsx` cuando la sección de actividad pasó a tener dos pestañas:
 * el archivo estaba en 480 líneas y componer dos paneles ahí adentro lo volvía
 * ilegible. La extracción no cambia comportamiento.
 */
export function TicketComments({
  ticket,
  directorio,
}: {
  ticket: TicketDetail;
  directorio: Directorio;
}) {
  const [texto, setTexto] = useState('');
  const avisos = useAvisos();
  const comentar = useAddComment(ticket.id);
  const cerrado = ticket.status === 'CLOSED';

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const cuerpo = texto.trim();
    if (cuerpo === '') return;
    comentar.mutate(cuerpo, {
      onSuccess: () => setTexto(''),
      onError: (e) =>
        avisos.error(
          'No se pudo enviar la respuesta',
          e instanceof ApiError ? e.message : undefined,
        ),
    });
  }

  return (
    <div className="space-y-4">
      {ticket.comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay respuestas.
        </p>
      ) : (
        <ol className="space-y-4">
          {ticket.comments.map((comentario) => (
            <Comentario
              key={comentario.id}
              comentario={comentario}
              ticket={ticket}
              directorio={directorio}
            />
          ))}
        </ol>
      )}

      {cerrado ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground">
          El ticket está cerrado. Reabrilo para seguir la conversación.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-2">
          <Textarea
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribí una respuesta…"
            aria-label="Respuesta"
          />
          <Button
            type="submit"
            size="sm"
            disabled={comentar.isPending || texto.trim() === ''}
          >
            {comentar.isPending ? 'Enviando…' : 'Responder'}
          </Button>
        </form>
      )}
    </div>
  );
}

/**
 * Un mensaje del hilo.
 *
 * De un comentario solo llega `authorId`: la API no expone nombres ni un
 * endpoint de miembros. En vez de inventar iniciales, se dice el papel que esa
 * persona tiene en ESTE ticket, que se deduce de datos que sí existen — es quien
 * lo abrió, es quien lo tiene asignado, o sos vos. El cálculo lo comparte con el
 * historial de auditoría (`features/tickets/audit.ts`).
 */
function Comentario({
  comentario,
  ticket,
  directorio,
}: {
  comentario: TicketComment;
  ticket: TicketDetail;
  directorio: Directorio;
}) {
  const { user } = useSession();

  const papel = papelDelActor(comentario.authorId, {
    miId: user?.id,
    requesterId: ticket.requesterId,
    assigneeId: ticket.assigneeId,
  });
  const esMio = papel === 'vos';

  return (
    <li className="flex gap-2.5">
      <Avatar variante={esMio ? 'vos' : 'otro'} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2 text-xs">
          <span className="font-semibold text-foreground">
            {etiquetaDelActor(comentario.authorId, papel, directorio)}
          </span>
          <span className="text-muted-foreground">
            <FechaRelativa iso={comentario.createdAt} />
          </span>
        </p>
        <div
          className={cn(
            'mt-1 rounded-lg border border-border bg-card px-3 py-2',
            esMio && 'border-accent bg-accent/40',
          )}
        >
          <p className="text-sm leading-6 whitespace-pre-wrap">
            {comentario.body}
          </p>
        </div>
      </div>
    </li>
  );
}
