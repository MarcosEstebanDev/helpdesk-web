import type { SlaSummary } from '@/lib/api/types';

export type TonoSla = 'neutro' | 'aviso' | 'peligro';

/** Faltando menos que esto, el SLA de una fila se pinta en ámbar. */
const UMBRAL_AVISO_MS = 2 * 60 * 60 * 1000;

const duracion = (ms: number): string => {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.round(h / 24)} d`;
};

/**
 * Cómo se lee el SLA de una fila (UX 2026-11-13). Color solo si pide
 * atención: ámbar si vence en menos de 2 h, rojo si ya venció.
 */
export const describirSla = (
  sla: SlaSummary | undefined,
  ahora: Date,
): { texto: string; tono: TonoSla } => {
  if (sla === undefined || sla.state === 'none') return { texto: '—', tono: 'neutro' };
  if (sla.state === 'paused') return { texto: 'en pausa', tono: 'neutro' };
  if (sla.state === 'breached') {
    return {
      texto: `vencido hace ${duracion(ahora.getTime() - new Date(sla.since).getTime())}`,
      tono: 'peligro',
    };
  }
  const falta = new Date(sla.dueAt).getTime() - ahora.getTime();
  // Venció después del último fetch y el barrido aún no lo marcó: es vencido
  // igual. Sin esto la fila decía "vence en 1 min" hasta el próximo refresco.
  if (falta <= 0) {
    return { texto: `vencido hace ${duracion(-falta)}`, tono: 'peligro' };
  }
  return {
    texto: `vence en ${duracion(falta)}`,
    tono: falta < UMBRAL_AVISO_MS ? 'aviso' : 'neutro',
  };
};

/** Dos letras para el círculo del asignado o del cliente, a partir del email. */
export const iniciales = (email: string): string => {
  const local = email.split('@')[0] ?? '';
  const partes = local.split(/[._-]+/).filter((p) => p.length > 0);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
};
