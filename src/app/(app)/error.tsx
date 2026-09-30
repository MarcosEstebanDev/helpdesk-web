'use client';

import { RotateCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/primitives';

/**
 * Límite de error de las pantallas autenticadas.
 *
 * Dos cosas del App Router que explican por qué este archivo no alcanza solo y
 * hay otros dos límites más arriba (`app/error.tsx` y `app/global-error.tsx`):
 *
 * 1. **Un `error.tsx` NO atrapa los errores del `layout.tsx` de su propio
 *    segmento**: los sube al padre. La guarda de sesión y el `WsProvider` viven
 *    en `(app)/layout.tsx`, así que si revienta alguno de esos, este límite no
 *    se entera nunca.
 * 2. Este límite **se renderiza como hijo de esa guarda**. Mientras
 *    `status !== 'authenticated'`, el layout pinta el esqueleto y ni siquiera
 *    llega a renderizar `children`. O sea: si el error ocurre antes de que la
 *    sesión se recupere, lo que se ve es el esqueleto y después el login — que
 *    es el comportamiento correcto, pero no pasa por acá.
 *
 * Lo que sí cubre esto es el caso frecuente: una pantalla que falla al dibujarse
 * con la sesión ya en pie. Y lo cubre dejando el marco vivo, así que el usuario
 * conserva la navegación en vez de quedarse en un callejón.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  // Efecto de log, sin `setState`: la regla `react-hooks/set-state-in-effect`
  // de este repo es un error, no un aviso.
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-lg p-6">
      <h1 className="text-base font-semibold tracking-tight">
        Esta pantalla no se pudo dibujar
      </h1>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
        El resto de la aplicación sigue funcionando. Podés reintentar o volver a
        la bandeja.
      </p>

      {/*
        No se pinta `error.message`: en producción Next lo redacta y deja solo el
        `digest`. Inventar un mensaje concreto sería justo lo que este repo no
        hace, y el digest es lo único que cruza con los logs del servidor.
      */}
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          Referencia: {error.digest}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {/*
          `reset()` solo limpia el estado del límite: si el fallo venía de datos
          ya cacheados, se vuelve a romper igual. Por eso se refresca primero.
          Next expone un `unstable_retry` que hace exactamente esto, pero no vale
          la pena atar el repo a una API marcada como inestable para ahorrar una
          línea.
        */}
        <Button
          onClick={() => {
            router.refresh();
            reset();
          }}
        >
          <RotateCw />
          Reintentar
        </Button>
        <Button variant="ghost" render={<Link href="/tickets" />}>
          Volver a la bandeja
        </Button>
      </div>
    </Card>
  );
}
