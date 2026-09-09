import { clientEnv } from '@/lib/env';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Cliente HTTP contra `helpdesk-api`.
 *
 * Centraliza tres cosas que no deben repetirse: la baseURL, el envío de la
 * cookie httpOnly del refresh (`credentials: 'include'`) y la normalización de
 * los errores del backend, que llegan en formato RFC 7807
 * (`application/problem+json`) con un `code` estable.
 *
 * **Se mapea por `code`, nunca por el texto del mensaje**: el mensaje está para
 * leerlo una persona y puede cambiar de redacción sin previo aviso; el código es
 * el contrato.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Código estable del backend, p. ej. `ticketing.invalid_transition`. */
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ProblemDetails {
  title?: string;
  code?: string;
  message?: string | string[];
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  // El token se lee en cada llamada y no se captura al importar: durante la vida
  // de la app cambia (login, refresh) y una copia quedaría vieja.
  const token = useAuthStore.getState().accessToken;

  const res = await fetch(`${clientEnv.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token !== null ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw await toApiError(res, path);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

async function toApiError(res: Response, path: string): Promise<ApiError> {
  try {
    const problem = (await res.json()) as ProblemDetails;
    // El ValidationPipe de Nest devuelve `message` como array de errores; los
    // errores de dominio, como un string con `title`.
    const detalle = Array.isArray(problem.message)
      ? problem.message.join('. ')
      : (problem.title ?? problem.message);

    return new ApiError(
      res.status,
      detalle ?? `Request a ${path} falló (${res.status})`,
      problem.code,
    );
  } catch {
    // Un 502 de un proxy no trae JSON. No se pierde el error por eso.
    return new ApiError(res.status, `Request a ${path} falló (${res.status})`);
  }
}
