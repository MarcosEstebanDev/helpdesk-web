'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Si un atajo de la bandeja tiene que dejar pasar esta tecla.
 *
 * Lo importante es el primer caso: "j" escrita en la búsqueda es una letra, no
 * una orden. También se ignora con modificadores (Ctrl+J es del navegador) y
 * dentro de un diálogo, que tapa la bandeja aunque la bandeja siga montada.
 */
export function debeIgnorarTecla(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return true;
  const target = e.target;
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true;
  return target.closest('[role="dialog"]') !== null;
}

/** A qué fila moverse. `null` si la tecla no es de navegación o no hay filas. */
export function siguienteIndice(
  actual: number,
  tecla: string,
  total: number,
): number | null {
  if (total === 0) return null;
  if (tecla === 'j') return Math.min(actual + 1, total - 1);
  if (tecla === 'k') return Math.max(actual - 1, 0);
  return null;
}

/** Atributo que marca cada fila navegable dentro del contenedor. */
export const ATRIBUTO_FILA = 'data-fila-ticket';

/**
 * `j`/`k` mueven el FOCO entre las filas del contenedor; Enter abre la fila
 * enfocada porque cada fila es un enlace (lo hace el navegador, no este hook).
 * Mover el foco en vez de llevar un "índice activo" en estado tiene dos
 * ventajas: el lector de pantalla anuncia la fila, y no hay estado que se
 * desincronice cuando la lista cambia por un aviso del servidor.
 */
export function useNavegacionConTeclado(contenedor: RefObject<HTMLElement | null>) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (debeIgnorarTecla(e) || contenedor.current === null) return;
      const filas = Array.from(
        contenedor.current.querySelectorAll<HTMLElement>(`[${ATRIBUTO_FILA}]`),
      );
      const actual = filas.findIndex((f) => f === document.activeElement);
      const destino = siguienteIndice(actual, e.key, filas.length);
      if (destino === null) return;
      e.preventDefault();
      filas[destino].focus();
      filas[destino].scrollIntoView?.({ block: 'nearest' });
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [contenedor]);
}
