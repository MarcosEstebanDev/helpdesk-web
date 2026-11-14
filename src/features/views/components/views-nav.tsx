'use client';

import { Bookmark, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useViews } from '@/features/views/queries';
import { cn } from '@/lib/utils';
import type { SavedView } from '@/lib/api/types';

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

  // Dos grupos (UX 2026-11-13): las compartidas son "cómo trabaja el equipo",
  // las propias son atajos personales. Un grupo vacío no se pinta.
  const grupos = [
    { titulo: 'Vistas del equipo', items: vistas.filter((v) => v.shared) },
    { titulo: 'Mis vistas', items: vistas.filter((v) => !v.shared) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="mt-1 ml-4 flex flex-col gap-2 border-l border-border pl-2">
      {grupos.map((grupo) => (
        <div key={grupo.titulo}>
          <p
            aria-hidden
            className="px-2 pb-0.5 text-[11px] font-medium text-muted-foreground"
          >
            {grupo.titulo}
          </p>
          <ul aria-label={grupo.titulo} className="flex flex-col gap-0.5">
            <Enlaces
              vistas={grupo.items}
              pathname={pathname}
              vistaActual={vistaActual}
              onNavegar={onNavegar}
            />
          </ul>
        </div>
      ))}
    </div>
  );
}

function Enlaces({
  vistas,
  pathname,
  vistaActual,
  onNavegar,
}: {
  vistas: SavedView[];
  pathname: string;
  vistaActual: string | null;
  onNavegar: () => void;
}) {
  return (
    <>
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
    </>
  );
}
