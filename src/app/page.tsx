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
      <p className="text-sm text-muted-foreground">Cargando…</p>
    </main>
  );
}
