import { describe, expect, it } from 'vitest';
import { conteoDePestana, pestanasPara } from './pestanas';

const COUNTS = {
  OPEN: 3,
  IN_PROGRESS: 2,
  WAITING_ON_CUSTOMER: 1,
  RESOLVED: 4,
  CLOSED: 10,
};

describe('pestanasPara (UX 2026-11-13)', () => {
  it('ofrece los estados de trabajo y Todos, sin Cerrados', () => {
    expect(pestanasPara('').map((p) => p.texto)).toEqual([
      'Abiertos',
      'En curso',
      'Esperando al cliente',
      'Resueltos',
      'Todos',
    ]);
  });

  it('agrega Cerrados si una vista guardada filtra por ese estado', () => {
    // Si no, la bandeja mostraría cerrados con ninguna pestaña marcada.
    expect(pestanasPara('CLOSED').map((p) => p.estado)).toContain('CLOSED');
  });
});

describe('conteoDePestana', () => {
  it('cada estado lleva su número', () => {
    expect(conteoDePestana(COUNTS, 'WAITING_ON_CUSTOMER')).toBe(1);
  });

  it('Todos suma los cinco estados, cerrados incluidos', () => {
    // "Todos" lista también los cerrados: el número tiene que ser lo que muestra.
    expect(conteoDePestana(COUNTS, '')).toBe(20);
  });

  it('sin conteos todavía no inventa un cero', () => {
    expect(conteoDePestana(undefined, 'OPEN')).toBeUndefined();
  });
});
