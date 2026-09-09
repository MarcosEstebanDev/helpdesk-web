import { apiFetch } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';

interface RefreshResponse {
  accessToken: string;
}

/**
 * Canjea el refresh token por un access token nuevo y lo deja en el store.
 *
 * El refresh viaja solo en su cookie httpOnly (`Path=/auth`, ADR-0011), así que
 * aquí no hay ningún secreto que manejar: basta con que la petición vaya con
 * `credentials: 'include'`, que es lo que hace `apiFetch`.
 *
 * Es lo mínimo de sesión que necesita el tiempo real: cuando el servidor cierra
 * el socket porque el token caducó (ADR-0022), sin esto no habría forma de
 * reconectar y el usuario se quedaría sin actualizaciones hasta recargar la
 * página. El login y el resto del flujo de sesión son otra fase.
 *
 * Devuelve `null` si la sesión ya no vale — el backend rota los refresh y revoca
 * la familia entera si detecta reutilización, así que un fallo aquí puede
 * significar que la sesión se cerró en otro sitio, no solo que caducó.
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const { accessToken } = await apiFetch<RefreshResponse>('/auth/refresh', {
      method: 'POST',
    });
    useAuthStore.getState().setAccessToken(accessToken);
    return accessToken;
  } catch {
    useAuthStore.getState().clear();
    return null;
  }
}
