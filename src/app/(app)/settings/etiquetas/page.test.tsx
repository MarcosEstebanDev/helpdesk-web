import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EtiquetasPage from './page';
import { ToastProvider } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import type { Role } from '@/stores/auth-store';

vi.mock('@/features/tags/api', () => ({
  listTags: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
  createTag: vi.fn(),
  setTicketTags: vi.fn(),
}));

const rolActual = { valor: 'ADMIN' as Role };
vi.mock('@/features/auth/session', () => ({
  useSession: () => ({
    status: 'authenticated',
    user: { id: 'yo', email: 'yo@acme.test', tenantId: 't1', role: rolActual.valor },
  }),
}));

import { deleteTag, listTags, updateTag } from '@/features/tags/api';

const BUG = { id: 'bug', name: 'bug', color: 'red' as const };

function montar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <ToastProvider>
        <EtiquetasPage />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const filaDe = async (nombre: string) =>
  (await screen.findByText(nombre)).closest('li') as HTMLElement;

describe('Configuración → Etiquetas', () => {
  beforeEach(() => {
    rolActual.valor = 'ADMIN';
    vi.mocked(listTags).mockReset().mockResolvedValue({ items: [BUG] });
    vi.mocked(updateTag).mockReset();
    vi.mocked(deleteTag).mockReset();
  });

  it('un agente no la ve ni pide nada', () => {
    rolActual.valor = 'AGENT';
    montar();

    expect(screen.getByText(/Solo un administrador/)).toBeInTheDocument();
    expect(listTags).not.toHaveBeenCalled();
  });

  it('renombra una etiqueta', async () => {
    vi.mocked(updateTag).mockResolvedValue({ ...BUG, name: 'error' });
    montar();
    const fila = await filaDe('bug');

    await userEvent.click(within(fila).getByRole('button', { name: 'Editar' }));
    const nombre = screen.getByLabelText('Nombre');
    await userEvent.clear(nombre);
    await userEvent.type(nombre, 'error');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(updateTag).toHaveBeenCalledWith('bug', { name: 'error', color: 'red' }),
    );
  });

  it('cambia el color', async () => {
    vi.mocked(updateTag).mockResolvedValue({ ...BUG, color: 'teal' });
    montar();
    const fila = await filaDe('bug');

    await userEvent.click(within(fila).getByRole('button', { name: 'Editar' }));
    await userEvent.click(screen.getByRole('radio', { name: 'teal' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(updateTag).toHaveBeenCalledWith('bug', { name: 'bug', color: 'teal' }),
    );
  });

  it('un 409 dice que el nombre ya existe', async () => {
    vi.mocked(updateTag).mockRejectedValue(
      new ApiError(409, 'conflict', 'ticketing.duplicate_tag_name'),
    );
    montar();
    const fila = await filaDe('bug');

    await userEvent.click(within(fila).getByRole('button', { name: 'Editar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Ya hay una etiqueta con ese nombre.')).toBeInTheDocument();
  });

  it('borrar avisa que se quita de todos los tickets y pide confirmación', async () => {
    vi.mocked(deleteTag).mockResolvedValue(undefined);
    montar();
    const fila = await filaDe('bug');

    await userEvent.click(within(fila).getByRole('button', { name: 'Borrar' }));
    expect(within(fila).getByText(/quita de todos los tickets/)).toBeInTheDocument();
    expect(deleteTag).not.toHaveBeenCalled();
    await userEvent.click(within(fila).getByRole('button', { name: 'Sí, borrar' }));

    await waitFor(() => expect(deleteTag).toHaveBeenCalledWith('bug'));
  });
});
