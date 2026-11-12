import type { SavedView } from '@/lib/api/types';

export type VistaResuelta =
  | { tipo: 'sin-vista'; key: string; vista: null }
  | { tipo: 'cargando'; key: string; vista: null }
  | { tipo: 'error'; key: string; vista: null }
  | { tipo: 'perdida'; key: string; vista: null }
  | { tipo: 'vista'; key: string; vista: SavedView };

/**
 * Qué hacer con `?vista=` (ADR-0033 del backend), como función pura.
 *
 * La `key` es la que monta la bandeja: cambia cuando la vista se resuelve
 * (error → éxito) o se edita (`updatedAt`). Sin eso, una bandeja montada sin
 * filtros porque la carga falló se quedaba así al recuperarse, y "Actualizar
 * vista" la guardaba vacía (revisión final).
 */
export function resolverVista(
  vistaId: string | null,
  esEquipo: boolean,
  consulta: {
    isPending: boolean;
    isError: boolean;
    data: { items: SavedView[] } | undefined;
  },
): VistaResuelta {
  // Un VIEWER no usa vistas: el parámetro se ignora sin avisar nada.
  if (vistaId === null || !esEquipo) {
    return { tipo: 'sin-vista', key: 'todas', vista: null };
  }
  if (consulta.isError) return { tipo: 'error', key: `${vistaId}:error`, vista: null };
  if (consulta.isPending || consulta.data === undefined) {
    return { tipo: 'cargando', key: `${vistaId}:cargando`, vista: null };
  }
  const vista = consulta.data.items.find((v) => v.id === vistaId);
  if (vista === undefined) {
    return { tipo: 'perdida', key: `${vistaId}:perdida`, vista: null };
  }
  return { tipo: 'vista', key: `${vistaId}:${vista.updatedAt}`, vista };
}
