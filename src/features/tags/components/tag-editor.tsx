'use client';

import { X } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { ErrorText, Input } from '@/components/ui/primitives';
import { TagLozenge } from '@/features/tags/components/tag-lozenge';
import { useCreateTag, useSetTicketTags, useTags } from '@/features/tags/queries';
import { ApiError } from '@/lib/api/client';
import type { Tag } from '@/lib/api/types';

const mensaje = (e: unknown): string =>
  e instanceof ApiError ? e.message : 'No se pudieron guardar las etiquetas.';

/**
 * Etiquetas de un ticket (ADR-0031 del backend). Solo lo monta el equipo.
 *
 * Cada cambio manda el conjunto ENTERO (`PUT`), que es lo que expone la API.
 * Si lo escrito no existe en el catálogo, ofrece crearla: el agente no tiene
 * que salir del ticket para pedírsela a un administrador.
 */
export function TagEditor({
  ticketId,
  tags,
  cerrado,
}: {
  ticketId: string;
  tags: Tag[];
  /** Un ticket cerrado no se re-etiqueta (el backend respondería 409). */
  cerrado: boolean;
}) {
  const listaId = useId();
  const catalogo = useTags(!cerrado);
  const guardar = useSetTicketTags(ticketId);
  const crear = useCreateTag();
  const [texto, setTexto] = useState('');
  const [fallo, setFallo] = useState<string | null>(null);

  const actuales = useMemo(() => new Set(tags.map((t) => t.id)), [tags]);
  const consulta = texto.trim().toLowerCase();

  const sugerencias = useMemo(
    () =>
      consulta === ''
        ? []
        : (catalogo.data?.items ?? [])
            .filter((t) => !actuales.has(t.id))
            .filter((t) => t.name.toLowerCase().includes(consulta))
            .slice(0, 8),
    [catalogo.data, actuales, consulta],
  );
  const existeExacta = (catalogo.data?.items ?? []).some(
    (t) => t.name.toLowerCase() === consulta,
  );
  const ocupado = guardar.isPending || crear.isPending;

  function poner(ids: string[]) {
    setFallo(null);
    guardar.mutate(ids, { onError: (e) => setFallo(mensaje(e)) });
  }

  function agregar(tag: Tag) {
    setTexto('');
    poner([...tags.map((t) => t.id), tag.id]);
  }

  function crearYAgregar() {
    const nombre = texto.trim();
    setFallo(null);
    crear.mutate(
      { name: nombre },
      { onSuccess: agregar, onError: (e) => setFallo(mensaje(e)) },
    );
  }

  return (
    <div className="space-y-1.5">
      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <li key={tag.id}>
              <TagLozenge tag={tag}>
                {cerrado ? null : (
                  <button
                    type="button"
                    disabled={ocupado}
                    aria-label={`Quitar la etiqueta ${tag.name}`}
                    onClick={() =>
                      poner(tags.filter((t) => t.id !== tag.id).map((t) => t.id))
                    }
                    className="rounded-sm opacity-60 hover:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </TagLozenge>
            </li>
          ))}
        </ul>
      ) : cerrado ? (
        <span className="text-xs text-muted-foreground">Sin etiquetas</span>
      ) : null}

      {cerrado ? null : (
        <div className="relative">
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Agregar…"
            aria-label="Agregar etiqueta"
            aria-controls={listaId}
            maxLength={40}
            disabled={ocupado}
            className="h-7 text-xs"
          />
          {consulta !== '' ? (
            <ul
              id={listaId}
              role="listbox"
              className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover p-1 shadow-md"
            >
              {sugerencias.map((tag) => (
                <li
                  key={tag.id}
                  role="option"
                  aria-selected={false}
                  aria-label={tag.name}
                  tabIndex={0}
                  onClick={() => agregar(tag)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') agregar(tag);
                  }}
                  className="cursor-pointer rounded-sm px-1.5 py-1 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                >
                  <TagLozenge tag={tag} />
                </li>
              ))}
              {existeExacta ? null : (
                <li
                  role="option"
                  aria-selected={false}
                  tabIndex={0}
                  onClick={crearYAgregar}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') crearYAgregar();
                  }}
                  className="cursor-pointer rounded-sm px-1.5 py-1 text-xs hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                >
                  Crear «{texto.trim()}»
                </li>
              )}
            </ul>
          ) : null}
        </div>
      )}

      {fallo !== null ? <ErrorText>{fallo}</ErrorText> : null}
    </div>
  );
}
