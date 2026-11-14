import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AvisoFueraDeHorario } from './aviso-fuera-de-horario';

vi.mock('@/features/business-hours/api', () => ({ getBusinessStatus: vi.fn() }));
import { getBusinessStatus } from '@/features/business-hours/api';

const montar = (esCliente: boolean) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AvisoFueraDeHorario esCliente={esCliente} />
    </QueryClientProvider>,
  );

describe('AvisoFueraDeHorario (ADR-0034)', () => {
  beforeEach(() => vi.mocked(getBusinessStatus).mockReset());

  it('con la oficina cerrada le dice al cliente cuándo lo van a ver', async () => {
    vi.mocked(getBusinessStatus).mockResolvedValue({
      open: false,
      nextOpening: '2030-01-07T11:00:00.000Z',
      timeZone: 'America/Argentina/Buenos_Aires',
    });
    montar(true);

    expect(await screen.findByRole('note')).toHaveTextContent(
      /Estamos fuera de horario\. Lo vamos a ver a partir del lunes 07\/01 a las 8:00\./,
    );
  });

  it('con la oficina abierta no muestra nada', async () => {
    vi.mocked(getBusinessStatus).mockResolvedValue({
      open: true,
      nextOpening: null,
      timeZone: 'America/Argentina/Buenos_Aires',
    });
    const { container } = montar(true);
    await vi.waitFor(() => expect(getBusinessStatus).toHaveBeenCalled());

    expect(container).toBeEmptyDOMElement();
  });

  it('al equipo ni le pide el estado', () => {
    const { container } = montar(false);

    expect(getBusinessStatus).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });
});
