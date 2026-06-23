import { clientEnv } from '@/lib/env';

/**
 * Cliente HTTP tipado mínimo. Centraliza baseURL, credenciales (cookie httpOnly
 * del refresh token) y normalización de errores. En fases posteriores se
 * complementa con un cliente generado desde el OpenAPI del backend (ADR-0004),
 * pero el contrato de `apiFetch` se mantiene estable para los hooks de features.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${clientEnv.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    // Envía la cookie httpOnly del refresh token al backend.
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, `Request a ${path} falló (${res.status})`);
  }

  // 204 No Content: no hay cuerpo que parsear.
  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
