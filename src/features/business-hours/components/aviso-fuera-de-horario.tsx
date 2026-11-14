'use client';

import { Clock } from 'lucide-react';
import { textoProximaApertura } from '@/features/business-hours/format';
import { useBusinessStatus } from '@/features/business-hours/queries';

/**
 * Aviso al cliente que escribe fuera de horario (ADR-0034): puede escribir
 * igual —queda en cola—, pero sabe cuándo lo van a ver. Es un cartel en la
 * pantalla, no un mensaje en la conversación.
 *
 * Solo para el cliente (VIEWER): el equipo conoce su horario, y a él ni se le
 * pide el estado. Mientras carga, o con la oficina abierta, no pinta nada.
 */
export function AvisoFueraDeHorario({ esCliente }: { esCliente: boolean }) {
  const { data } = useBusinessStatus(esCliente);
  if (!esCliente || data === undefined || data.open || data.nextOpening === null) {
    return null;
  }
  return (
    <p
      role="note"
      className="flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground"
    >
      <Clock className="mt-px size-3.5 shrink-0" aria-hidden />
      {textoProximaApertura(data.nextOpening, data.timeZone, new Date())}
    </p>
  );
}
