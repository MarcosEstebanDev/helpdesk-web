'use client';

import { Button } from '@/components/ui/button';
import { useAvisos } from '@/components/ui/toast';
import { useChangeStatus } from '@/features/tickets/queries';
import { accionesDesde, type AccionDeEstado } from '@/features/tickets/status-actions';
import { ApiError } from '@/lib/api/client';
import type { TicketStatus } from '@/lib/api/types';

/**
 * Las acciones de estado como botones a la vista, en la cabecera del detalle
 * (UX 2026-11-13). Antes vivían en un menú del panel lateral: cambiar el
 * estado es LO que viene a hacer un agente, y esconderlo detrás de un clic
 * más lo hacía parecer un dato y no una acción.
 *
 * Son a lo sumo tres (ADR-0015), así que caben. Siguen siendo solo las
 * transiciones legales; el backend responde 409 igual. "Resolver" es la
 * principal: es el final feliz de casi todos los caminos.
 */
export function AccionesDeEstado({
  ticketId,
  status,
}: {
  ticketId: string;
  status: TicketStatus;
}) {
  const avisos = useAvisos();
  const cambiarEstado = useChangeStatus(ticketId);
  const acciones = accionesDesde(status);

  if (acciones.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Un ticket cerrado no admite más cambios.
      </p>
    );
  }

  function transicionar(accion: AccionDeEstado) {
    cambiarEstado.mutate(accion.to, {
      onSuccess: () => avisos.exito(`${accion.label}: hecho`),
      onError: (e) =>
        avisos.error(
          'No se pudo cambiar el estado',
          e instanceof ApiError ? e.message : undefined,
        ),
    });
  }

  return (
    <div role="group" aria-label="Cambiar estado" className="flex flex-wrap gap-2">
      {acciones.map((accion) => (
        <Button
          key={accion.to}
          size="sm"
          variant={accion.to === 'RESOLVED' ? 'default' : 'outline'}
          disabled={cambiarEstado.isPending}
          onClick={() => transicionar(accion)}
        >
          {accion.label}
        </Button>
      ))}
    </div>
  );
}
