'use client';

import { Lock } from 'lucide-react';
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, Textarea } from '@/components/ui/primitives';
import { useAvisos } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session';
import { AvisoFueraDeHorario } from '@/features/business-hours/components/aviso-fuera-de-horario';
import {
  CannedResponsePicker,
  insertAtCursor,
} from '@/features/canned-responses/components/canned-response-picker';
import { fillTemplate, hasUnfilledPlaceholder } from '@/features/canned-responses/fill';
import { useCannedResponses } from '@/features/canned-responses/queries';
import { etiquetaDelActor, papelDelActor } from '@/features/tickets/audit';
import { FechaRelativa } from '@/features/tickets/components/ticket-badges';
import {
  ladoDelMensaje,
  lineaDeTiempo,
  type ItemDeLinea,
} from '@/features/tickets/detail/linea-de-tiempo';
import {
  EsperaNoAplicada,
  useAddComment,
  useResponderYEsperar,
  useTicketHistory,
} from '@/features/tickets/queries';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { Directorio } from '@/features/members/directory';
import {
  ALLOWED_TRANSITIONS,
  type CannedResponse,
  type CommentVisibility,
  type TicketComment,
  type TicketDetail,
} from '@/lib/api/types';

/** Qué botón se apretó: responder a secas, o responder y pasar a la espera. */
type ModoDeEnvio = 'responder' | 'esperar';

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
 *
 * **Respuestas predefinidas (ADR-0030 del backend).** Solo el equipo. Se eligen
 * con el botón "Respuestas" o con `/` en el editor vacío, y se insertan YA
 * rellenadas en el cursor, editables. Si al responderle al cliente queda una
 * variable sin rellenar, el envío pide una segunda confirmación (un estado del
 * formulario, no un `confirm()`); en una nota interna no, porque no le llega.
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
  const editor = useRef<HTMLTextAreaElement>(null);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  /**
   * Se intentó mandar al cliente con una variable sin rellenar, y con qué
   * botón: "Enviar igual" tiene que hacer lo que se pidió, esperar incluido.
   */
  const [confirmando, setConfirmando] = useState<ModoDeEnvio | null>(null);
  const plantillas = useCannedResponses(esEquipo);
  const responderYEsperar = useResponderYEsperar(ticket.id, {
    onExito: () => avisos.exito('Respondido. El ticket espera al cliente'),
    onError: (e) =>
      e instanceof EsperaNoAplicada
        ? // No se oculta que la respuesta SÍ salió: reintentarla la duplicaría.
          avisos.error(
            e.message,
            e.causa instanceof ApiError ? e.causa.message : undefined,
          )
        : avisos.error(
            'No se pudo enviar la respuesta',
            e instanceof ApiError ? e.message : undefined,
          ),
  });
  // El historial solo lo puede pedir el equipo; de ahí salen los cambios de
  // estado que se intercalan. Comparte clave con la pestaña de historial.
  const historial = useTicketHistory(ticket.id, esEquipo);
  const linea = lineaDeTiempo(
    ticket.comments,
    esEquipo ? historial.data : undefined,
    { miId: user?.id, requesterId: ticket.requesterId, assigneeId: ticket.assigneeId },
    directorio,
  );
  // "Responder y esperar al cliente" (ADR-0029): solo si desde acá se puede
  // pasar a la espera. Desde OPEN no: primero alguien tiene que tomarlo.
  const puedeEsperar =
    esEquipo && !nota && ALLOWED_TRANSITIONS[ticket.status].includes('WAITING_ON_CUSTOMER');

  function cambiarVisibilidad(valor: CommentVisibility) {
    setVisibilidad(valor);
    // El aviso habla de lo que va a ver el cliente: en una nota interna ya no
    // aplica, y dejarlo decía algo falso.
    setConfirmando(null);
  }

  function cambiarTexto(valor: string) {
    setTexto(valor);
    // Lo confirmado era OTRO texto: si cambia, se vuelve a preguntar.
    setConfirmando(null);
  }

  function insertarPlantilla(plantilla: CannedResponse) {
    const relleno = fillTemplate(plantilla.body, {
      ticketNumber: ticket.number,
      subject: ticket.subject,
      customerEmail: directorio(ticket.requesterId)?.email ?? null,
      agentEmail: user?.email ?? null,
    });
    const el = editor.current;
    const inicio = el?.selectionStart ?? texto.length;
    const fin = el?.selectionEnd ?? texto.length;
    const { text, cursor } = insertAtCursor(texto, relleno, inicio, fin);
    cambiarTexto(text);
    // Después del render: el diálogo devuelve el foco a su disparador, y el
    // agente quiere seguir escribiendo donde quedó la plantilla.
    requestAnimationFrame(() => {
      editor.current?.focus();
      editor.current?.setSelectionRange(cursor, cursor);
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (esEquipo && e.key === '/' && texto === '') {
      e.preventDefault();
      setSelectorAbierto(true);
    }
  }

  /**
   * Manda el mensaje y, si se pidió, pasa el ticket a la espera. Los dos pasos
   * viven en `useResponderYEsperar` (y no encadenados acá) para que salir de
   * la pantalla a mitad de camino no deje el segundo sin hacer.
   */
  function enviar(modo: ModoDeEnvio) {
    const cuerpo = texto.trim();
    if (cuerpo === '') return;
    setConfirmando(null);
    if (modo === 'esperar') {
      responderYEsperar.mutate(cuerpo, {
        // Solo vaciar el editor: si se desmontó, no hay editor que vaciar.
        // Si falló el SEGUNDO paso la respuesta sí salió, así que también.
        onSuccess: () => setTexto(''),
        onError: (e) => {
          if (e instanceof EsperaNoAplicada) setTexto('');
        },
      });
      return;
    }
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

  function intentar(modo: ModoDeEnvio) {
    if (texto.trim() === '') return;
    if (!nota && hasUnfilledPlaceholder(texto)) {
      setConfirmando(modo);
      return;
    }
    enviar(modo);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    intentar('responder');
  }

  const ocupado = comentar.isPending || responderYEsperar.isPending;

  return (
    <div className="space-y-4">
      {linea.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay respuestas.
        </p>
      ) : (
        <ol className="space-y-4">
          {linea.map((item) =>
            item.tipo === 'comentario' ? (
              <Comentario
                key={item.id}
                comentario={item.comentario}
                ticket={ticket}
                directorio={directorio}
              />
            ) : (
              <CambioDeEstado key={item.id} item={item} />
            ),
          )}
        </ol>
      )}

      {cerrado ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground">
          El ticket está cerrado. Reabrilo para seguir la conversación.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-2">
          <AvisoFueraDeHorario esCliente={user?.role === 'VIEWER'} />
          {esEquipo ? (
            <div className="flex items-center justify-between gap-2">
              <SelectorVisibilidad valor={visibilidad} onChange={cambiarVisibilidad} />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSelectorAbierto(true)}
                title="Respuestas predefinidas (o «/» con el editor vacío)"
              >
                Respuestas
              </Button>
            </div>
          ) : null}
          <Textarea
            ref={editor}
            rows={3}
            value={texto}
            onChange={(e) => cambiarTexto(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              nota
                ? 'Solo la ve el equipo. El cliente no recibe nada.'
                : 'Escribí una respuesta…'
            }
            aria-label={nota ? 'Nota interna' : 'Respuesta'}
            className={cn(nota && 'border-warning-foreground/40 bg-warning')}
          />
          {confirmando !== null ? (
            <p
              role="alert"
              className="flex flex-wrap items-center gap-2 rounded-md border border-warning-foreground/40 bg-warning px-3 py-2 text-xs text-warning-foreground"
            >
              Quedó una variable sin rellenar (algo entre {'{{'} y {'}}'}). El
              cliente la va a ver tal cual.
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => enviar(confirmando)}
              >
                Enviar igual
              </Button>
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={ocupado || texto.trim() === ''}
            >
              {comentar.isPending
                ? 'Enviando…'
                : nota
                  ? 'Guardar nota'
                  : 'Responder'}
            </Button>
            {puedeEsperar ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={ocupado || texto.trim() === ''}
                onClick={() => intentar('esperar')}
              >
                Responder y esperar al cliente
              </Button>
            ) : null}
          </div>
          {esEquipo ? (
            <CannedResponsePicker
              abierto={selectorAbierto}
              onAbiertoChange={setSelectorAbierto}
              respuestas={plantillas.data?.items}
              cargando={plantillas.isPending}
              error={plantillas.isError}
              onElegir={insertarPlantilla}
            />
          ) : null}
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
  const lado = ladoDelMensaje(comentario, ticket.requesterId);

  // Nota interna: al centro, en ámbar y con candado. No es parte de la charla
  // con el cliente, y que sea interna es lo que no hay que perder de vista.
  if (lado === 'nota') {
    return (
      <li data-lado="nota" className="mx-auto w-full max-w-xl">
        <div className="rounded-lg border border-warning-foreground/40 bg-warning px-3 py-2">
          <p className="mb-1 flex flex-wrap items-center gap-x-2 text-xs text-warning-foreground">
            <Lock className="size-3" aria-hidden />
            <span className="font-semibold">Nota interna</span>
            <span>· {etiquetaDelActor(comentario.authorId, papel, directorio)}</span>
            <span>
              · <FechaRelativa iso={comentario.createdAt} />
            </span>
          </p>
          <p className="text-sm leading-6 whitespace-pre-wrap">{comentario.body}</p>
        </div>
      </li>
    );
  }

  const delEquipo = lado === 'equipo';
  return (
    <li
      data-lado={lado}
      className={cn('flex gap-2.5', delEquipo && 'flex-row-reverse')}
    >
      <Avatar variante={esMio ? 'vos' : 'otro'} aria-hidden />
      <div className={cn('flex min-w-0 max-w-[85%] flex-col', delEquipo && 'items-end')}>
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
            'mt-1 rounded-lg border px-3 py-2',
            delEquipo
              ? 'rounded-tr-sm border-accent bg-accent/40'
              : 'rounded-tl-sm border-border bg-card',
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

/** Un cambio de estado en medio de la charla: una línea, no una burbuja. */
function CambioDeEstado({
  item,
}: {
  item: Extract<ItemDeLinea, { tipo: 'estado' }>;
}) {
  return (
    <li
      data-lado="evento"
      className="flex items-center gap-3 text-xs text-muted-foreground"
    >
      <span aria-hidden className="h-px flex-1 bg-border" />
      <span className="flex flex-wrap items-center justify-center gap-x-1.5 text-center">
        <span
          className={cn(
            'font-medium',
            item.hasta === 'WAITING_ON_CUSTOMER' && 'text-warning-foreground',
          )}
        >
          {item.texto}
        </span>
        <span>· {item.actor}</span>
        <span>
          · <FechaRelativa iso={item.at} />
        </span>
      </span>
      <span aria-hidden className="h-px flex-1 bg-border" />
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
