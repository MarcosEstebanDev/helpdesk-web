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
};

export function filtrosDeBandeja({
  estado,
  soloMios,
  miId,
  esAgente,
}: {
  estado: TicketStatus | '';
  soloMios: boolean;
  miId: string | undefined;
  /** Decide QUÉ significa "míos": ver abajo. */
  esAgente: boolean;
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

  return filtros;
}

/** Si hay algo filtrando, para decidir qué mensaje merece una bandeja vacía. */
export function hayFiltros(filtros: FiltrosDeBandeja): boolean {
  return Object.keys(filtros).length > 0;
}
