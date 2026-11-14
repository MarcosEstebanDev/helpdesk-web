import { describe, expect, it, vi } from 'vitest';
import { countTickets, getTriage, listTickets } from './api';
import { ApiError, apiFetch } from '@/lib/api/client';

vi.mock('@/lib/api/client', async (original) => ({
  ...(await original<typeof import('@/lib/api/client')>()),
  apiFetch: vi.fn(),
}));

describe('getTriage', () => {
  it('un 404 significa "sin sugerencia", no un error', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError(404, 'Not Found'));

    await expect(getTriage('t1')).resolves.toBeNull();
  });

  it('cualquier otro fallo sí se propaga', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError(403, 'Forbidden'));

    await expect(getTriage('t1')).rejects.toMatchObject({ status: 403 });
  });
});

describe('listTickets', () => {
  it('manda cada etiqueta como un tagId repetido', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ items: [], nextCursor: null });

    await listTickets({ tagIds: ['a', 'b'] });

    expect(apiFetch).toHaveBeenLastCalledWith('/tickets?tagId=a&tagId=b');
  });

  it('manda la búsqueda como q', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ items: [], nextCursor: null });

    await listTickets({ q: 'pdf en blanco' });

    expect(apiFetch).toHaveBeenLastCalledWith('/tickets?q=pdf+en+blanco');
  });
});

describe('countTickets', () => {
  it('manda los mismos filtros que el listado (búsqueda y etiquetas incluidas)', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({});

    await countTickets({ assigneeId: 'u1', tagIds: ['a', 'b'], q: 'pdf' });

    expect(apiFetch).toHaveBeenLastCalledWith(
      '/tickets/counts?assigneeId=u1&tagId=a&tagId=b&q=pdf',
    );
  });

  it('sin filtros pide la ruta pelada', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({});

    await countTickets({});

    expect(apiFetch).toHaveBeenLastCalledWith('/tickets/counts');
  });

  it('ignora el estado aunque venga en los filtros de la bandeja', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({});

    // Las pestañas SON el estado: contarlas filtrando por uno daría ceros en el resto.
    await countTickets({ status: 'OPEN', q: 'pdf' } as never);

    expect(apiFetch).toHaveBeenLastCalledWith('/tickets/counts?q=pdf');
  });
});

