import { describe, expect, it } from 'vitest';
import { avisoDeClasificacion } from './ai-triage-notifier';
import { direccion } from '@/features/tickets/ai-labels';
import type { TicketTriagedMessage } from '@/lib/realtime/events';

const msg = (parcial: Partial<TicketTriagedMessage> = {}): TicketTriagedMessage => ({
  ticketId: 't1',
  occurredAt: '2026-11-09T22:00:00.000Z',
  category: 'bug',
  suggestedPriority: 'URGENT',
  number: 336,
  currentPriority: 'NORMAL',
  ...parcial,
});

describe('avisoDeClasificacion', () => {
  it('avisa cuando la IA sugiere otra prioridad, con número y categoría', () => {
    expect(avisoDeClasificacion(msg())).toEqual({
      titulo: 'La IA sugiere urgente para #336',
      detalle: 'Error del producto · hoy está en normal',
    });
  });

  it('también avisa cuando sugiere BAJAR (un falso urgente cuesta igual)', () => {
    expect(
      avisoDeClasificacion(msg({ suggestedPriority: 'LOW', currentPriority: 'HIGH' })),
    ).not.toBeNull();
  });

  it('no avisa si coincide: un aviso por ticket se vuelve ruido', () => {
    expect(avisoDeClasificacion(msg({ suggestedPriority: 'NORMAL' }))).toBeNull();
  });

  it('no avisa con eventos viejos que no traen la prioridad actual', () => {
    expect(avisoDeClasificacion(msg({ currentPriority: undefined }))).toBeNull();
  });
});

describe('direccion', () => {
  it('compara por urgencia, no por orden alfabético', () => {
    expect(direccion('NORMAL', 'HIGH')).toBe('sube');
    expect(direccion('URGENT', 'LOW')).toBe('baja');
    expect(direccion('HIGH', 'HIGH')).toBe('igual');
  });

  it('ante un valor desconocido no señala nada', () => {
    expect(direccion('NORMAL', 'CRITICAL')).toBe('igual');
  });
});
