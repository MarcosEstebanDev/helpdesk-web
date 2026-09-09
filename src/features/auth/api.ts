import { apiFetch } from '@/lib/api/client';
import type { AuthResponse, MeResponse } from '@/lib/api/types';

export interface LoginInput {
  /** Identifica la organización. El backend no permite login sin ella. */
  organizationSlug: string;
  email: string;
  password: string;
}

export interface RegisterInput {
  organizationName: string;
  email: string;
  password: string;
}

/**
 * Login por organización (ADR-0011): el mismo email puede existir en varias
 * organizaciones, así que el slug forma parte de la identidad.
 *
 * El backend responde igual ante un email inexistente y una contraseña
 * incorrecta (anti-enumeración), así que aquí no hay forma —ni intención— de
 * distinguirlos en el mensaje.
 */
export function login(input: LoginInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Registro self-service: crea organización + usuario ADMIN y deja sesión abierta. */
export function register(input: RegisterInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function me(): Promise<MeResponse> {
  return apiFetch<MeResponse>('/auth/me');
}

/** Revoca la familia de refresh tokens en el backend. */
export function logout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST' });
}
