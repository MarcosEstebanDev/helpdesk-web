'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, Lozenge, Textarea } from '@/components/ui/primitives';
import { useAvisos } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session';
import { etiquetaDelActor, papelDelActor } from '@/features/tickets/audit';
import { FechaRelativa } from '@/features/tickets/components/ticket-badges';
import { useAddComment } from '@/features/tickets/queries';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { Directorio } from '@/features/members/directory';
import type {
  CommentVisibility,
  TicketComment,
  TicketDetail,
} from '@/lib/api/types';

/**
 * El hilo de conversación de un ticket, con el formulario de respuesta.
 *
 * Salió de `page.tsx` cuando la sección de actividad pasó a tener dos pestañas:
 * el archivo estaba en 480 líneas y componer dos paneles ahí adentro lo volvía
 * ilegible. La extracción no cambia comportamiento.
 *
 * **Notas internas (ADR-0028 del backend).** El equipo elige entre responderle al
 * cliente o dejar una nota que solo ve el equipo. Por defecto es la respuesta,
 * como en Zendesk o Freshdesk: lo que se hace más seguido. La nota se distingue
 * por color en el editor Y en el hilo, porque el error caro es mandarle al
 * cliente algo que era interno. El cliente no ve el selector, y no le llega
 * ninguna nota: eso lo filtra el backend, no esta pantalla.
 */
export function TicketComments({
  ticket,
  directorio,
}: {
  ticket: TicketDetail;
  directorio: Directorio;
}) {
  const [texto, setTexto] = useState('');
  const [visibilidad, setVisibilidad] = useState<CommentVisibility>('PUBLIC');
  const avisos = useAvisos();
  const { user } = useSession();
  const comentar = useAddComment(ticket.id);
  const cerrado = ticket.status === 'CLOSED';
  const esEquipo = user?.role === 'AGENT' || user?.role === 'ADMIN';
  // Si el rol cambia (otra sesión), un VIEWER nunca manda una nota por un
  // estado que quedó de antes: el backend la rechazaría con 403.
  const nota = esEquipo && visibilidad === 'INTERNAL';

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const cuerpo = texto.trim();
    if (cuerpo === '') return;
    comentar.mutate(
      { body: cuerpo, visibility: nota ? 'INTERNAL' : 'PUBLIC' },
      {
        onSuccess: () => setTexto(''),
        onError: (e) =>
          avisos.error(
            nota ? 'No se pudo guardar la nota' : 'No se pudo enviar la respuesta',
            e instanceof ApiError ? e.message : undefined,
          ),
      },
    );
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
          {esEquipo ? (
            <SelectorVisibilidad valor={visibilidad} onChange={setVisibilidad} />
          ) : null}
          <Textarea
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={
              nota
                ? 'Solo la ve el equipo. El cliente no recibe nada.'
                : 'Escribí una respuesta…'
            }
            aria-label={nota ? 'Nota interna' : 'Respuesta'}
            className={cn(nota && 'border-warning-foreground/40 bg-warning')}
          />
          <Button
            type="submit"
            size="sm"
            disabled={comentar.isPending || texto.trim() === ''}
          >
            {comentar.isPending
              ? 'Enviando…'
              : nota
                ? 'Guardar nota'
                : 'Responder'}
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
  const interna = comentario.visibility === 'INTERNAL';

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
          {interna ? <Lozenge tone="warning">Nota interna</Lozenge> : null}
        </p>
        <div
          className={cn(
            'mt-1 rounded-lg border border-border bg-card px-3 py-2',
            esMio && 'border-accent bg-accent/40',
            // La nota gana sobre "es mío": que sea interna es lo que no hay que
            // perder de vista al leer el hilo.
            interna && 'border-warning-foreground/40 bg-warning',
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

/**
 * Responder al cliente o dejar una nota interna. Son dos botones con
 * `aria-pressed` y no pestañas: no cambian de panel, cambian a quién va lo que
 * se escribe en el mismo editor.
 */
function SelectorVisibilidad({
  valor,
  onChange,
}: {
  valor: CommentVisibility;
  onChange: (valor: CommentVisibility) => void;
}) {
  const opciones: { valor: CommentVisibility; etiqueta: string }[] = [
    { valor: 'PUBLIC', etiqueta: 'Responder al cliente' },
    { valor: 'INTERNAL', etiqueta: 'Nota interna' },
  ];

  return (
    <div
      role="group"
      aria-label="A quién va el mensaje"
      className="inline-flex rounded-md border border-border p-0.5 text-xs"
    >
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          aria-pressed={valor === opcion.valor}
          onClick={() => onChange(opcion.valor)}
          className={cn(
            'rounded-sm px-2.5 py-1 font-medium text-muted-foreground transition-colors',
            valor === opcion.valor &&
              (opcion.valor === 'INTERNAL'
                ? 'bg-warning text-warning-foreground'
                : 'bg-accent text-foreground'),
          )}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  );
}
