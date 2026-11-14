'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  ErrorText,
  Input,
  Label,
  Skeleton,
  Textarea,
} from '@/components/ui/primitives';
import { useAvisos } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session';
import {
  useCannedResponses,
  useCreateCannedResponse,
  useDeleteCannedResponse,
  useUpdateCannedResponse,
} from '@/features/canned-responses/queries';
import { ApiError } from '@/lib/api/client';
import type { CannedResponse, CannedResponseInput } from '@/lib/api/types';

const VARIABLES = [
  '{{ticket.numero}}',
  '{{ticket.asunto}}',
  '{{cliente.email}}',
  '{{agente.email}}',
];

/** Un 409 tiene su propio texto; el resto de errores trae el mensaje del backend. */
function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'ticketing.duplicate_canned_response_title') {
      return 'Ya hay una respuesta con ese título.';
    }
    return error.message;
  }
  return 'No se pudo guardar.';
}

/**
 * Configuración → Respuestas (ADR-0030 del backend). Solo ADMIN: el AGENT las
 * usa desde el ticket, pero no las edita.
 */
export default function RespuestasPage() {
  const { user } = useSession();
  const esAdmin = user?.role === 'ADMIN';
  const { data, isPending, isError, error } = useCannedResponses(esAdmin);
  /** `null` = cerrado; `'nueva'` = alta; si no, la que se edita. */
  const [editando, setEditando] = useState<'nueva' | CannedResponse | null>(null);

  if (!esAdmin) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Solo un administrador puede editar las respuestas predefinidas.
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-prose">
          <h1 className="text-xl font-semibold tracking-tight">Respuestas</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Textos que el equipo inserta en un ticket con «Respuestas» o con
            «/». Variables: {VARIABLES.join(', ')}.
          </p>
        </div>
        {editando === null ? (
          <Button size="sm" onClick={() => setEditando('nueva')}>
            Nueva respuesta
          </Button>
        ) : null}
      </div>

      {editando === 'nueva' ? (
        <Formulario onCerrar={() => setEditando(null)} />
      ) : null}

      {isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((fila) => (
            <Skeleton key={fila} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <Card className="p-4">
          <ErrorText>
            {error instanceof ApiError
              ? error.message
              : 'No se pudieron cargar las respuestas.'}
          </ErrorText>
        </Card>
      ) : data.items.length === 0 && editando !== 'nueva' ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Todavía no hay respuestas predefinidas.
        </Card>
      ) : (
        <ul className="space-y-2">
          {data.items.map((r) =>
            editando !== null && editando !== 'nueva' && editando.id === r.id ? (
              <li key={r.id}>
                <Formulario existente={r} onCerrar={() => setEditando(null)} />
              </li>
            ) : (
              <Fila key={r.id} respuesta={r} onEditar={() => setEditando(r)} />
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function Fila({
  respuesta,
  onEditar,
}: {
  respuesta: CannedResponse;
  onEditar: () => void;
}) {
  const avisos = useAvisos();
  const borrar = useDeleteCannedResponse();
  const [confirmando, setConfirmando] = useState(false);

  return (
    <li>
      <Card className="flex items-start justify-between gap-3 p-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{respuesta.title}</p>
          <p className="mt-0.5 text-xs whitespace-pre-wrap text-muted-foreground">
            {respuesta.body}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {confirmando ? (
            <>
              <Button
                size="sm"
                variant="destructive"
                disabled={borrar.isPending}
                onClick={() =>
                  borrar.mutate(respuesta.id, {
                    onSuccess: () => avisos.exito('Respuesta borrada'),
                    onError: (e) =>
                      avisos.error('No se pudo borrar', mensajeDeError(e)),
                    onSettled: () => setConfirmando(false),
                  })
                }
              >
                Sí, borrar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmando(false)}>
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={onEditar}>
                Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmando(true)}>
                Borrar
              </Button>
            </>
          )}
        </div>
      </Card>
    </li>
  );
}

function Formulario({
  existente,
  onCerrar,
}: {
  existente?: CannedResponse;
  onCerrar: () => void;
}) {
  const avisos = useAvisos();
  const crear = useCreateCannedResponse();
  const actualizar = useUpdateCannedResponse();
  const [titulo, setTitulo] = useState(existente?.title ?? '');
  const [texto, setTexto] = useState(existente?.body ?? '');
  const [fallo, setFallo] = useState<string | null>(null);
  const guardando = crear.isPending || actualizar.isPending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFallo(null);
    const input: CannedResponseInput = { title: titulo, body: texto };
    const callbacks = {
      onSuccess: () => {
        avisos.exito(existente ? 'Respuesta guardada' : 'Respuesta creada');
        onCerrar();
      },
      onError: (e: unknown) => setFallo(mensajeDeError(e)),
    };
    if (existente) {
      actualizar.mutate({ id: existente.id, input }, callbacks);
    } else {
      crear.mutate(input, callbacks);
    }
  }

  return (
    <Card className="p-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="cr-titulo">Título</Label>
          <Input
            id="cr-titulo"
            value={titulo}
            maxLength={80}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cr-texto">Texto</Label>
          <Textarea
            id="cr-texto"
            rows={4}
            value={texto}
            maxLength={5000}
            onChange={(e) => setTexto(e.target.value)}
            required
          />
        </div>
        {fallo !== null ? <ErrorText>{fallo}</ErrorText> : null}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
