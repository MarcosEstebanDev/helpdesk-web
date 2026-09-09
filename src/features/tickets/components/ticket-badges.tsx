import { Badge } from '@/components/ui/primitives';
import type { TicketPriority, TicketStatus } from '@/lib/api/types';

const ESTADO_TONO = {
  OPEN: 'info',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  CLOSED: 'neutral',
} as const;

const ESTADO_TEXTO: Record<TicketStatus, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En curso',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge tone={ESTADO_TONO[status]}>{ESTADO_TEXTO[status]}</Badge>;
}

const PRIORIDAD_TONO = {
  LOW: 'neutral',
  NORMAL: 'neutral',
  HIGH: 'warning',
  URGENT: 'danger',
} as const;

const PRIORIDAD_TEXTO: Record<TicketPriority, string> = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  // `LOW` y `NORMAL` comparten tono a propósito: si todo lleva color, el color
  // deja de significar nada y `URGENT` no destaca, que es justo lo único que
  // esta insignia tiene que conseguir.
  return (
    <Badge tone={PRIORIDAD_TONO[priority]}>{PRIORIDAD_TEXTO[priority]}</Badge>
  );
}

/** Fecha corta y legible; el valor exacto va en el `title`. */
export function FechaRelativa({ iso }: { iso: string }) {
  const fecha = new Date(iso);
  return (
    <time dateTime={iso} title={fecha.toLocaleString()}>
      {fecha.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </time>
  );
}
