import type { TicketPriority } from '@/lib/api/types';

/**
 * Textos de la sugerencia de la IA, compartidos por la tarjeta del detalle, el
 * aviso en vivo y la bandeja.
 *
 * Lo que no esté en un mapa se muestra CRUDO (`etiqueta`). El contrato con el
 * backend se mantiene a mano: una categoría nueva tiene que verse, fea pero
 * cierta, en vez de desaparecer o quedar disfrazada de "Otro".
 */

export const CATEGORIA_IA: Record<string, string> = {
  account_access: 'Acceso a la cuenta',
  billing: 'Facturación',
  bug: 'Error del producto',
  how_to: 'Consulta de uso',
  feature_request: 'Pedido de función',
  other: 'Otro',
};

/** Versión corta, para la fila de la bandeja donde no hay sitio. */
export const CATEGORIA_IA_CORTA: Record<string, string> = {
  account_access: 'Acceso',
  billing: 'Facturación',
  bug: 'Error',
  how_to: 'Uso',
  feature_request: 'Pedido',
  other: 'Otro',
};

export const TONO_IA: Record<string, string> = {
  negative: 'Negativo',
  neutral: 'Neutral',
  positive: 'Positivo',
};

export const IDIOMA_IA: Record<string, string> = {
  es: 'Español',
  en: 'Inglés',
  pt: 'Portugués',
  other: 'Otro idioma',
};

export const PRIORIDAD_IA: Record<TicketPriority, string> = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

export function etiqueta(mapa: Record<string, string>, valor: string): string {
  return mapa[valor] ?? valor;
}

const ORDEN: Record<string, number> = { LOW: 0, NORMAL: 1, HIGH: 2, URGENT: 3 };

/**
 * Hacia dónde mueve la IA la prioridad: `sube`, `baja` o `igual`. Con valores
 * desconocidos devuelve `igual`: ante la duda, no se señala nada.
 */
export function direccion(
  actual: string,
  sugerida: string,
): 'sube' | 'baja' | 'igual' {
  const a = ORDEN[actual];
  const s = ORDEN[sugerida];
  if (a === undefined || s === undefined || a === s) return 'igual';
  return s > a ? 'sube' : 'baja';
}
