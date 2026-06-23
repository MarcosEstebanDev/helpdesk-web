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
  setUser: (user: AuthUser | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
