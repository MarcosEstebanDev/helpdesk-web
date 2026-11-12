'use client';

import { Bookmark, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useViews } from '@/features/views/queries';
import { cn } from '@/lib/utils';

/**
 * Vistas guardadas en la barra lateral, debajo de "Tickets" (ADR-0033 del
 * backend). Compartidas primero, con otro icono. Sin contador (decisión 13).
 * Solo la monta el equipo: a un VIEWER el backend le respondería 403.
 *
 * Usa `useSearchParams`: quien la monte tiene que envolverla en `Suspense`
 * (Next lo exige para poder prerenderizar el resto de la página).
 */
export function VistasEnNav({ onNavegar }: { onNavegar: () => void }) {
  const { data } = useViews(true);
  const pathname = usePathname();
  const vistaActual = useSearchParams().get('vista');
  const vistas = data?.items ?? [];

  if (vistas.length === 0) return null;

  return (
    <ul className="mt-0.5 ml-4 flex flex-col gap-0.5 border-l border-border pl-2">
      {vistas.map((vista) => {
        const activa = pathname === '/tickets' && vistaActual === vista.id;
        const Icono = vista.shared ? Users : Bookmark;
        return (
          <li key={vista.id}>
            <Link
              href={`/tickets?vista=${vista.id}`}
              aria-current={activa ? 'page' : undefined}
              aria-label={`${vista.name}${vista.shared ? ' (compartida)' : ''}`}
              onClick={onNavegar}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors',
                activa
                  ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-shell-hover',
              )}
            >
              <Icono className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{vista.name}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
