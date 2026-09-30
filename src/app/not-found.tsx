import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Dirección no encontrada' };

/**
 * 404, en la RAÍZ y no dentro de `(app)`.
 *
 * Es deliberado: las URL sin ruta usan siempre el `not-found` de la raíz, y uno
 * puesto detrás de la guarda de sesión mandaría al login a quien simplemente
 * escribió mal una dirección. Eso sería responder "no tenés acceso" a algo que
 * en realidad no existe — dos problemas distintos que no conviene confundir.
 *
 * Componente de servidor: no necesita hooks, y así hereda el layout raíz con su
 * tipografía y su tema sin sumar nada al bundle del cliente.
 */
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-6 text-center">
        <p className="font-mono text-xs text-muted-foreground">404</p>
        <h1 className="mt-1 text-base font-semibold tracking-tight">
          Esta dirección no existe
        </h1>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          Puede que el enlace esté mal escrito o que el ticket que buscabas se
          haya movido.
        </p>
        <div className="mt-5">
          <Button render={<Link href="/" />}>Ir al inicio</Button>
        </div>
      </Card>
    </main>
  );
}
