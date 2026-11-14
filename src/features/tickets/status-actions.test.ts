import { describe, expect, it } from 'vitest';
import { accionesDesde } from '@/features/tickets/status-actions';

describe('accionesDesde', () => {
  it('desde En curso se puede mandar a esperar al cliente', () => {
    expect(accionesDesde('IN_PROGRESS')).toContainEqual({
      to: 'WAITING_ON_CUSTOMER',
      label: 'Esperar al cliente',
    });
  });

  it('desde la espera solo se retoma o se resuelve (ADR-0029)', () => {
    // Ir a IN_PROGRESS desde la espera no es "empezar": el ticket ya estaba en
    // marcha. Y ni se cierra ni se devuelve a la cola sin retomarlo antes.
    expect(accionesDesde('WAITING_ON_CUSTOMER')).toEqual([
      { to: 'IN_PROGRESS', label: 'Retomar' },
      { to: 'RESOLVED', label: 'Resolver' },
    ]);
  });

  it('desde Abierto, ir a En curso sigue siendo "Empezar"', () => {
    expect(accionesDesde('OPEN')).toContainEqual({
      to: 'IN_PROGRESS',
      label: 'Empezar',
    });
  });

  it('un ticket cerrado no ofrece nada', () => {
    expect(accionesDesde('CLOSED')).toEqual([]);
  });
});
