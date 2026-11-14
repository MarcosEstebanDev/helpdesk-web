/**
 * Fechas del horario laboral, siempre en la zona de la ORGANIZACIÓN cuando se
 * conoce: "abrimos a las 8:00" es la hora de la oficina, no la del navegador
 * de un cliente que puede estar en otro país.
 */

interface Partes {
  fecha: string; // YYYY-MM-DD local
  diaLargo: string;
  diaCorto: string;
  ddmm: string;
  hora: string; // H:MM
}

const partes = (instante: Date, timeZone: string | undefined): Partes => {
  const p: Record<string, string> = {};
  for (const x of new Intl.DateTimeFormat('es-AR', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instante)) {
    p[x.type] = x.value;
  }
  const diaLargo = p.weekday.toLowerCase();
  return {
    fecha: `${p.year}-${p.month}-${p.day}`,
    diaLargo,
    diaCorto: diaLargo.slice(0, 3),
    ddmm: `${p.day}/${p.month}`,
    hora: `${Number(p.hour)}:${p.minute}`,
  };
};

const sumarUnDia = (fecha: string): string => {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};

/**
 * El aviso al cliente que escribe fuera de horario (ADR-0034): cuándo lo van a
 * ver, con "hoy" y "mañana" cuando corresponde.
 */
export function textoProximaApertura(
  nextOpening: string,
  timeZone: string,
  ahora: Date,
): string {
  const abre = partes(new Date(nextOpening), timeZone);
  const hoy = partes(ahora, timeZone).fecha;
  const cuando =
    abre.fecha === hoy
      ? 'de hoy'
      : abre.fecha === sumarUnDia(hoy)
        ? 'de mañana'
        : `del ${abre.diaLargo} ${abre.ddmm}`;
  return `Estamos fuera de horario. Lo vamos a ver a partir ${cuando} a las ${abre.hora}.`;
}

/**
 * Un vencimiento lejano como fecha ("vence lun 16/11 11:00"). Con fines de
 * semana y horario laboral de por medio, "vence en 2 d" engaña: dos días de
 * reloj pueden ser el martes o el jueves. Sin zona, la del navegador.
 */
export function vencimientoLegible(
  dueAt: string,
  timeZone: string | undefined,
): string {
  const p = partes(new Date(dueAt), timeZone);
  return `vence ${p.diaCorto} ${p.ddmm} ${p.hora.padStart(5, '0')}`;
}
