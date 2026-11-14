import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RespuestasPage from './page';
import { ToastProvider } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import type { Role } from '@/stores/auth-store';

vi.mock('@/features/canned-responses/api', () => ({
  listCannedResponses: vi.fn(),
  createCannedResponse: vi.fn(),
  updateCannedResponse: vi.fn(),
  deleteCannedResponse: vi.fn(),
}));

const rolActual = { valor: 'ADMIN' as Role };
vi.mock('@/features/auth/session', () => ({
  useSession: () => ({
    status: 'authenticated',
    user: { id: 'yo', email: 'yo@acme.test', tenantId: 't1', role: rolActual.valor },
  }),
}));

import {
  createCannedResponse,
  deleteCannedResponse,
  listCannedResponses,
  updateCannedResponse,
} from '@/features/canned-responses/api';

const SALUDO = {
  id: 'p1',
  title: 'Saludo',
  body: 'Hola {{ticket.numero}}',
  createdAt: '2026-11-12T10:00:00.000Z',
  updatedAt: '2026-11-12T10:00:00.000Z',
};

function montar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <ToastProvider>
        <RespuestasPage />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('Configuración → Respuestas', () => {
  beforeEach(() => {
    rolActual.valor = 'ADMIN';
    vi.mocked(listCannedResponses).mockReset().mockResolvedValue({ items: [SALUDO] });
    vi.mocked(createCannedResponse).mockReset();
    vi.mocked(updateCannedResponse).mockReset();
    vi.mocked(deleteCannedResponse).mockReset();
  });

  it('un agente no la ve ni pide nada', () => {
    rolActual.valor = 'AGENT';
    montar();

    expect(screen.getByText(/Solo un administrador/)).toBeInTheDocument();
    expect(listCannedResponses).not.toHaveBeenCalled();
  });

  it('lista las respuestas', async () => {
    montar();

    expect(await screen.findByText('Saludo')).toBeInTheDocument();
    expect(screen.getByText('Hola {{ticket.numero}}')).toBeInTheDocument();
  });

  it('crea una respuesta nueva', async () => {
    vi.mocked(createCannedResponse).mockResolvedValue({ ...SALUDO, id: 'p2', title: 'Cierre' });
    montar();
    await screen.findByText('Saludo');

    await userEvent.click(screen.getByRole('button', { name: 'Nueva respuesta' }));
    await userEvent.type(screen.getByLabelText('Título'), 'Cierre');
    await userEvent.type(screen.getByLabelText('Texto'), 'Chau');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(createCannedResponse).toHaveBeenCalledWith({ title: 'Cierre', body: 'Chau' }),
    );
  });

  it('el 400 del backend se muestra junto al formulario', async () => {
    vi.mocked(createCannedResponse).mockRejectedValue(
      new ApiError(400, '"{{x}}" no es una variable válida.', 'ticketing.invalid_canned_response'),
    );
    montar();
    await screen.findByText('Saludo');

    await userEvent.click(screen.getByRole('button', { name: 'Nueva respuesta' }));
    await userEvent.type(screen.getByLabelText('Título'), 'Rota');
    await userEvent.type(screen.getByLabelText('Texto'), 'Hola');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText(/no es una variable válida/)).toBeInTheDocument();
  });

  it('un 409 dice que el título ya existe', async () => {
    vi.mocked(createCannedResponse).mockRejectedValue(
      new ApiError(409, 'conflict', 'ticketing.duplicate_canned_response_title'),
    );
    montar();
    await screen.findByText('Saludo');

    await userEvent.click(screen.getByRole('button', { name: 'Nueva respuesta' }));
    await userEvent.type(screen.getByLabelText('Título'), 'saludo');
    await userEvent.type(screen.getByLabelText('Texto'), 'Hola');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(
      await screen.findByText('Ya hay una respuesta con ese título.'),
    ).toBeInTheDocument();
  });

  it('edita una respuesta existente', async () => {
    vi.mocked(updateCannedResponse).mockResolvedValue({ ...SALUDO, body: 'Hola!' });
    montar();
    const fila = (await screen.findByText('Saludo')).closest('li') as HTMLElement;

    await userEvent.click(within(fila).getByRole('button', { name: 'Editar' }));
    const texto = screen.getByLabelText('Texto');
    await userEvent.clear(texto);
    await userEvent.type(texto, 'Hola!');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(updateCannedResponse).toHaveBeenCalledWith('p1', { title: 'Saludo', body: 'Hola!' }),
    );
  });

  it('borrar pide confirmación en la propia fila', async () => {
    vi.mocked(deleteCannedResponse).mockResolvedValue(undefined);
    montar();
    const fila = (await screen.findByText('Saludo')).closest('li') as HTMLElement;

    await userEvent.click(within(fila).getByRole('button', { name: 'Borrar' }));
    expect(deleteCannedResponse).not.toHaveBeenCalled();
    await userEvent.click(within(fila).getByRole('button', { name: 'Sí, borrar' }));

    await waitFor(() => expect(deleteCannedResponse).toHaveBeenCalledWith('p1'));
  });
});
