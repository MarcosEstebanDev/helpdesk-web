import { Badge, Card } from '@/components/ui/primitives';
import type { TicketSla } from '@/lib/api/types';

const NOMBRE = {
  RESPONSE: 'Primera respuesta',
  RESOLUTION: 'Resolución',
} as const;

/**
 * Estado de los relojes de SLA del ticket (ADR-0020 del backend).
 *
 * El detalle que hay que respetar: **un reloj parado no se recalcula**. El
 * backend ya manda `remainingMinutes` medido contra la hora de parada, así que
 * aquí solo se pinta. Calcularlo en el cliente contra `Date.now()` haría que el
 * margen de un ticket resuelto la semana pasada empeorase cada vez que alguien
 * abre la pantalla.
 */
export function SlaPanel({ sla }: { sla: TicketSla[] }) {
  if (sla.length === 0) {
    // Ni se inventa un "cumple" ni se esconde: los tickets anteriores a la fase
    // 6, y los que el worker aún no procesó, no tienen relojes que enseñar.
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Este ticket no tiene relojes de SLA.
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-border">
      {sla.map((reloj) => (
        <div key={reloj.kind} className="flex items-center gap-3 px-4 py-3">
          <span className="flex-1 text-sm">{NOMBRE[reloj.kind]}</span>
          <span className="text-xs text-muted-foreground">
            vence {new Date(reloj.dueAt).toLocaleString()}
          </span>
          <SlaEstado reloj={reloj} />
        </div>
      ))}
    </Card>
  );
}

function SlaEstado({ reloj }: { reloj: TicketSla }) {
  if (reloj.status === 'breached') {
    return (
      <Badge tone="danger">Incumplido por {margen(-reloj.remainingMinutes)}</Badge>
    );
  }
  if (reloj.status === 'met') {
    return <Badge tone="success">Cumplido, {margen(reloj.remainingMinutes)} antes</Badge>;
  }
  // En marcha y ya pasado de hora: el barrido puede no haber pasado todavía. No
  // se dice que va bien, pero tampoco se marca como incumplido antes de que el
  // backend lo registre.
  if (reloj.remainingMinutes < 0) {
    return <Badge tone="warning">Vencido, sin registrar</Badge>;
  }
  return <Badge tone="info">Quedan {margen(reloj.remainingMinutes)}</Badge>;
}

/** Minutos a algo legible: 90 -> "1 h 30 min". */
function margen(minutos: number): string {
  const total = Math.abs(minutos);
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  if (horas === 0) return `${resto} min`;
  if (resto === 0) return `${horas} h`;
  return `${horas} h ${resto} min`;
}
