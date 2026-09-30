'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Diálogo modal.
 *
 * Existe para el alta de tickets: el formulario desplegable empujaba la lista
 * hacia abajo, y en una bandeja que además se reordena sola por WebSocket eso
 * significaba escribir mientras el contenido se movía debajo del cursor. Base UI
 * se encarga de lo que un `<div>` con `position: fixed` no hace — atrapar el
 * foco, cerrar con Escape y devolver el foco al botón que lo abrió.
 */
export function Dialog({
  abierto,
  onAbiertoChange,
  titulo,
  descripcion,
  children,
}: {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={abierto} onOpenChange={onAbiertoChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            'fixed inset-0 z-40 bg-foreground/30',
            'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
            'transition-opacity duration-150',
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            'fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2',
            'max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-xl',
            'data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0',
            'data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0',
            'transition-[opacity,transform] duration-150',
          )}
        >
          <div className="mb-4 flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-base font-semibold tracking-tight">
                {titulo}
              </DialogPrimitive.Title>
              {descripcion ? (
                <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  {descripcion}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Cerrar" />
              }
            >
              <X />
            </DialogPrimitive.Close>
          </div>

          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
