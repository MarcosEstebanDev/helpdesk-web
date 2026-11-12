'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, ErrorText, Input, Label, Skeleton } from '@/components/ui/primitives';
import { useAvisos } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session';
import { TagLozenge, clasesDeColor } from '@/features/tags/components/tag-lozenge';
import { useDeleteTag, useTags, useUpdateTag } from '@/features/tags/queries';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { TAG_COLORS, type Tag, type TagColor } from '@/lib/api/types';

function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'ticketing.duplicate_tag_name') {
      return 'Ya hay una etiqueta con ese nombre.';
    }
    return error.message;
  }
  return 'No se pudo guardar.';
}

/**
 * Configuración → Etiquetas (ADR-0031 del backend). Solo ADMIN: renombrar o
 * borrar cambia TODOS los tickets que la usan. Crear no está acá: lo hace el
 * agente al vuelo desde el ticket.
 */
export default function EtiquetasPage() {
  const { user } = useSession();
  const esAdmin = user?.role === 'ADMIN';
  const { data, isPending, isError, error } = useTags(esAdmin);
  const [editando, setEditando] = useState<string | null>(null);

  if (!esAdmin) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Solo un administrador puede editar las etiquetas.
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="max-w-prose">
        <h1 className="text-xl font-semibold tracking-tight">Etiquetas</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Clasificación interna del equipo: el cliente no las ve. Los agentes
          las crean desde el ticket; acá se renombran, cambian de color o se
          borran.
        </p>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((fila) => (
            <Skeleton key={fila} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <Card className="p-4">
          <ErrorText>
            {error instanceof ApiError
              ? error.message
              : 'No se pudieron cargar las etiquetas.'}
          </ErrorText>
        </Card>
      ) : data.items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Todavía no hay etiquetas. Se crean desde un ticket.
        </Card>
      ) : (
        <ul className="space-y-2">
          {data.items.map((tag) =>
            editando === tag.id ? (
              <li key={tag.id}>
                <Formulario tag={tag} onCerrar={() => setEditando(null)} />
              </li>
            ) : (
              <Fila key={tag.id} tag={tag} onEditar={() => setEditando(tag.id)} />
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function Fila({ tag, onEditar }: { tag: Tag; onEditar: () => void }) {
  const avisos = useAvisos();
  const borrar = useDeleteTag();
  const [confirmando, setConfirmando] = useState(false);

  return (
    <li>
      <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
        <TagLozenge tag={tag} />
        {confirmando ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Se quita de todos los tickets que la tienen; el historial conserva
              su nombre.
            </span>
            <Button
              size="sm"
              variant="destructive"
              disabled={borrar.isPending}
              onClick={() =>
                borrar.mutate(tag.id, {
                  onSuccess: () => avisos.exito('Etiqueta borrada'),
                  onError: (e) => avisos.error('No se pudo borrar', mensajeDeError(e)),
                  onSettled: () => setConfirmando(false),
                })
              }
            >
              Sí, borrar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={onEditar}>
              Editar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmando(true)}>
              Borrar
            </Button>
          </div>
        )}
      </Card>
    </li>
  );
}

function Formulario({ tag, onCerrar }: { tag: Tag; onCerrar: () => void }) {
  const avisos = useAvisos();
  const actualizar = useUpdateTag();
  const [nombre, setNombre] = useState(tag.name);
  const [color, setColor] = useState<TagColor>(tag.color);
  const [fallo, setFallo] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFallo(null);
    actualizar.mutate(
      { id: tag.id, input: { name: nombre, color } },
      {
        onSuccess: () => {
          avisos.exito('Etiqueta guardada');
          onCerrar();
        },
        onError: (err) => setFallo(mensajeDeError(err)),
      },
    );
  }

  return (
    <Card className="p-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor={`tag-${tag.id}`}>Nombre</Label>
          <Input
            id={`tag-${tag.id}`}
            value={nombre}
            maxLength={40}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>
        <fieldset className="space-y-1">
          <legend className="text-xs font-semibold text-muted-foreground">Color</legend>
          <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-1.5">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={c}
                onClick={() => setColor(c)}
                className={cn(
                  'size-6 rounded-full border-2 border-transparent',
                  clasesDeColor(c),
                  color === c && 'border-foreground',
                )}
              />
            ))}
          </div>
        </fieldset>
        <div>
          <TagLozenge tag={{ ...tag, name: nombre.trim() || tag.name, color }} />
        </div>
        {fallo !== null ? <ErrorText>{fallo}</ErrorText> : null}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={actualizar.isPending}>
            {actualizar.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
