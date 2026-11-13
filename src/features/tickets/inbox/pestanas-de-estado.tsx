'use client';

import { cn } from '@/lib/utils';
import type { TicketCounts } from '@/lib/api/types';
import { conteoDePestana, pestanasPara, type EstadoDePestana } from './pestanas';

/**
 * Pestañas de estado con su número (UX 2026-11-13). El número sale de
 * `GET /tickets/counts` con los MISMOS filtros que el listado, así que es lo
 * que se ve al elegir la pestaña. Mientras no llega, no se pinta: un cero
 * provisorio diría "no hay nada" cuando no se sabe.
 */
export function PestanasDeEstado({
  actual,
  counts,
  onChange,
}: {
  actual: EstadoDePestana;
  counts: TicketCounts | undefined;
  onChange: (estado: EstadoDePestana) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Estado"
      className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0"
    >
      {pestanasPara(actual).map((p) => {
        const elegida = p.estado === actual;
        const n = conteoDePestana(counts, p.estado);
        return (
          <button
            key={p.estado || 'todos'}
            type="button"
            role="tab"
            aria-selected={elegida}
            onClick={() => onChange(p.estado)}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors',
              elegida
                ? 'border-primary font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {p.texto}
            {n !== undefined ? (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs tabular-nums',
                  elegida ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {n}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
