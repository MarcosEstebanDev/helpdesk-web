'use client';

import { Toast } from '@base-ui/react/toast';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Avisos de resultado, al estilo de los *flags* de Atlassian.
 *
 * Existen porque hasta ahora **el éxito no decía nada**: cambiar el estado de
 * un ticket o asignárselo respondía 200 y la pantalla se limitaba a mutar. En
 * una interfaz que además se mueve sola por WebSocket, no distinguir "esto lo
 * hice yo" de "esto lo hizo otro" es exactamente la duda que hay que evitar.
 *
 * El error va con `priority: 'high'` (se anuncia con urgencia a un lector de
 * pantalla) y sin cierre automático: un fallo que se desvanece solo es un fallo
 * que el usuario no llega a leer.
 */

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider>
      {children}
      <Toast.Portal>
        <Toast.Viewport
          className={cn(
            'fixed right-0 bottom-0 z-50 flex w-full max-w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 p-4',
            // En móvil ocupa el ancho completo abajo, donde está el pulgar.
            'max-sm:max-w-full',
          )}
        >
          <ListaDeAvisos />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function ListaDeAvisos() {
  const { toasts } = Toast.useToastManager();

  return toasts.map((aviso) => (
    <Toast.Root
      key={aviso.id}
      toast={aviso}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border border-border bg-popover p-3 shadow-lg',
        'data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0',
        'data-[ending-style]:translate-y-2 data-[ending-style]:opacity-0',
        'transition-[opacity,transform] duration-150',
      )}
    >
      {aviso.type === 'error' ? (
        <XCircle className="mt-px size-4 shrink-0 text-destructive" aria-hidden />
      ) : (
        <CheckCircle2
          className="mt-px size-4 shrink-0 text-success-foreground"
          aria-hidden
        />
      )}

      <div className="min-w-0 flex-1">
        <Toast.Title className="text-sm font-semibold text-popover-foreground" />
        <Toast.Description className="mt-0.5 text-xs text-muted-foreground" />
      </div>

      <Toast.Close
        aria-label="Cerrar aviso"
        className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-3.5" aria-hidden />
      </Toast.Close>
    </Toast.Root>
  ));
}

/** Envoltorio fino sobre el gestor de Base UI, con el vocabulario de la app. */
export function useAvisos() {
  const { add } = Toast.useToastManager();

  return {
    exito: (titulo: string, detalle?: string) =>
      add({ title: titulo, description: detalle, type: 'success' }),
    error: (titulo: string, detalle?: string) =>
      add({
        title: titulo,
        description: detalle,
        type: 'error',
        priority: 'high',
        timeout: 0,
      }),
  };
}
