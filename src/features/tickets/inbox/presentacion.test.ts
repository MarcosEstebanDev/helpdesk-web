import { describe, expect, it } from 'vitest';
import { describirSla, iniciales } from './presentacion';

const AHORA = new Date('2026-11-13T12:00:00.000Z');
const en = (min: number) => new Date(AHORA.getTime() + min * 60_000).toISOString();

describe('describirSla (UX 2026-11-13)', () => {
  it('sin relojes no muestra nada', () => {
    expect(describirSla({ state: 'none' }, AHORA)).toEqual({ texto: '—', tono: 'neutro' });
  });

  it('en pausa es neutro', () => {
    expect(describirSla({ state: 'paused' }, AHORA)).toEqual({ texto: 'en pausa', tono: 'neutro' });
  });

  it('faltando menos de 2 h avisa en ámbar', () => {
    expect(describirSla({ state: 'running', dueAt: en(40) }, AHORA)).toEqual({
      texto: 'vence en 40 min',
      tono: 'aviso',
    });
  });

  it('con más margen es neutro y en horas o días', () => {
    expect(describirSla({ state: 'running', dueAt: en(5 * 60) }, AHORA)).toEqual({
      texto: 'vence en 5 h',
      tono: 'neutro',
    });
    expect(describirSla({ state: 'running', dueAt: en(50 * 60) }, AHORA).texto).toBe(
      'vence en 2 d',
    );
  });

  it('incumplido es peligro y dice hace cuánto', () => {
    expect(describirSla({ state: 'breached', since: en(-71) }, AHORA)).toEqual({
      texto: 'vencido hace 1 h',
      tono: 'peligro',
    });
  });

  it('un reloj que venció con la pantalla abierta dice vencido, no "vence en 1 min"', () => {
    // El resumen es del último fetch: el barrido puede tardar en marcarlo.
    expect(describirSla({ state: 'running', dueAt: en(-30) }, AHORA)).toEqual({
      texto: 'vencido hace 30 min',
      tono: 'peligro',
    });
    expect(describirSla({ state: 'running', dueAt: en(0) }, AHORA).tono).toBe('peligro');
  });

  it('sin datos (VIEWER) no muestra nada', () => {
    expect(describirSla(undefined, AHORA)).toEqual({ texto: '—', tono: 'neutro' });
  });
});

describe('iniciales', () => {
  it.each([
    ['julian.ramos@acme.test', 'JR'],
    ['sofia@acme.test', 'SO'],
    ['ana-maria_paz@x.test', 'AM'],
    ['', '?'],
  ])('%p → %p', (email, esperado) => {
    expect(iniciales(email)).toBe(esperado);
  });
});
