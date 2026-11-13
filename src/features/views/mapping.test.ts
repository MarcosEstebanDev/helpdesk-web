import { describe, expect, it } from 'vitest';
import { estadoAFiltrosDeVista, filtrosDeVistaAEstado, mismoEstado } from './mapping';

const VACIO = {
  estado: '' as const,
  soloMios: false,
  soloIaUrgentes: false,
  etiquetas: [] as string[],
  texto: '',
};

describe('vistas ↔ estado de la bandeja (ADR-0033)', () => {
  it('"yo" se vuelve "Mis tickets": cada uno ve lo suyo', () => {
    expect(filtrosDeVistaAEstado({ version: 1, assignee: 'me' }).soloMios).toBe(true);
  });

  it('una vista sin filtros es la bandeja entera', () => {
    expect(filtrosDeVistaAEstado({ version: 1 })).toEqual(VACIO);
  });

  it('ida y vuelta conserva todo', () => {
    const estado = {
      estado: 'IN_PROGRESS' as const,
      soloMios: true,
      soloIaUrgentes: true,
      etiquetas: ['b', 'a'],
      texto: 'pdf',
    };

    expect(filtrosDeVistaAEstado(estadoAFiltrosDeVista(estado))).toEqual({
      ...estado,
      etiquetas: ['a', 'b'],
    });
  });

  it('lo vacío no se guarda: texto en blanco, sin etiquetas, sin estado', () => {
    expect(estadoAFiltrosDeVista({ ...VACIO, texto: '   ' })).toEqual({ version: 1 });
  });

  it('mismoEstado ignora el orden de las etiquetas y los espacios del texto', () => {
    expect(
      mismoEstado(
        { ...VACIO, etiquetas: ['a', 'b'], texto: 'pdf' },
        { ...VACIO, etiquetas: ['b', 'a'], texto: ' pdf ' },
      ),
    ).toBe(true);
    expect(mismoEstado(VACIO, { ...VACIO, soloMios: true })).toBe(false);
  });
});
