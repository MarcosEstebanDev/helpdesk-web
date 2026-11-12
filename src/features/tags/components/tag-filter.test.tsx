import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TagFilter } from './tag-filter';

vi.mock('@/features/tags/api', () => ({
  listTags: vi.fn().mockResolvedValue({
    items: [{ id: 'bug', name: 'bug', color: 'red' }],
  }),
}));

describe('TagFilter', () => {
  it('no cuenta una etiqueta elegida que ya no existe en el catálogo', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TagFilter seleccion={['bug', 'borrada']} onChange={() => {}} />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('button', { name: /Etiquetas \(1\)/ })).toBeInTheDocument();
  });
});
