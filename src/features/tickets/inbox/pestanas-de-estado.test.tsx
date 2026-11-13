import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PestanasDeEstado } from './pestanas-de-estado';

const COUNTS = { OPEN: 3, IN_PROGRESS: 2, WAITING_ON_CUSTOMER: 1, RESOLVED: 4, CLOSED: 10 };

describe('PestanasDeEstado', () => {
  it('cada pestaña dice cuántos tickets tiene y marca la elegida', () => {
    render(<PestanasDeEstado actual="IN_PROGRESS" counts={COUNTS} onChange={() => {}} />);

    expect(screen.getByRole('tab', { name: /En curso\s*2/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Todos\s*20/ })).toHaveAttribute('aria-selected', 'false');
  });

  it('sin conteos muestra las pestañas sin número', () => {
    render(<PestanasDeEstado actual="" counts={undefined} onChange={() => {}} />);

    expect(screen.getByRole('tab', { name: 'Abiertos' })).toBeInTheDocument();
  });

  it('elegir una pestaña avisa el estado', () => {
    const onChange = vi.fn();
    render(<PestanasDeEstado actual="" counts={COUNTS} onChange={onChange} />);

    fireEvent.click(screen.getByRole('tab', { name: /Esperando al cliente/ }));

    expect(onChange).toHaveBeenCalledWith('WAITING_ON_CUSTOMER');
  });
});
