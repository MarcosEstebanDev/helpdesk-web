'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/features/auth/session';

/**
 * Raíz: manda a la bandeja o al login según haya sesión.
 *
 * Es un componente de cliente porque la decisión depende de si el refresh token
 * sigue valiendo, y eso solo se sabe después de intentar canjearlo (ver
 * `SessionProvider`). Un `redirect()` de servidor no tendría con qué decidir.
 *
 * No pinta nada mientras decide: es una redirección de milisegundos, y un
 * "Cargando…" que aparece y desaparece se lee como un parpadeo. El estado sí se
 * anuncia, para quien navega con lector de pantalla.
 */
export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/tickets');
    if (status === 'anonymous') router.replace('/login');
  }, [status, router]);

  return (
    <main className="flex flex-1 items-center justify-center">
      <span className="sr-only" role="status">
        Abriendo el helpdesk
      </span>
    </main>
  );
}
