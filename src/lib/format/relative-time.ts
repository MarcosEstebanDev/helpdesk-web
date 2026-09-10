/**
 * Tiempos legibles para la interfaz.
 *
 * La regla es la de cualquier bandeja de trabajo: lo reciente se mide en
 * distancia ("hace 2 h", que es lo que a un agente le importa) y lo viejo se
 * mide en fecha ("18 ago"), porque "hace 23 d" no le dice nada a nadie.
 *
 * `ahora` se recibe como parámetro en vez de leer el reloj aquí adentro: así
 * esto es una función pura y se puede probar sin congelar el tiempo.
 */

const UN_MINUTO = 60_000;
const UNA_HORA = 60 * UN_MINUTO;
const UN_DIA = 24 * UNA_HORA;
const UNA_SEMANA = 7 * UN_DIA;

export function tiempoRelativo(iso: string, ahora: Date = new Date()): string {
  const fecha = new Date(iso);
  const delta = ahora.getTime() - fecha.getTime();

  // Delta negativo = el reloj del cliente va atrasado respecto del servidor.
  // Pintar "hace -3 min" sería peor que redondear a "ahora".
  if (delta < UN_MINUTO) return 'ahora';
  if (delta < UNA_HORA) return `hace ${Math.floor(delta / UN_MINUTO)} min`;
  if (delta < UN_DIA) return `hace ${Math.floor(delta / UNA_HORA)} h`;
  if (delta < UNA_SEMANA) return `hace ${Math.floor(delta / UN_DIA)} d`;

  const mismoAnio = fecha.getFullYear() === ahora.getFullYear();
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    ...(mismoAnio ? {} : { year: 'numeric' }),
  }).format(fecha);
}

/** Fecha y hora completas, para el tooltip de un tiempo relativo. */
export function fechaAbsoluta(iso: string): string {
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(iso));
}
