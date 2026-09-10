'use client';

import {
  Inbox,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Sun,
  Timer,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Lozenge, Skeleton } from '@/components/ui/primitives';
import { Tooltip } from '@/components/ui/tooltip';
import { useLogout, useSession } from '@/features/auth/session';
import { useTema } from '@/providers/theme-provider';
import { useWs } from '@/providers/ws-provider';
import { cn } from '@/lib/utils';
import type { Preferencia } from '@/lib/theme';

/**
 * Layout del área autenticada: barra superior fija, navegación lateral y la
 * guarda de acceso.
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
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    if (status === 'anonymous') router.replace('/login');
  }, [status, router]);

  // Mientras se canjea el refresh se pinta el esqueleto del marco, no un texto
  // centrado: la barra y la navegación van a estar ahí igual, y verlas aparecer
  // de golpe se siente más lento que verlas llegar ya completas.
  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <div className="h-12 border-b border-shell-border bg-shell" />
        <div className="flex flex-1">
          <div className="hidden w-60 border-r border-border bg-sidebar lg:block" />
          <main className="flex-1 p-6">
            <Skeleton className="h-7 w-40" />
            <span className="sr-only" role="status">
              {status === 'loading'
                ? 'Recuperando la sesión'
                : 'Redirigiendo al inicio de sesión'}
            </span>
          </main>
        </div>
      </div>
    );
  }

  const rol = user?.role ?? 'VIEWER';

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopBar rol={rol} onAbrirMenu={() => setMenuAbierto(true)} />

      <div className="flex flex-1">
        <NavLateral
          rol={rol}
          abierto={menuAbierto}
          onCerrar={() => setMenuAbierto(false)}
        />

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function TopBar({ rol, onAbrirMenu }: { rol: string; onAbrirMenu: () => void }) {
  const logout = useLogout();

  return (
    <header className="sticky top-0 z-30 border-b border-shell-border bg-shell text-shell-foreground">
      <div className="flex h-12 items-center gap-2 px-3 sm:px-4">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          aria-label="Abrir la navegación"
          onClick={onAbrirMenu}
        >
          <Menu />
        </Button>

        <Link
          href="/tickets"
          className="rounded-sm px-1 text-[15px] font-semibold tracking-tight"
        >
          Helpdesk
        </Link>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <EstadoConexion />
          <SelectorTema />
          <Lozenge tone="neutral" className="max-sm:hidden">
            {rol}
          </Lozenge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void logout()}
            className="max-sm:hidden"
          >
            Salir
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Salir"
            onClick={() => void logout()}
            className="sm:hidden"
          >
            <LogOut />
          </Button>
        </div>
      </div>
    </header>
  );
}

/**
 * Que el tiempo real esté vivo o no cambia lo que el usuario puede esperar de la
 * pantalla, así que se dice en vez de ocultarse. Va en `role="status"` para que
 * la caída también se anuncie a quien no está mirando el punto de color.
 */
function EstadoConexion() {
  const { connected } = useWs();

  return (
    <Tooltip
      contenido={
        connected
          ? 'Los cambios de otras personas aparecen solos.'
          : 'Sin conexión en vivo. Los datos pueden tardar en refrescarse.'
      }
    >
      <span
        role="status"
        className="flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-xs text-shell-muted"
      >
        <span
          className={cn(
            'size-1.5 rounded-full transition-colors',
            connected ? 'bg-success-foreground' : 'bg-muted-foreground/40',
          )}
        />
        <span className="max-sm:sr-only">
          {connected ? 'En vivo' : 'Sin conexión'}
        </span>
      </span>
    </Tooltip>
  );
}

const SIGUIENTE: Record<Preferencia, Preferencia> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

const TEMA_ICONO: Record<Preferencia, ComponentType<{ className?: string }>> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

const TEMA_NOMBRE: Record<Preferencia, string> = {
  system: 'del sistema',
  light: 'claro',
  dark: 'oscuro',
};

function SelectorTema() {
  const { preferencia, setPreferencia } = useTema();
  const Icono = TEMA_ICONO[preferencia];
  const siguiente = SIGUIENTE[preferencia];
  const etiqueta = `Tema ${TEMA_NOMBRE[preferencia]}. Cambiar al ${TEMA_NOMBRE[siguiente]}.`;

  return (
    <Tooltip contenido={etiqueta}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={etiqueta}
        onClick={() => setPreferencia(siguiente)}
      >
        <Icono />
      </Button>
    </Tooltip>
  );
}

interface Destino {
  href: string;
  etiqueta: string;
  icono: ComponentType<{ className?: string }>;
  soloAdmin?: boolean;
}

const DESTINOS: Destino[] = [
  { href: '/tickets', etiqueta: 'Tickets', icono: Inbox },
  { href: '/settings/sla', etiqueta: 'SLA', icono: Timer, soloAdmin: true },
];

function NavLateral({
  rol,
  abierto,
  onCerrar,
}: {
  rol: string;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const pathname = usePathname();
  const destinos = DESTINOS.filter((d) => !d.soloAdmin || rol === 'ADMIN');

  const enlaces = destinos.map((destino) => {
    // Se compara contra el primer segmento para que el detalle de un ticket
    // (`/tickets/abc`) deje "Tickets" marcado como sección actual.
    const seccion = `/${destino.href.split('/')[1]}`;
    const activo = pathname.startsWith(seccion);
    const Icono = destino.icono;

    return (
      <Link
        key={destino.href}
        href={destino.href}
        aria-current={activo ? 'page' : undefined}
        onClick={onCerrar}
        className={cn(
          'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
          activo
            ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:bg-shell-hover',
        )}
      >
        <Icono className="size-4" />
        {destino.etiqueta}
      </Link>
    );
  });

  return (
    <>
      <nav
        aria-label="Secciones"
        className="hidden w-60 shrink-0 border-r border-border bg-sidebar p-3 lg:block"
      >
        <div className="flex flex-col gap-0.5">{enlaces}</div>
      </nav>

      {/* En pantallas chicas la navegación se guarda en un panel. Se cierra al
          navegar (cada enlace llama a `onCerrar`) en vez de con un efecto sobre
          el pathname: la regla `react-hooks/set-state-in-effect` de este repo es
          un error, y además el evento real es el click, no el cambio de ruta. */}
      {abierto ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar la navegación"
            className="absolute inset-0 bg-foreground/30"
            onClick={onCerrar}
          />
          <nav
            aria-label="Secciones"
            className="absolute inset-y-0 left-0 w-64 border-r border-border bg-sidebar p-3"
          >
            <div className="mb-2 flex justify-end">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Cerrar la navegación"
                onClick={onCerrar}
              >
                <X />
              </Button>
            </div>
            <div className="flex flex-col gap-0.5">{enlaces}</div>
          </nav>
        </div>
      ) : null}
    </>
  );
}
