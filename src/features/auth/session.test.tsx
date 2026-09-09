import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionProvider, useSession } from '@/features/auth/session';
import { useAuthStore } from '@/stores/auth-store';

const refrescar = vi.fn<() => Promise<string | null>>();
const perfil = vi.fn();

vi.mock('@/lib/api/refresh', () => ({
  refreshAccessToken: () => refrescar(),
}));

vi.mock('@/features/auth/api', () => ({
  me: () => perfil(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

function Estado() {
  const { status, user } = useSession();
  return (
    <>
      <span data-testid="status">{status}</span>
      <span data-testid="role">{user?.role ?? '-'}</span>
    </>
  );
}

function montar() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SessionProvider>
        <Estado />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  refrescar.mockReset();
  perfil.mockReset();
});

describe('arranque de la sesión', () => {
  it('empieza en `loading` mientras se canjea el refresh', () => {
    // El access token vive en memoria, así que al cargar la página nunca hay
    // sesión "todavía". Pintar el login mientras tanto haría parpadear la
    // pantalla a cualquiera que recargue estando dentro.
    refrescar.mockReturnValue(new Promise(() => {}));

    montar();

    expect(screen.getByTestId('status')).toHaveTextContent('loading');
  });

  it('recupera la sesión si la cookie del refresh sigue valiendo', async () => {
    refrescar.mockImplementation(async () => {
      useAuthStore.getState().setAccessToken('token-recuperado');
      return 'token-recuperado';
    });
    perfil.mockResolvedValue({
      userId: 'u-1',
      tenantId: 't-1',
      role: 'AGENT',
    });

    montar();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });
    expect(screen.getByTestId('role')).toHaveTextContent('AGENT');
  });

  it('queda anónimo si el refresh ya no vale', async () => {
    // Pasa cuando la sesión se cerró en otro sitio: el backend rota los refresh
    // y revoca la familia entera si detecta reutilización.
    refrescar.mockResolvedValue(null);

    montar();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
    });
    expect(perfil).not.toHaveBeenCalled();
  });

  it('si el perfil falla, no deja una sesión a medias', async () => {
    refrescar.mockImplementation(async () => {
      useAuthStore.getState().setAccessToken('token');
      return 'token';
    });
    perfil.mockRejectedValue(new Error('403'));

    montar();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
    });
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});

describe('el estado se deriva del store', () => {
  it('perder el token pasa la sesión a anónima sin recargar nada', async () => {
    // Es lo que hace el socket cuando el servidor responde `unauthorized`. Si
    // `status` se mantuviera en paralelo con un efecto en vez de derivarse, el
    // provider seguiría diciendo que hay sesión.
    refrescar.mockImplementation(async () => {
      useAuthStore.getState().setAccessToken('token');
      return 'token';
    });
    perfil.mockResolvedValue({
      userId: 'u-1',
      tenantId: 't-1',
      role: 'ADMIN',
    });

    montar();
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    act(() => {
      useAuthStore.getState().clear();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
  });
});
