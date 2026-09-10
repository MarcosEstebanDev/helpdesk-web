import { describe, expect, it } from 'vitest';
import { fechaAbsoluta, fechaCorta, tiempoRelativo } from './relative-time';

const AHORA = new Date('2026-09-10T12:00:00Z');

describe('tiempoRelativo', () => {
  it('trata el último minuto como "ahora"', () => {
    expect(tiempoRelativo('2026-09-10T11:59:30Z', AHORA)).toBe('ahora');
  });

  it('redondea hacia abajo: 90 minutos son 1 h, no 2', () => {
    expect(tiempoRelativo('2026-09-10T10:30:00Z', AHORA)).toBe('hace 1 h');
  });

  it('usa minutos por debajo de la hora', () => {
    expect(tiempoRelativo('2026-09-10T11:55:00Z', AHORA)).toBe('hace 5 min');
  });

  it('usa días a partir de las 24 h', () => {
    expect(tiempoRelativo('2026-09-09T10:00:00Z', AHORA)).toBe('hace 1 d');
  });

  // Pasada una semana, "hace 23 d" ya no le dice nada a nadie: la fecha sí.
  it('cambia a fecha absoluta pasados 7 días', () => {
    expect(tiempoRelativo('2026-08-18T10:00:00Z', AHORA)).toBe('18 ago');
  });

  it('incluye el año cuando la fecha no es de este año', () => {
    expect(tiempoRelativo('2025-08-18T10:00:00Z', AHORA)).toBe('18 ago 2025');
  });

  // El reloj del cliente puede ir atrasado respecto del servidor: un ticket
  // creado "en el futuro" no debe pintarse como "hace -3 min".
  it('no inventa futuro cuando el reloj del cliente va atrasado', () => {
    expect(tiempoRelativo('2026-09-10T12:03:00Z', AHORA)).toBe('ahora');
  });
});

describe('fechaCorta', () => {
  // Se comprueba la FORMA y no el texto: el resultado depende de la zona
  // horaria de quien corre el test, y clavarlo a una haría fallar el CI.
  it('da día, mes abreviado y hora, sin año', () => {
    expect(fechaCorta('2026-09-10T12:00:00Z')).toMatch(
      /^\d{1,2} [a-zé]{3,4},? \d{1,2}:\d{2}$/,
    );
  });
});

describe('fechaAbsoluta', () => {
  it('devuelve fecha y hora legibles para el tooltip', () => {
    expect(fechaAbsoluta('2026-09-10T12:00:00Z')).toMatch(/2026/);
  });
});
