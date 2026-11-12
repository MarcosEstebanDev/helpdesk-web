import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ControlesDeVista } from './view-controls';
import { ToastProvider } from '@/components/ui/toast';
import type { SavedView } from '@/lib/api/types';

vi.mock('@/features/views/api', () => ({
  createView: vi.fn(),
  updateView: vi.fn(),
  deleteView: vi.fn(),
  listViews: vi.fn(),
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { createView, deleteView, updateView } from '@/features/views/api';

const VACIO = {
  estado: '' as const,
  soloMios: false,
  soloIaUrgentes: false,
  etiquetas: [],
  texto: '',
};
const FILTRADO = { ...VACIO, estado: 'OPEN' as const, soloMios: true };

const vista = (parcial: Partial<SavedView> = {}): SavedView => ({
  id: 'v1',
  name: 'Mis abiertos',
  shared: false,
  filters: { version: 1, status: 'OPEN', assignee: 'me' },
  updatedAt: '2026-11-13T10:00:00.000Z',
  ...parcial,
});

function montar(props: Parameters<typeof ControlesDeVista>[0]) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <ControlesDeVista {...props} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('ControlesDeVista (ADR-0033)', () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(createView).mockReset();
    vi.mocked(updateView).mockReset();
    vi.mocked(deleteView).mockReset();
  });

  it('sin filtros no ofrece guardar', () => {
    montar({ vista: null, estado: VACIO, esAdmin: false });

    expect(screen.queryByRole('button', { name: 'Guardar vista' })).toBeNull();
  });

  it('guarda los filtros actuales como vista personal y la abre', async () => {
    vi.mocked(createView).mockResolvedValue(vista({ id: 'nueva' }));
    montar({ vista: null, estado: FILTRADO, esAdmin: false });

    await userEvent.click(screen.getByRole('button', { name: 'Guardar vista' }));
    expect(screen.queryByLabelText('Compartir con el equipo')).toBeNull();
    await userEvent.type(screen.getByLabelText('Nombre de la vista'), 'Mis abiertos');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(createView).toHaveBeenCalledWith({
        name: 'Mis abiertos',
        filters: { version: 1, status: 'OPEN', assignee: 'me' },
        shared: false,
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/tickets?vista=nueva'));
  });

  it('un ADMIN puede compartirla', async () => {
    vi.mocked(createView).mockResolvedValue(vista({ id: 'c', shared: true }));
    montar({ vista: null, estado: FILTRADO, esAdmin: true });

    await userEvent.click(screen.getByRole('button', { name: 'Guardar vista' }));
    await userEvent.type(screen.getByLabelText('Nombre de la vista'), 'Cola');
    await userEvent.click(screen.getByLabelText('Compartir con el equipo'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(createView).toHaveBeenCalledWith(expect.objectContaining({ shared: true })),
    );
  });

  it('con una vista abierta y sin cambios no ofrece actualizar', () => {
    montar({ vista: vista(), estado: FILTRADO, esAdmin: false });

    expect(screen.queryByRole('button', { name: 'Actualizar vista' })).toBeNull();
  });

  it('si cambiaron los filtros, actualiza la vista con los nuevos', async () => {
    vi.mocked(updateView).mockResolvedValue(vista());
    montar({
      vista: vista(),
      estado: { ...FILTRADO, estado: 'IN_PROGRESS' },
      esAdmin: false,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Actualizar vista' }));

    await waitFor(() =>
      expect(updateView).toHaveBeenCalledWith('v1', {
        name: 'Mis abiertos',
        filters: { version: 1, status: 'IN_PROGRESS', assignee: 'me' },
      }),
    );
  });

  it('borrar pide confirmación y vuelve a la bandeja entera', async () => {
    vi.mocked(deleteView).mockResolvedValue(undefined);
    montar({ vista: vista(), estado: FILTRADO, esAdmin: false });

    await userEvent.click(screen.getByRole('button', { name: 'Borrar vista' }));
    expect(deleteView).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Sí, borrar' }));

    await waitFor(() => expect(deleteView).toHaveBeenCalledWith('v1'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/tickets'));
  });

  it('un agente no puede cambiar ni borrar una compartida', () => {
    montar({
      vista: vista({ shared: true }),
      estado: { ...FILTRADO, estado: 'IN_PROGRESS' },
      esAdmin: false,
    });

    expect(screen.queryByRole('button', { name: 'Actualizar vista' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Borrar vista' })).toBeNull();
  });
});
