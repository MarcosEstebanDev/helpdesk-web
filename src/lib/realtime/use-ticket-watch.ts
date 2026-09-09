'use client';

import { useEffect } from 'react';
import { useWs } from '@/providers/ws-provider';

/**
 * Sigue un ticket mientras el componente esté montado.
 *
 * El backend manda los avisos del detalle (comentarios, cambios de estado) solo
 * a quien está en la room de ESE ticket, así que abrir el detalle sin seguirlo
 * deja la pantalla quieta. Atarlo al ciclo de vida del componente evita el fallo
 * contrario, más caro: seguir acumulando rooms de tickets que el usuario ya
 * cerró, y recibir avisos de media organización.
 *
 * Acepta `null` para el caso normal de un detalle que aún no sabe qué ticket
 * pinta (ruta cargando, datos en vuelo).
 */
export function useTicketWatch(ticketId: string | null): void {
  const { watchTicket } = useWs();

  useEffect(() => {
    if (ticketId === null) return;
    return watchTicket(ticketId);
  }, [ticketId, watchTicket]);
}
