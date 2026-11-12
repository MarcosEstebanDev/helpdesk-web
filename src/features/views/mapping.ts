import type { TicketStatus, ViewFilters } from '@/lib/api/types';

/** Lo que la bandeja guarda en su estado y una vista puede fijar. */
export interface EstadoDeBandeja {
  estado: TicketStatus | '';
  soloMios: boolean;
  soloIaUrgentes: boolean;
  etiquetas: string[];
  texto: string;
}

/**
 * Vista → estado de la bandeja (ADR-0033 del backend). `assignee: 'me'` es
 * "Mis tickets": cada agente que abre una vista compartida ve lo suyo.
 */
export function filtrosDeVistaAEstado(filtros: ViewFilters): EstadoDeBandeja {
  return {
    estado: filtros.status ?? '',
    soloMios: filtros.assignee === 'me',
    soloIaUrgentes: filtros.aiSuggestsHigher === true,
    etiquetas: [...(filtros.tagIds ?? [])].sort(),
    texto: filtros.q ?? '',
  };
}

/** Estado → filtros para guardar. Lo vacío se omite, como pide el backend. */
export function estadoAFiltrosDeVista(e: EstadoDeBandeja): ViewFilters {
  const filtros: ViewFilters = { version: 1 };
  if (e.estado !== '') filtros.status = e.estado;
  if (e.soloMios) filtros.assignee = 'me';
  if (e.soloIaUrgentes) filtros.aiSuggestsHigher = true;
  if (e.etiquetas.length > 0) filtros.tagIds = [...e.etiquetas].sort();
  const q = e.texto.trim();
  if (q !== '') filtros.q = q;
  return filtros;
}

/** ¿Guardar daría la misma vista? Para ofrecer "Actualizar vista" solo si cambió algo. */
export function mismoEstado(a: EstadoDeBandeja, b: EstadoDeBandeja): boolean {
  return (
    JSON.stringify(estadoAFiltrosDeVista(a)) ===
    JSON.stringify(estadoAFiltrosDeVista(b))
  );
}
