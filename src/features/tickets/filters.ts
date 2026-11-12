import type { TicketStatus } from '@/lib/api/types';

/**
 * Los filtros de la bandeja, en una función pura.
 *
 * Vive aparte de la pantalla por una razón concreta: **este objeto ES la clave
 * de caché**. `useTickets` lo pasa a `ticketKeys.list(filtros)` y TanStack Query
 * lo hashea tal cual, así que cada campo que se agregue o se omita parte la
 * caché de otra manera. Aislarlo lo hace probable sin montar React.
 *
 * De ahí las dos reglas que se prueban en `filters.test.ts`:
 * - Una clave que no aplica **se omite**, no se pone en `undefined`: `{}` y
 *   `{ status: undefined }` son claves distintas, y la primera es la que ya
 *   tiene datos cargados de antes.
 * - Si "mis tickets" está activo pero no hay sesión, no se manda `assigneeId`.
 *   Antes que inventar un UUID, se pide sin filtrar.
 *
 * El tipo va como `type` y no como `interface`: `ticketKeys.list()` acepta un
 * `Record<string, unknown>`, y TypeScript solo le da firma de índice implícita
 * a los alias de tipo, no a las interfaces.
 */
export type FiltrosDeBandeja = {
  status?: TicketStatus;
  assigneeId?: string;
  requesterId?: string;
  /** `true` o ausente, nunca `false`: ver la regla de las claves omitidas. */
  aiSuggestsHigher?: true;
  /** Etiquetas, ORDENADAS: el mismo conjunto tiene que ser la misma clave. */
  tagIds?: string[];
  /** Texto libre (ADR-0032), recortado. */
  q?: string;
};

export function filtrosDeBandeja({
  estado,
  soloMios,
  miId,
  esAgente,
  soloIaUrgentes = false,
  etiquetas = [],
  busqueda = '',
}: {
  estado: TicketStatus | '';
  soloMios: boolean;
  miId: string | undefined;
  /** Decide QUÉ significa "míos": ver abajo. */
  esAgente: boolean;
  /** "La IA sugiere más urgencia". Solo cuenta para AGENT o superior. */
  soloIaUrgentes?: boolean;
  /** Ids de etiquetas: "al menos una de" (ADR-0031). Solo para el equipo. */
  etiquetas?: string[];
  /** Texto de la caja de búsqueda. Para todos los roles: el backend decide
   *  qué comentarios cuentan (al cliente no le cuentan las notas internas). */
  busqueda?: string;
}): FiltrosDeBandeja {
  const filtros: FiltrosDeBandeja = {};
  if (estado !== '') filtros.status = estado;

  // "Míos" no significa lo mismo para todos, y por eso son dos campos distintos
  // y no uno. Un agente quiere lo que le TOCA (`assigneeId`); un VIEWER es el
  // cliente final, no puede tener nada asignado, y lo suyo son los tickets que
  // ABRIÓ (`requesterId`). Un solo filtro obligaría a que la palabra significara
  // una cosa para unos y otra para otros sin decirlo.
  if (soloMios && miId !== undefined) {
    if (esAgente) filtros.assigneeId = miId;
    else filtros.requesterId = miId;
  }

  // Para un VIEWER el backend respondería 403: la sugerencia es del equipo. No
  // se manda en vez de mandarla y mostrar un error que el usuario no provocó.
  if (soloIaUrgentes && esAgente) filtros.aiSuggestsHigher = true;

  // Mismo criterio: las etiquetas son del equipo. Vacío se omite (regla de las
  // claves omitidas) y el orden se normaliza, porque elegir A y después B o B y
  // después A es el mismo filtro y no debe partir la caché en dos.
  if (esAgente && etiquetas.length > 0) filtros.tagIds = [...etiquetas].sort();

  // Recortado: "pdf" y "pdf " son la misma búsqueda y la misma clave.
  const q = busqueda.trim();
  if (q !== '') filtros.q = q;

  return filtros;
}

/** Si hay algo filtrando, para decidir qué mensaje merece una bandeja vacía. */
export function hayFiltros(filtros: FiltrosDeBandeja): boolean {
  return Object.keys(filtros).length > 0;
}
