import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TagEditor } from './tag-editor';
import { ApiError } from '@/lib/api/client';
import type { Tag } from '@/lib/api/types';

vi.mock('@/features/tags/api', () => ({
  listTags: vi.fn(),
  createTag: vi.fn(),
  setTicketTags: vi.fn(),
}));

import { createTag, listTags, setTicketTags } from '@/features/tags/api';

const BUG: Tag = { id: 'bug', name: 'bug', color: 'red' };
const VIP: Tag = { id: 'vip', name: 'vip', color: 'purple' };
const FACT: Tag = { id: 'fact', name: 'facturación', color: 'green' };

function montar(tags: Tag[], cerrado = false) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <TagEditor ticketId="tk1" tags={tags} cerrado={cerrado} />
    </QueryClientProvider>,
  );
}

describe('TagEditor (ADR-0031)', () => {
  beforeEach(() => {
    vi.mocked(listTags).mockReset().mockResolvedValue({ items: [BUG, FACT, VIP] });
    vi.mocked(setTicketTags).mockReset().mockResolvedValue({ tags: [] });
    vi.mocked(createTag).mockReset();
  });

  it('muestra las etiquetas actuales', () => {
    montar([BUG, VIP]);

    expect(screen.getByText('bug')).toBeInTheDocument();
    expect(screen.getByText('vip')).toBeInTheDocument();
  });

  it('quitar una manda el conjunto sin ella', async () => {
    montar([BUG, VIP]);

    await userEvent.click(screen.getByRole('button', { name: 'Quitar la etiqueta bug' }));

    await waitFor(() => expect(setTicketTags).toHaveBeenCalledWith('tk1', ['vip']));
  });

  it('autocompleta del catálogo sin repetir las que ya tiene', async () => {
    montar([BUG]);

    await userEvent.type(screen.getByLabelText('Agregar etiqueta'), 'f');
    const sugerencias = await screen.findByRole('listbox');

    expect(within(sugerencias).getByRole('option', { name: 'facturación' })).toBeInTheDocument();
    expect(within(sugerencias).queryByRole('option', { name: 'bug' })).toBeNull();

    await userEvent.click(within(sugerencias).getByRole('option', { name: 'facturación' }));
    await waitFor(() =>
      expect(setTicketTags).toHaveBeenCalledWith('tk1', ['bug', 'fact']),
    );
  });

  it('si no existe ofrece crearla y la pone en el ticket', async () => {
    vi.mocked(createTag).mockResolvedValue({ id: 'nueva', name: 'urgente-web', color: 'gray' });
    montar([BUG]);

    await userEvent.type(screen.getByLabelText('Agregar etiqueta'), 'urgente-web');
    await userEvent.click(await screen.findByRole('option', { name: 'Crear «urgente-web»' }));

    await waitFor(() => expect(createTag).toHaveBeenCalledWith({ name: 'urgente-web' }));
    await waitFor(() =>
      expect(setTicketTags).toHaveBeenCalledWith('tk1', ['bug', 'nueva']),
    );
  });

  it('no ofrece crear una que ya existe con otras mayúsculas', async () => {
    montar([]);

    await userEvent.type(screen.getByLabelText('Agregar etiqueta'), 'VIP');

    expect(await screen.findByRole('option', { name: 'vip' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Crear/ })).toBeNull();
  });

  it('el error del backend se muestra', async () => {
    vi.mocked(setTicketTags).mockRejectedValue(
      new ApiError(400, 'Un ticket puede tener como mucho 10 etiquetas.', 'ticketing.too_many_tags'),
    );
    montar([BUG]);

    await userEvent.type(screen.getByLabelText('Agregar etiqueta'), 'vip');
    await userEvent.click(await screen.findByRole('option', { name: 'vip' }));

    expect(await screen.findByText(/como mucho 10 etiquetas/)).toBeInTheDocument();
  });

  it('en un ticket cerrado solo se leen', () => {
    montar([BUG], true);

    expect(screen.queryByLabelText('Agregar etiqueta')).toBeNull();
    expect(screen.queryByRole('button', { name: /Quitar/ })).toBeNull();
  });
});
