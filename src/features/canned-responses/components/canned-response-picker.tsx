'use client';

import { useMemo, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Input, Skeleton } from '@/components/ui/primitives';
import type { CannedResponse } from '@/lib/api/types';

/**
 * Inserta `insertion` en la posición del cursor (o en lugar de lo seleccionado)
 * y dice dónde tiene que quedar el cursor: al final de lo insertado. Nunca
 * reemplaza lo que el agente ya había escrito.
 */
export function insertAtCursor(
  text: string,
  insertion: string,
  selectionStart: number,
  selectionEnd: number,
): { text: string; cursor: number } {
  const antes = text.slice(0, selectionStart);
  const despues = text.slice(selectionEnd);
  return { text: antes + insertion + despues, cursor: antes.length + insertion.length };
}

/**
 * Buscador de respuestas predefinidas (ADR-0030 del backend).
 *
 * Es un diálogo y no un desplegable: atrapa el foco, cierra con Escape y
 * devuelve el foco al editor, que es justo lo que hace falta para seguir
 * escribiendo después de elegir. El filtro es en el cliente: son pocas.
 */
export function CannedResponsePicker({
  abierto,
  onAbiertoChange,
  respuestas,
  cargando,
  error = false,
  onElegir,
}: {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
  respuestas: CannedResponse[] | undefined;
  cargando: boolean;
  /** La carga falló: no es lo mismo que "no hay ninguna". */
  error?: boolean;
  onElegir: (respuesta: CannedResponse) => void;
}) {
  const [busqueda, setBusqueda] = useState('');

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (respuestas ?? []).filter((r) => r.title.toLowerCase().includes(q));
  }, [respuestas, busqueda]);

  function cambiarAbierto(valor: boolean) {
    if (!valor) setBusqueda('');
    onAbiertoChange(valor);
  }

  return (
    <Dialog
      abierto={abierto}
      onAbiertoChange={cambiarAbierto}
      titulo="Respuestas predefinidas"
      descripcion="Se insertan en el editor y las podés cambiar antes de enviar."
    >
      <div className="space-y-3">
        <Input
          autoFocus
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por título…"
          aria-label="Buscar respuesta"
        />
        {cargando ? (
          <Skeleton className="h-16" />
        ) : error ? (
          <p className="text-sm text-destructive">
            No se pudieron cargar las respuestas. Probá de nuevo en un rato.
          </p>
        ) : (respuestas ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay respuestas predefinidas. Las crea un administrador en
            Configuración → Respuestas.
          </p>
        ) : visibles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ninguna coincide.</p>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {visibles.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    onElegir(r);
                    cambiarAbierto(false);
                  }}
                  className="w-full rounded-md px-2.5 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                >
                  <span className="block text-sm font-medium">{r.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {r.body}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
