'use client';

import { useEffect } from 'react';
import './globals.css';

/**
 * El último recurso: el layout raíz mismo falló.
 *
 * Reemplaza al documento entero, así que tiene que traer sus propios `<html>` y
 * `<body>` y su propio `import` de los estilos — es una entrada aparte, no
 * hereda nada del layout que acaba de caerse.
 *
 * Dos consecuencias de eso, y las dos son a propósito:
 *
 * - **Sale siempre en tema claro.** El script que aplica el tema antes de la
 *   primera pintura vive en el layout raíz, que es justo lo que no llegó a
 *   ejecutarse. Se ven los tokens de `:root`.
 * - **Se navega con `<a>` y no con `next/link`.** Si el árbol de React de la
 *   aplicación no se montó, el router tampoco: una navegación de cliente no
 *   tendría a dónde agarrarse. Una recarga completa siempre funciona.
 *
 * En `pnpm dev` esta pantalla no se ve nunca: el overlay de errores de Next la
 * tapa. Para comprobarla hace falta un build de producción.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="flex min-h-screen items-center justify-center bg-background p-6 font-sans text-foreground">
        <div className="max-w-md text-center">
          <h1 className="text-base font-semibold tracking-tight">
            La aplicación no pudo arrancar
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            Recargá la página. Si el problema sigue, volvé a intentarlo en unos
            minutos.
          </p>

          {error.digest ? (
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              Referencia: {error.digest}
            </p>
          ) : null}

          {/*
            La regla de Next pide `next/link` para navegar dentro del sitio, y
            tiene razón en cualquier otro archivo. Acá NO: este componente se
            monta cuando el layout raíz falló, así que el router puede no
            existir. Una recarga completa es la única navegación que se puede
            garantizar.
          */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="mt-5 inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            Recargar
          </a>
        </div>
      </body>
    </html>
  );
}
