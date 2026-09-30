import { describe, expect, it } from 'vitest';
import { guardarPreferencia, leerPreferencia, resolverTema } from './theme';

/** `localStorage` de mentira, para poder simular también el que falla. */
function almacen(inicial?: string, rompe = false): Storage {
  let valor = inicial ?? null;
  return {
    getItem: () => {
      if (rompe) throw new Error('acceso denegado');
      return valor;
    },
    setItem: (_k: string, v: string) => {
      if (rompe) throw new Error('acceso denegado');
      valor = v;
    },
  } as unknown as Storage;
}

describe('resolverTema', () => {
  it('respeta la elección explícita por encima del sistema', () => {
    expect(resolverTema('light', true)).toBe('light');
    expect(resolverTema('dark', false)).toBe('dark');
  });

  it('sigue al sistema cuando no hay elección', () => {
    expect(resolverTema('system', true)).toBe('dark');
    expect(resolverTema('system', false)).toBe('light');
  });
});

describe('leerPreferencia', () => {
  it('lee una preferencia guardada', () => {
    expect(leerPreferencia(almacen('dark'))).toBe('dark');
  });

  it('cae a "system" si lo guardado no es una preferencia válida', () => {
    expect(leerPreferencia(almacen('azul'))).toBe('system');
  });

  // Safari en privado y los navegadores con el almacenamiento bloqueado lanzan
  // al tocar localStorage. Quedarse sin tema es peor que quedarse sin memoria.
  it('cae a "system" si el navegador prohíbe leer el almacenamiento', () => {
    expect(leerPreferencia(almacen(undefined, true))).toBe('system');
  });
});

describe('guardarPreferencia', () => {
  it('no propaga el error de un almacenamiento bloqueado', () => {
    expect(() => guardarPreferencia(almacen(undefined, true), 'dark')).not.toThrow();
  });
});
