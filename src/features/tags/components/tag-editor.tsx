'use client';

import { X } from 'lucide-react';
import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { ErrorText, Input } from '@/components/ui/primitives';
import { TagLozenge } from '@/features/tags/components/tag-lozenge';
import { useCreateTag, useSetTicketTags, useTags } from '@/features/tags/queries';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { Tag } from '@/lib/api/types';

/** El mismo máximo que el backend (ADR-0031). */
const MAX_ETIQUETAS = 10;

const mensaje = (e: unknown): string =>
  e instanceof ApiError ? e.message : 'No se pudieron guardar las etiquetas.';

type Opcion = { tipo: 'etiqueta'; tag: Tag } | { tipo: 'crear'; nombre: string };

/**
 * Etiquetas de un ticket (ADR-0031 del backend). Solo lo monta el equipo.
 *
 * Cada cambio manda el conjunto ENTERO (`PUT`), que es lo que expone la API.
 * Si lo escrito no existe en el catálogo, ofrece crearla: el agente no tiene
 * que salir del ticket para pedírsela a un administrador.
 *
 * Es un combobox ARIA: el foco se queda en la caja, las flechas mueven la
 * opción activa (`aria-activedescendant`), Enter elige (la primera si no hay
 * ninguna activa) y Escape cierra la lista sin borrar lo escrito.
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
  const [abierta, setAbierta] = useState(false);
  const [activa, setActiva] = useState(-1);
  const [fallo, setFallo] = useState<string | null>(null);

  const actuales = useMemo(() => new Set(tags.map((t) => t.id)), [tags]);
  const consulta = texto.trim().toLowerCase();
  const ocupado = guardar.isPending || crear.isPending;
  const lleno = tags.length >= MAX_ETIQUETAS;

  const opciones = useMemo((): Opcion[] => {
    // Sin catálogo cargado no se ofrece nada: ni sugerencias ni "Crear", que
    // podría ser una etiqueta que ya existe (y daría 409).
    if (consulta === '' || catalogo.data === undefined) return [];
    const todas = catalogo.data.items;
    const sugerencias: Opcion[] = todas
      .filter((t) => !actuales.has(t.id))
      .filter((t) => t.name.toLowerCase().includes(consulta))
      .slice(0, 8)
      .map((tag) => ({ tipo: 'etiqueta', tag }));
    const existe = todas.some((t) => t.name.toLowerCase() === consulta);
    return existe
      ? sugerencias
      : [...sugerencias, { tipo: 'crear', nombre: texto.trim() }];
  }, [catalogo.data, actuales, consulta, texto]);

  // Mientras algo se guarda, sin opciones: elegir otra en ese momento mandaba
  // después un conjunto viejo que la pisaba (y "Crear" se podía pulsar dos
  // veces). Los botones de quitar también se deshabilitan.
  const listaVisible = abierta && !ocupado && opciones.length > 0;
  const idDe = (i: number) => `${listaId}-${i}`;

  function poner(ids: string[]) {
    setFallo(null);
    guardar.mutate(ids, { onError: (e) => setFallo(mensaje(e)) });
  }

  function agregar(tag: Tag) {
    setTexto('');
    setActiva(-1);
    poner([...tags.map((t) => t.id), tag.id]);
  }

  function elegir(opcion: Opcion) {
    if (opcion.tipo === 'etiqueta') {
      agregar(opcion.tag);
      return;
    }
    setFallo(null);
    crear.mutate(
      { name: opcion.nombre },
      { onSuccess: agregar, onError: (e) => setFallo(mensaje(e)) },
    );
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAbierta(true);
      setActiva((i) => Math.min(i + 1, opciones.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiva((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opcion = opciones[activa >= 0 ? activa : 0];
      if (listaVisible && opcion !== undefined) elegir(opcion);
    } else if (e.key === 'Escape') {
      setAbierta(false);
      setActiva(-1);
    }
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

      {cerrado ? null : lleno ? (
        // Sin caja: crear una más la dejaría huérfana en el catálogo, porque el
        // `PUT` respondería 400 por el máximo.
        <p className="text-xs text-muted-foreground">
          Llegó al máximo de 10 etiquetas. Quitá una para agregar otra.
        </p>
      ) : (
        <div className="relative">
          <Input
            role="combobox"
            aria-label="Agregar etiqueta"
            aria-autocomplete="list"
            aria-expanded={listaVisible}
            aria-controls={listaId}
            aria-activedescendant={
              listaVisible && activa >= 0 ? idDe(activa) : undefined
            }
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setAbierta(true);
              setActiva(-1);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => setAbierta(false)}
            onFocus={() => setAbierta(true)}
            placeholder="Agregar…"
            maxLength={40}
            disabled={ocupado}
            className="h-7 text-xs"
          />
          {listaVisible ? (
            <ul
              id={listaId}
              role="listbox"
              aria-label="Etiquetas"
              className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover p-1 shadow-md"
            >
              {opciones.map((opcion, i) => (
                <li
                  key={opcion.tipo === 'etiqueta' ? opcion.tag.id : 'crear'}
                  id={idDe(i)}
                  role="option"
                  aria-selected={i === activa}
                  aria-label={
                    opcion.tipo === 'etiqueta'
                      ? opcion.tag.name
                      : `Crear «${opcion.nombre}»`
                  }
                  // `mousedown` + preventDefault: si no, el `blur` de la caja
                  // cierra la lista antes de que llegue el clic.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => elegir(opcion)}
                  className={cn(
                    'cursor-pointer rounded-sm px-1.5 py-1 text-xs hover:bg-accent',
                    i === activa && 'bg-accent',
                  )}
                >
                  {opcion.tipo === 'etiqueta' ? (
                    <TagLozenge tag={opcion.tag} />
                  ) : (
                    `Crear «${opcion.nombre}»`
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      {fallo !== null ? <ErrorText>{fallo}</ErrorText> : null}
    </div>
  );
}
