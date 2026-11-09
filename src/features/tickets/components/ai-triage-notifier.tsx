'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useAvisos } from '@/components/ui/toast';
import {
  CATEGORIA_IA,
  PRIORIDAD_IA,
  direccion,
  etiqueta,
} from '@/features/tickets/ai-labels';
import type { TicketTriagedMessage } from '@/lib/realtime/events';
import { useWs } from '@/providers/ws-provider';

/**
 * Qué decir cuando la IA clasifica un ticket, o `null` si no vale la pena.
 *
 * Solo se avisa cuando la sugerencia DIFIERE de la prioridad que tiene el
 * ticket: un aviso por cada ticket que entra se convierte en ruido en una hora,
 * y el ruido se aprende a ignorar. Si el evento no trae la prioridad actual
 * (eventos viejos), tampoco se avisa: no hay con qué comparar.
 */
export function avisoDeClasificacion(
  msg: TicketTriagedMessage,
): { titulo: string; detalle: string } | null {
  if (msg.currentPriority === undefined) return null;
  const sentido = direccion(msg.currentPriority, msg.suggestedPriority);
  if (sentido === 'igual') return null;

  const numero = msg.number === undefined ? 'un ticket' : `#${msg.number}`;
  const sugerida = etiqueta(PRIORIDAD_IA, msg.suggestedPriority);
  const actual = etiqueta(PRIORIDAD_IA, msg.currentPriority).toLowerCase();

  return {
    titulo: `La IA sugiere ${sugerida.toLowerCase()} para ${numero}`,
    detalle: `${etiqueta(CATEGORIA_IA, msg.category)} · hoy está en ${actual}`,
  };
}

/** Escucha las clasificaciones y las anuncia. No pinta nada propio. */
export function AiTriageNotifier() {
  const { alClasificar } = useWs();
  const avisos = useAvisos();
  const router = useRouter();

  // `useAvisos` y el router devuelven objetos nuevos en cada render; con refs,
  // la suscripción se hace UNA vez y no se rehace en cada pintado.
  const avisosRef = useRef(avisos);
  const routerRef = useRef(router);
  useEffect(() => {
    avisosRef.current = avisos;
    routerRef.current = router;
  });

  useEffect(
    () =>
      alClasificar((msg) => {
        const aviso = avisoDeClasificacion(msg);
        if (aviso === null) return;
        avisosRef.current.ia(aviso.titulo, aviso.detalle, {
          texto: 'Ver ticket',
          alPulsar: () => routerRef.current.push(`/tickets/${msg.ticketId}`),
        });
      }),
    [alClasificar],
  );

  return null;
}
