import { create } from 'zustand';

/**
 * Estado de auth en el cliente (placeholder — Fase 2). Guarda SOLO datos no
 * sensibles para la UX: el usuario actual y su rol por tenant, para gating de
 * UI. El access token vive en memoria/cookie httpOnly, nunca en un store
 * persistido. El backend SIEMPRE re-valida permisos; esto es puro UX.
 */
export type Role = 'ADMIN' | 'AGENT' | 'VIEWER';

export type AuthUser = {
  id: string;
  email: string;
  tenantId: string;
  role: Role;
};

type AuthState = {
  user: AuthUser | null;
  /**
   * Access token, SOLO en memoria.
   *
   * No se persiste ni en `localStorage` ni en una cookie legible por JS: un XSS
   * podría leerlo de ahí. Que se pierda al recargar la página es correcto y
   * esperado — el refresh token vive en su cookie httpOnly y permite recuperar
   * la sesión sin volver a pedir la contraseña.
   */
  accessToken: string | null;
  setUser: (user: AuthUser | null) => void;
  setAccessToken: (accessToken: string | null) => void;
  /** Cierra la sesión en el cliente. El backend revoca aparte. */
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clear: () => set({ user: null, accessToken: null }),
}));
