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
};

export function filtrosDeBandeja({
  estado,
  soloMios,
  miId,
}: {
  estado: TicketStatus | '';
  soloMios: boolean;
  miId: string | undefined;
}): FiltrosDeBandeja {
  const filtros: FiltrosDeBandeja = {};
  if (estado !== '') filtros.status = estado;
  if (soloMios && miId !== undefined) filtros.assigneeId = miId;
  return filtros;
}

/** Si hay algo filtrando, para decidir qué mensaje merece una bandeja vacía. */
export function hayFiltros(filtros: FiltrosDeBandeja): boolean {
  return Object.keys(filtros).length > 0;
}
