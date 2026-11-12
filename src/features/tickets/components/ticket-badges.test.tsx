import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '@/features/tickets/components/ticket-badges';

describe('StatusBadge', () => {
  it('nombra la espera del cliente con un tono propio, no el de En curso', () => {
    render(
      <>
        <StatusBadge status="WAITING_ON_CUSTOMER" />
        <StatusBadge status="IN_PROGRESS" />
      </>,
    );

    const espera = screen.getByText('Esperando al cliente');
    const enCurso = screen.getByText('En curso');
    // Si compartieran color, la bandeja no distinguiría "lo estoy trabajando"
    // de "la pelota está del lado del cliente".
    expect(espera.className).not.toBe(enCurso.className);
  });
});
