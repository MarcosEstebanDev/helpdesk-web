import { describe, expect, it, vi } from 'vitest';
import { getTriage } from './api';
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
