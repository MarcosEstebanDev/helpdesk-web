import { ChevronDown, ChevronUp, ChevronsUp, Equal } from 'lucide-react';
import { Lozenge } from '@/components/ui/primitives';
import { Tooltip } from '@/components/ui/tooltip';
import { fechaAbsoluta, tiempoRelativo } from '@/lib/format/relative-time';
import { cn } from '@/lib/utils';
import type { TicketPriority, TicketStatus } from '@/lib/api/types';

const ESTADO_TONO = {
  OPEN: 'info',
  IN_PROGRESS: 'progress',
  RESOLVED: 'success',
  CLOSED: 'closed',
} as const;

const ESTADO_TEXTO: Record<TicketStatus, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En curso',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Lozenge tone={ESTADO_TONO[status]}>{ESTADO_TEXTO[status]}</Lozenge>;
}

const PRIORIDAD_ICONO = {
  URGENT: ChevronsUp,
  HIGH: ChevronUp,
  NORMAL: Equal,
  LOW: ChevronDown,
} as const;

// `LOW` y `NORMAL` van sin color a propósito: si todo lleva color, el color deja
// de significar nada y `URGENT` no destaca, que es justo lo único que esta
// marca tiene que conseguir.
const PRIORIDAD_COLOR = {
  URGENT: 'text-destructive',
  HIGH: 'text-warning-foreground',
  NORMAL: 'text-muted-foreground',
  LOW: 'text-muted-foreground',
} as const;

const PRIORIDAD_TEXTO: Record<TicketPriority, string> = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

/**
 * Prioridad como flecha, no como etiqueta.
 *
 * Es el patrón de Jira y responde a cómo se usa realmente una bandeja: se
 * recorre en vertical buscando lo que sobresale. Cuatro flechas alineadas se
 * comparan de un vistazo; cuatro palabras de distinto largo, no. El texto sigue
 * ahí para lectores de pantalla y en el tooltip.
 */
export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const Icono = PRIORIDAD_ICONO[priority];

  return (
    <Tooltip contenido={`Prioridad ${PRIORIDAD_TEXTO[priority].toLowerCase()}`}>
      <Icono
        className={cn('size-4', PRIORIDAD_COLOR[priority])}
        aria-label={`Prioridad ${PRIORIDAD_TEXTO[priority].toLowerCase()}`}
        role="img"
      />
    </Tooltip>
  );
}

/** Prioridad en texto, para donde hay sitio y hace falta nombrarla. */
export function PriorityLabel({ priority }: { priority: TicketPriority }) {
  const Icono = PRIORIDAD_ICONO[priority];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Icono className={cn('size-4', PRIORIDAD_COLOR[priority])} aria-hidden />
      {PRIORIDAD_TEXTO[priority]}
    </span>
  );
}

/**
 * Tiempo relativo, con la fecha exacta en el tooltip.
 *
 * `suppressHydrationWarning` es deliberado: el servidor renderiza con su reloj y
 * su zona horaria, el navegador con los suyos, así que el texto NO puede
 * coincidir. Es la discrepancia que React documenta como aceptable para fechas;
 * lo alternativo sería pintar vacío hasta montar, que es peor.
 */
export function FechaRelativa({ iso }: { iso: string }) {
  return (
    <Tooltip contenido={fechaAbsoluta(iso)}>
      <time dateTime={iso} suppressHydrationWarning>
        {tiempoRelativo(iso)}
      </time>
    </Tooltip>
  );
}
