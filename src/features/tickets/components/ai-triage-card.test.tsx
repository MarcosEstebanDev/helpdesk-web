import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiTriageCard, AiTriagePanel } from './ai-triage-card';
import { getTriage } from '@/features/tickets/api';
import type { TicketTriage } from '@/lib/api/types';

vi.mock('@/features/tickets/api', () => ({ getTriage: vi.fn() }));

const lista = (parcial: Partial<Extract<TicketTriage, { status: 'ready' }>> = {}) =>
  ({
    status: 'ready',
    category: 'account_access',
    suggestedPriority: 'HIGH',
    sentiment: 'negative',
    language: 'es',
    model: 'qwen2.5:3b-instruct',
    promptVersion: 'triage-v2',
    triagedAt: '2026-11-09T22:00:00.000Z',
    ...parcial,
  }) satisfies TicketTriage;

function conQuery(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('AiTriageCard', () => {
  it('traduce la sugerencia y deja ver de qué modelo y prompt salió', () => {
    render(<AiTriageCard estado={lista()} prioridadActual="NORMAL" />);

    expect(screen.getByText('Acceso a la cuenta')).toBeInTheDocument();
    expect(screen.getByText('Negativo · Español')).toBeInTheDocument();
    expect(screen.getByText(/qwen2\.5:3b-instruct · triage-v2/)).toBeInTheDocument();
  });

  it('marca la prioridad actual cuando la sugerida es distinta', () => {
    render(<AiTriageCard estado={lista()} prioridadActual="NORMAL" />);

    expect(screen.getByText('Alta')).toBeInTheDocument();
    expect(screen.getByText(/actual:/)).toHaveTextContent('(actual: normal)');
  });

  it('no repite la prioridad cuando coinciden', () => {
    render(<AiTriageCard estado={lista()} prioridadActual="HIGH" />);

    expect(screen.queryByText(/actual:/)).not.toBeInTheDocument();
  });

  it('una categoría que el front no conoce se muestra cruda, no como "Otro"', () => {
    // El contrato se mantiene a mano: si el backend agrega una categoría, que
    // se vea tal cual en vez de esconderse.
    render(
      <AiTriageCard estado={lista({ category: 'security' })} prioridadActual="HIGH" />,
    );

    expect(screen.getByText('security')).toBeInTheDocument();
  });

  it('distingue "analizando", "sin sugerencia" y "no se pudo consultar"', () => {
    const { rerender } = render(
      <AiTriageCard estado={{ status: 'pending' }} prioridadActual="LOW" />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Analizando el ticket');

    rerender(<AiTriageCard estado={null} prioridadActual="LOW" />);
    expect(screen.getByText(/no tiene sugerencia/i)).toBeInTheDocument();

    rerender(<AiTriageCard estado="error" prioridadActual="LOW" />);
    expect(screen.getByText(/no se pudo consultar/i)).toBeInTheDocument();
  });
});

describe('AiTriagePanel', () => {
  beforeEach(() => vi.mocked(getTriage).mockReset());

  it('a un VIEWER no le pide nada ni le muestra nada', () => {
    const { container } = render(
      conQuery(<AiTriagePanel ticketId="t1" prioridadActual="LOW" esAgente={false} />),
    );

    expect(getTriage).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it('a un agente le muestra la sugerencia cuando llega', async () => {
    vi.mocked(getTriage).mockResolvedValue(lista());

    render(conQuery(<AiTriagePanel ticketId="t1" prioridadActual="LOW" esAgente />));

    await waitFor(() => expect(screen.getByText('Acceso a la cuenta')).toBeInTheDocument());
    expect(getTriage).toHaveBeenCalledWith('t1');
  });
});
