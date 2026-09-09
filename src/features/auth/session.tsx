'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import * as authApi from '@/features/auth/api';
import { refreshAccessToken } from '@/lib/api/refresh';
import { useAuthStore, type AuthUser } from '@/stores/auth-store';

type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

interface SessionValue {
  status: SessionStatus;
  user: AuthUser | null;
}

const SessionContext = createContext<SessionValue>({
  status: 'loading',
  user: null,
});

/**
 * Recupera la sesión al cargar la aplicación.
 *
 * El access token vive solo en memoria, así que **cada recarga de página empieza
 * sin él**. Lo que sí sobrevive es la cookie httpOnly del refresh, de modo que
 * el arranque consiste en canjearla: si funciona, había sesión; si no, el
 * usuario es anónimo. Es el precio deliberado de no guardar el token donde un
 * XSS pueda leerlo.
 *
 * De ahí el estado `loading`: hasta que ese canje termina no se sabe si hay
 * sesión, y pintar el login mientras tanto haría parpadear la pantalla a
 * cualquiera que recargue estando dentro.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  /** Si el canje inicial del refresh ya terminó (con o sin sesión). */
  const [arrancado, setArrancado] = useState(false);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    let vivo = true;

    void (async () => {
      const token = await refreshAccessToken();
      if (vivo && token !== null) {
        try {
          const perfil = await authApi.me();
          if (!vivo) return;
          setUser({
            id: perfil.userId,
            // El backend no expone el email en `/auth/me`; se rellena al hacer
            // login y queda vacío tras recuperar la sesión con el refresh.
            email: '',
            tenantId: perfil.tenantId,
            role: perfil.role,
          });
        } catch {
          if (vivo) useAuthStore.getState().clear();
        }
      }
      if (vivo) setArrancado(true);
    })();

    return () => {
      vivo = false;
    };
  }, [setUser]);

  // `status` se DERIVA del store en vez de mantenerse en paralelo con un
  // efecto. Con dos estados sincronizados a mano, cualquier cosa que limpiara
  // el store —un `unauthorized` del socket, un logout— dejaría a este provider
  // diciendo que sigue habiendo sesión hasta el siguiente render.
  const status: SessionStatus = !arrancado
    ? 'loading'
    : accessToken === null
      ? 'anonymous'
      : 'authenticated';

  return (
    <SessionContext.Provider value={{ status, user }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  return useContext(SessionContext);
}

/** Cierra sesión en el backend y en el cliente, y manda al login. */
export function useLogout(): () => Promise<void> {
  const router = useRouter();
  const queryClient = useQueryClient();

  return async () => {
    try {
      await authApi.logout();
    } finally {
      // Aunque el backend falle, la sesión local se limpia igual: dejar al
      // usuario "dentro" tras pedir salir es peor que un token sin revocar.
      useAuthStore.getState().clear();
      queryClient.clear();
      router.replace('/login');
    }
  };
}
