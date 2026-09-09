import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';

/** Respuesta mínima para no depender de la implementación real de `fetch`. */
function respuesta(
  status: number,
  body: unknown,
  ok = status >= 200 && status < 300,
): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function mockFetch(res: Response) {
  const spy = vi.fn().mockResolvedValue(res);
  vi.stubGlobal('fetch', spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch', () => {
  it('manda la cookie del refresh en todas las peticiones', async () => {
    // Sin `credentials: 'include'` el navegador no adjunta la cookie httpOnly y
    // no habría forma de renovar la sesión.
    const fetchSpy = mockFetch(respuesta(200, { ok: true }));

    await apiFetch('/health');

    expect(fetchSpy.mock.calls[0][1]).toMatchObject({
      credentials: 'include',
    });
  });

  it('adjunta el access token cuando hay sesión', async () => {
    useAuthStore.getState().setAccessToken('un-token');
    const fetchSpy = mockFetch(respuesta(200, {}));

    await apiFetch('/tickets');

    const headers = (fetchSpy.mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer un-token');
  });

  it('no manda cabecera Authorization si no hay sesión', async () => {
    const fetchSpy = mockFetch(respuesta(200, {}));

    await apiFetch('/health');

    const headers = (fetchSpy.mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('lee el token en CADA llamada, no una vez al importar', async () => {
    // El token cambia durante la vida de la app (login, refresh). Si se
    // capturara al cargar el módulo, todas las peticiones posteriores irían con
    // una copia vieja y empezarían a dar 401 sin motivo aparente.
    const fetchSpy = mockFetch(respuesta(200, {}));

    useAuthStore.getState().setAccessToken('primero');
    await apiFetch('/tickets');
    useAuthStore.getState().setAccessToken('segundo');
    await apiFetch('/tickets');

    const cabecera = (i: number) =>
      ((fetchSpy.mock.calls[i][1] as RequestInit).headers as Record<
        string,
        string
      >).Authorization;

    expect(cabecera(0)).toBe('Bearer primero');
    expect(cabecera(1)).toBe('Bearer segundo');
  });

  it('no intenta parsear el cuerpo de un 204', async () => {
    const json = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 204, json } as unknown),
    );

    await expect(apiFetch('/auth/logout')).resolves.toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });
});

describe('errores de la API', () => {
  it('conserva el `code` estable del backend (RFC 7807)', async () => {
    // El `code` es el contrato; el `title` está para leerlo una persona y puede
    // cambiar de redacción. Mapear por texto sería atarse a la traducción.
    mockFetch(
      respuesta(409, {
        type: 'https://helpdesk.dev/errors/ticketing.invalid_transition',
        title: 'No se puede pasar un ticket de IN_PROGRESS a CLOSED.',
        status: 409,
        code: 'ticketing.invalid_transition',
      }),
    );

    await expect(apiFetch('/tickets/x/status')).rejects.toMatchObject({
      status: 409,
      code: 'ticketing.invalid_transition',
      message: 'No se puede pasar un ticket de IN_PROGRESS a CLOSED.',
    });
  });

  it('junta los errores de validación de Nest, que llegan en array', async () => {
    mockFetch(
      respuesta(400, {
        statusCode: 400,
        message: ['subject should not be empty', 'description must be a string'],
      }),
    );

    await expect(apiFetch('/tickets')).rejects.toThrow(
      'subject should not be empty. description must be a string',
    );
  });

  it('no se traga el error si la respuesta no trae JSON', async () => {
    // Un 502 de un proxy no viene en problem+json. Si el parseo fallara y se
    // propagara, el usuario vería un error de sintaxis en vez del fallo real.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error('no es json')),
      } as unknown),
    );

    const error = await apiFetch('/tickets').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(502);
  });
});
