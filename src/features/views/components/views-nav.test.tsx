import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VistasEnNav } from './views-nav';

vi.mock('@/features/views/api', () => ({
  listViews: vi.fn().mockResolvedValue({
    items: [
      { id: 'c1', name: 'Sin asignar', shared: true, filters: { version: 1 }, updatedAt: '' },
      { id: 'p1', name: 'Mis urgentes', shared: false, filters: { version: 1 }, updatedAt: '' },
    ],
  }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/tickets',
  useSearchParams: () => new URLSearchParams('vista=p1'),
}));

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <VistasEnNav onNavegar={() => {}} />
    </QueryClientProvider>,
  );

describe('VistasEnNav (ADR-0033)', () => {
  it('lista las vistas como enlaces a la bandeja filtrada', async () => {
    montar();

    const compartida = await screen.findByRole('link', { name: /Sin asignar/ });
    expect(compartida).toHaveAttribute('href', '/tickets?vista=c1');
    expect(screen.getByRole('link', { name: /Mis urgentes/ })).toHaveAttribute(
      'href',
      '/tickets?vista=p1',
    );
  });

  it('marca la vista abierta y distingue las compartidas', async () => {
    montar();

    expect(await screen.findByRole('link', { name: /Mis urgentes/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: /Sin asignar/ })).toHaveAccessibleName(
      /compartida/i,
    );
  });

  it('agrupa las vistas en las del equipo y las propias', async () => {
    montar();

    const equipo = await screen.findByRole('list', { name: 'Vistas del equipo' });
    const mias = screen.getByRole('list', { name: 'Mis vistas' });
    expect(equipo).toHaveTextContent('Sin asignar');
    expect(equipo).not.toHaveTextContent('Mis urgentes');
    expect(mias).toHaveTextContent('Mis urgentes');
  });
});
