import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccionesDeEstado } from './status-actions-bar';
import { ToastProvider } from '@/components/ui/toast';
import type { TicketStatus } from '@/lib/api/types';

vi.mock('@/features/tickets/api', () => ({ changeStatus: vi.fn() }));
import { changeStatus } from '@/features/tickets/api';

const montar = (status: TicketStatus) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <AccionesDeEstado ticketId="tk1" status={status} />
      </ToastProvider>
    </QueryClientProvider>,
  );

describe('AccionesDeEstado (UX 2026-11-13)', () => {
  beforeEach(() => {
    vi.mocked(changeStatus).mockReset();
    vi.mocked(changeStatus).mockResolvedValue({} as never);
  });

  it('ofrece a la vista las transiciones legales desde el estado actual', () => {
    montar('IN_PROGRESS');

    expect(screen.getByRole('button', { name: 'Esperar al cliente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resolver' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reabrir' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar' })).toBeNull();
  });

  it('desde la espera, volver a curso se llama Retomar', () => {
    montar('WAITING_ON_CUSTOMER');

    expect(screen.getByRole('button', { name: 'Retomar' })).toBeInTheDocument();
  });

  it('un clic cambia el estado', async () => {
    montar('IN_PROGRESS');

    await userEvent.click(screen.getByRole('button', { name: 'Resolver' }));

    await waitFor(() => expect(changeStatus).toHaveBeenCalledWith('tk1', 'RESOLVED'));
  });

  it('un ticket cerrado no ofrece nada y lo dice', () => {
    montar('CLOSED');

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(/no admite más cambios/)).toBeInTheDocument();
  });
});
