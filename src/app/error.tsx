'use client';

import { RotateCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/primitives';

/**
 * Límite de error de todo lo que cuelga del layout raíz.
 *
 * Es el que cubre el hueco que `(app)/error.tsx` no puede cubrir: los fallos del
 * PROPIO `(app)/layout.tsx` — la guarda de sesión, el `WsProvider` — porque un
 * `error.tsx` no atrapa los errores del layout de su segmento, los sube al
 * padre. También cubre `/` y `/login`.
 *
 * De ahí la regla que rige este archivo: **no puede depender de `useSession`**.
 * El error puede venir justamente de ahí, y un límite de error que se apoya en
 * lo que acaba de romperse falla dos veces.
 *
 * Por el mismo motivo la salida es `/` y no `/tickets`: la raíz ya decide a
 * dónde mandar según haya sesión o no, así que la misma salida sirve para quien
 * está dentro y para quien no.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-6 text-center">
        <h1 className="text-base font-semibold tracking-tight">
          Algo se rompió al cargar la aplicación
        </h1>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          No es algo que hayas hecho vos. Reintentá; si vuelve a pasar, cerrá la
          pestaña y volvé a entrar.
        </p>

        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Referencia: {error.digest}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button
            onClick={() => {
              router.refresh();
              reset();
            }}
          >
            <RotateCw />
            Reintentar
          </Button>
          <Button variant="ghost" render={<Link href="/" />}>
            Ir al inicio
          </Button>
        </div>
      </Card>
    </main>
  );
}
