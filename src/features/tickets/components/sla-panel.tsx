import { Card } from '@/components/ui/primitives';
import { fechaAbsoluta } from '@/lib/format/relative-time';
import { cn } from '@/lib/utils';
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
 *
 * Por el mismo motivo **no hay barra de progreso**, que sería lo obvio para un
 * reloj: dibujar cuánto se consumió exige saber cuándo arrancó, y eso el DTO no
 * lo trae. Deducirlo de `dueAt - createdAt` funcionaría solo mientras ningún
 * reloj se pause, y una barra que miente es peor que ninguna barra. El estado se
 * codifica en el color del filo, que sí se lee de un vistazo y no inventa nada.
 */
export function SlaPanel({ sla }: { sla: TicketSla[] }) {
  if (sla.length === 0) {
    // Ni se inventa un "cumple" ni se esconde: los tickets anteriores a la fase
    // 6, y los que el worker aún no procesó, no tienen relojes que enseñar.
    return (
      <Card className="p-3 text-xs text-muted-foreground">
        Este ticket no tiene relojes de SLA.
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-border">
      {sla.map((reloj) => (
        <div key={reloj.kind} className="flex items-start gap-2.5 p-3">
          <span
            aria-hidden
            className={cn(
              'mt-0.5 h-8 w-0.5 shrink-0 rounded-full',
              COLOR_FILO[situacion(reloj)],
            )}
          />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-medium">{NOMBRE[reloj.kind]}</p>
            <p
              className={cn('text-xs font-medium', COLOR_TEXTO[situacion(reloj)])}
            >
              <SlaEstado reloj={reloj} />
            </p>
            <p className="text-xs text-muted-foreground" suppressHydrationWarning>
              vence {fechaAbsoluta(reloj.dueAt)}
            </p>
          </div>
        </div>
      ))}
    </Card>
  );
}

type Situacion = 'incumplido' | 'cumplido' | 'vencido' | 'en-marcha';

const COLOR_FILO: Record<Situacion, string> = {
  incumplido: 'bg-destructive',
  cumplido: 'bg-success-foreground',
  vencido: 'bg-warning-foreground',
  'en-marcha': 'bg-primary',
};

const COLOR_TEXTO: Record<Situacion, string> = {
  incumplido: 'text-destructive',
  cumplido: 'text-success-foreground',
  vencido: 'text-warning-foreground',
  'en-marcha': 'text-foreground',
};

function situacion(reloj: TicketSla): Situacion {
  if (reloj.status === 'breached') return 'incumplido';
  if (reloj.status === 'met') return 'cumplido';
  // En marcha y ya pasado de hora: el barrido puede no haber pasado todavía.
  if (reloj.remainingMinutes < 0) return 'vencido';
  return 'en-marcha';
}

function SlaEstado({ reloj }: { reloj: TicketSla }) {
  if (reloj.status === 'breached') {
    return <>Incumplido por {margen(-reloj.remainingMinutes)}</>;
  }
  if (reloj.status === 'met') {
    return <>Cumplido, {margen(reloj.remainingMinutes)} antes</>;
  }
  // No se dice que va bien, pero tampoco se marca como incumplido antes de que
  // el backend lo registre.
  if (reloj.remainingMinutes < 0) {
    return <>Vencido, sin registrar</>;
  }
  return <>Quedan {margen(reloj.remainingMinutes)}</>;
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
