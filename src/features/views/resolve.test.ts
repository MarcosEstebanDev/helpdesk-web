import { describe, expect, it } from 'vitest';
import { resolverVista } from './resolve';
import type { SavedView } from '@/lib/api/types';

const V: SavedView = {
  id: 'v1',
  name: 'Mis abiertos',
  shared: false,
  filters: { version: 1, status: 'OPEN' },
  updatedAt: '2026-11-13T10:00:00.000Z',
};
const consulta = (parcial: { isPending?: boolean; isError?: boolean; items?: SavedView[] }) => ({
  isPending: parcial.isPending ?? false,
  isError: parcial.isError ?? false,
  data: parcial.items === undefined ? undefined : { items: parcial.items },
});

describe('resolverVista (ADR-0033)', () => {
  it('sin ?vista= es la bandeja entera', () => {
    expect(resolverVista(null, true, consulta({})).tipo).toBe('sin-vista');
  });

  it('un VIEWER ignora ?vista= sin avisar nada (no usa vistas)', () => {
    expect(resolverVista('v1', false, consulta({})).tipo).toBe('sin-vista');
  });

  it('mientras carga, espera', () => {
    expect(resolverVista('v1', true, consulta({ isPending: true })).tipo).toBe('cargando');
  });

  it('si la carga falla es un error, no "la vista ya no existe"', () => {
    expect(resolverVista('v1', true, consulta({ isError: true })).tipo).toBe('error');
  });

  it('la encuentra y la key cambia si la vista se edita', () => {
    const antes = resolverVista('v1', true, consulta({ items: [V] }));
    const despues = resolverVista(
      'v1',
      true,
      consulta({ items: [{ ...V, updatedAt: '2026-11-13T11:00:00.000Z' }] }),
    );

    expect(antes.tipo).toBe('vista');
    expect(antes.key).not.toBe(despues.key);
  });

  it('cargada y sin ese id: la vista ya no existe', () => {
    expect(resolverVista('v9', true, consulta({ items: [V] })).tipo).toBe('perdida');
  });

  it('error y después éxito dan keys distintas: la bandeja se vuelve a montar', () => {
    const conError = resolverVista('v1', true, consulta({ isError: true }));
    const recuperada = resolverVista('v1', true, consulta({ items: [V] }));

    expect(conError.key).not.toBe(recuperada.key);
  });
});
