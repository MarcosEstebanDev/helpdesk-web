import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SlaPanel } from '@/features/tickets/components/sla-panel';
import type { TicketSla } from '@/lib/api/types';

const reloj = (parcial: Partial<TicketSla> = {}): TicketSla => ({
  kind: 'RESPONSE',
  dueAt: '2026-09-09T12:00:00.000Z',
  stoppedAt: null,
  breachedAt: null,
  status: 'running',
  remainingMinutes: 30,
  ...parcial,
});

describe('SlaPanel', () => {
  it('no inventa un "cumple" cuando el ticket no tiene relojes', () => {
    // Los tickets anteriores a la fase 6, y los que el worker todavía no
    // procesó, llegan con `sla: []`. Enseñar "cumplido" ahí sería mentir; no
    // enseñar nada, esconder que el motor aún no pasó.
    render(<SlaPanel sla={[]} />);

    expect(
      screen.getByText(/no tiene relojes de sla/i),
    ).toBeInTheDocument();
  });

  it('muestra el margen que queda en un reloj en marcha', () => {
    render(<SlaPanel sla={[reloj({ remainingMinutes: 90 })]} />);

    expect(screen.getByText('Quedan 1 h 30 min')).toBeInTheDocument();
  });

  it('un reloj cumplido dice por cuánto margen se cumplió', () => {
    render(
      <SlaPanel
        sla={[
          reloj({
            status: 'met',
            stoppedAt: '2026-09-09T11:45:00.000Z',
            remainingMinutes: 15,
          }),
        ]}
      />,
    );

    expect(screen.getByText('Cumplido, 15 min antes')).toBeInTheDocument();
  });

  it('un reloj incumplido dice cuánto se pasó, en positivo', () => {
    // El backend manda `remainingMinutes` negativo; enseñar "-20 min" al lado de
    // "incumplido" obliga a leer dos veces para entender el signo.
    render(
      <SlaPanel
        sla={[
          reloj({
            status: 'breached',
            breachedAt: '2026-09-09T12:20:00.000Z',
            remainingMinutes: -20,
          }),
        ]}
      />,
    );

    expect(screen.getByText('Incumplido por 20 min')).toBeInTheDocument();
  });

  it('distingue un reloj vencido que el barrido todavía no marcó', () => {
    // El caso que justifica el tercer estado: el reloj sigue `running` porque
    // nadie lo paró, pero su hora ya pasó. Ni se dice que va bien, ni se marca
    // como incumplido antes de que el backend lo registre.
    render(<SlaPanel sla={[reloj({ status: 'running', remainingMinutes: -10 })]} />);

    expect(screen.getByText('Vencido, sin registrar')).toBeInTheDocument();
  });

  it('enseña los dos relojes con su nombre de negocio', () => {
    render(
      <SlaPanel
        sla={[reloj(), reloj({ kind: 'RESOLUTION', remainingMinutes: 240 })]}
      />,
    );

    expect(screen.getByText('Primera respuesta')).toBeInTheDocument();
    expect(screen.getByText('Resolución')).toBeInTheDocument();
  });

  it('redondea el margen a horas exactas sin minutos sobrantes', () => {
    render(<SlaPanel sla={[reloj({ remainingMinutes: 120 })]} />);

    expect(screen.getByText('Quedan 2 h')).toBeInTheDocument();
  });
});
