import type { TicketCounts, TicketStatus } from '@/lib/api/types';

export type EstadoDePestana = TicketStatus | '';

export interface Pestana {
  estado: EstadoDePestana;
  texto: string;
}

/** Los estados donde hay trabajo, en el orden en que un ticket los recorre. */
const BASE: Pestana[] = [
  { estado: 'OPEN', texto: 'Abiertos' },
  { estado: 'IN_PROGRESS', texto: 'En curso' },
  { estado: 'WAITING_ON_CUSTOMER', texto: 'Esperando al cliente' },
  { estado: 'RESOLVED', texto: 'Resueltos' },
];

const TODOS: Pestana = { estado: '', texto: 'Todos' };
const CERRADOS: Pestana = { estado: 'CLOSED', texto: 'Cerrados' };

/**
 * Pestañas de la bandeja. Cerrados no tiene pestaña propia (no es trabajo, y
 * "Todos" ya los incluye), salvo que el estado actual SEA cerrado —una vista
 * guardada puede filtrar por él—: sin pestaña, la bandeja mostraría cerrados
 * sin que ninguna pestaña dijera por qué.
 */
export function pestanasPara(actual: EstadoDePestana): Pestana[] {
  return actual === 'CLOSED' ? [...BASE, CERRADOS, TODOS] : [...BASE, TODOS];
}

/**
 * El número de una pestaña. "Todos" es la suma de los cinco estados porque
 * lista también los cerrados: el número tiene que ser lo que se ve al elegirla.
 * Sin conteos (cargando o con error) devuelve `undefined`: un cero sería mentir.
 */
export function conteoDePestana(
  counts: TicketCounts | undefined,
  estado: EstadoDePestana,
): number | undefined {
  if (counts === undefined) return undefined;
  if (estado !== '') return counts[estado];
  return Object.values(counts).reduce((a, b) => a + b, 0);
}
