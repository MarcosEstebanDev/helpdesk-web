'use client';

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Tooltip para el dato exacto detrás de uno aproximado: la fecha completa
 * debajo de "hace 2 h", el porqué debajo de "Sin conexión".
 *
 * Reemplaza a los `title=""` nativos, que tardan un segundo largo en aparecer,
 * no se pueden alcanzar con el teclado y no se pueden leer en un móvil.
 */
export function Tooltip({
  contenido,
  children,
  className,
}: {
  contenido: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger
        render={<span className={cn('inline-flex', className)} />}
      >
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner sideOffset={6}>
          <TooltipPrimitive.Popup
            className={cn(
              'z-50 max-w-64 rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md',
              'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
              'transition-opacity duration-100',
            )}
          >
            {contenido}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/**
 * Provider de tooltips para toda la aplicación.
 *
 * Se exporta como componente propio y NO se reexporta el namespace
 * `TooltipPrimitive`. `providers/index.tsx` es un componente de SERVIDOR, y por
 * la frontera servidor/cliente solo pueden cruzar componentes con nombre: un
 * namespace se convierte en una referencia de cliente opaca, y leerle `.Provider`
 * devuelve `undefined`. Eso rompe la aplicación entera con un "Element type is
 * invalid" que no dice dónde.
 */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delay={250}>{children}</TooltipPrimitive.Provider>
  );
}
