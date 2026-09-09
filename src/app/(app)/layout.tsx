'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';
import { useLogout, useSession } from '@/features/auth/session';
import { useWs } from '@/providers/ws-provider';
import { cn } from '@/lib/utils';

/**
 * Layout del área autenticada, con la guarda de acceso.
 *
 * **La guarda es de cliente, no un middleware de Next**, y es una consecuencia
 * directa del diseño del backend: el access token vive en memoria y el refresh
 * está en una cookie httpOnly con `Path=/auth`, que el navegador no manda a las
 * rutas del front. Un middleware corriendo en el servidor de Next no tiene con
 * qué decidir si hay sesión, así que fingir una guarda ahí daría una falsa
 * sensación de seguridad. La de verdad la aplica la API en cada petición: esto
 * es solo para no enseñar pantallas vacías.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { status, user } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'anonymous') router.replace('/login');
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">
          {status === 'loading' ? 'Recuperando sesión…' : 'Redirigiendo…'}
        </p>
      </main>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopBar role={user?.role ?? 'VIEWER'} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}

function TopBar({ role }: { role: string }) {
  const pathname = usePathname();
  const logout = useLogout();
  const { connected } = useWs();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-6 py-3">
        <span className="font-semibold tracking-tight">Helpdesk</span>

        <nav className="flex items-center gap-1">
          <NavLink href="/tickets" active={pathname.startsWith('/tickets')}>
            Tickets
          </NavLink>
          {role === 'ADMIN' ? (
            <NavLink
              href="/settings/sla"
              active={pathname.startsWith('/settings')}
            >
              SLA
            </NavLink>
          ) : null}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* Que el tiempo real esté vivo o no cambia lo que el usuario puede
              esperar de la pantalla, así que se dice en vez de ocultarse. */}
          <span
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
            title={
              connected
                ? 'Actualizaciones en vivo'
                : 'Sin conexión en vivo: los datos pueden tardar en refrescarse'
            }
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                connected ? 'bg-emerald-500' : 'bg-muted-foreground/40',
              )}
            />
            {connected ? 'En vivo' : 'Sin conexión'}
          </span>
          <Badge tone="info">{role}</Badge>
          <Button variant="ghost" size="sm" onClick={() => void logout()}>
            Salir
          </Button>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-lg px-2.5 py-1.5 text-sm transition-colors',
        active
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </Link>
  );
}
