import { describe, expect, it } from 'vitest';
import { filtrosDeBandeja, mensajeBandejaVacia } from './filters';

const MI_ID = '11111111-1111-1111-1111-111111111111';

describe('filtrosDeBandeja', () => {
  // La clave de caché de TanStack Query sale de hashear este objeto, así que
  // "sin filtros" tiene que producir EXACTAMENTE el mismo objeto que producía
  // la bandeja antes de que existiera este filtro. Si no, quien ya tenía la
  // lista cargada la vuelve a pedir sin motivo.
  it('sin filtros devuelve el objeto vacío, que es la clave de caché de "todos"', () => {
    expect(filtrosDeBandeja({ estado: '', soloMios: false, miId: MI_ID, esAgente: true })).toEqual(
      {},
    );
  });

  it('el estado y "mis tickets" se combinan en un solo filtro', () => {
    expect(
      filtrosDeBandeja({ estado: 'OPEN', soloMios: true, miId: MI_ID, esAgente: true }),
    ).toEqual({ status: 'OPEN', assigneeId: MI_ID });
  });

  // Sin sesión no hay a quién filtrar. Fabricar un UUID o mandar la cadena
  // vacía haría que el backend respondiera cualquier cosa menos lo que el
  // usuario pidió.
  it('"mis tickets" sin id de sesión no manda assigneeId', () => {
    expect(
      filtrosDeBandeja({ estado: '', soloMios: true, miId: undefined, esAgente: true }),
    ).toEqual({});
  });

  // `{}` y `{ status: undefined }` NO son la misma clave de caché: el objeto se
  // hashea tal cual. Poner claves en `undefined` partiría la caché en dos sin
  // que se note.
  it('una clave que no aplica se omite, no se pone en undefined', () => {
    const filtros = filtrosDeBandeja({
      estado: '',
      soloMios: false,
      miId: MI_ID,
      esAgente: true,
    });
    expect(Object.keys(filtros)).toEqual([]);
  });

  /**
   * La decisión de fondo del archivo: "míos" es una palabra con dos
   * significados. Un agente quiere lo que le toca; un VIEWER no puede tener
   * nada asignado y quiere lo que abrió. Se traduce a campos distintos de la
   * API en vez de que la palabra signifique cosas distintas en silencio.
   */
  it('"míos" es por asignación para un agente y por autoría para un viewer', () => {
    expect(
      filtrosDeBandeja({ estado: '', soloMios: true, miId: MI_ID, esAgente: true }),
    ).toEqual({ assigneeId: MI_ID });

    expect(
      filtrosDeBandeja({ estado: '', soloMios: true, miId: MI_ID, esAgente: false }),
    ).toEqual({ requesterId: MI_ID });
  });

  it('dos combinaciones distintas de filtros no comparten clave de caché', () => {
    const comun = { miId: MI_ID, esAgente: true };
    const todos = filtrosDeBandeja({ ...comun, estado: '', soloMios: false });
    const mios = filtrosDeBandeja({ ...comun, estado: '', soloMios: true });
    const miosAbiertos = filtrosDeBandeja({
      ...comun,
      estado: 'OPEN',
      soloMios: true,
    });

    const claves = [todos, mios, miosAbiertos].map((f) => JSON.stringify(f));
    expect(new Set(claves).size).toBe(3);
  });

  it('"la IA sugiere más urgencia" se manda solo para el equipo', () => {
    expect(
      filtrosDeBandeja({ estado: '', soloMios: false, miId: MI_ID, esAgente: true, soloIaUrgentes: true }),
    ).toEqual({ aiSuggestsHigher: true });
    // Para un VIEWER el backend respondería 403: no se manda.
    expect(
      filtrosDeBandeja({ estado: '', soloMios: false, miId: MI_ID, esAgente: false, soloIaUrgentes: true }),
    ).toEqual({});
  });

  it('el filtro de la IA apagado no aparece en la clave (ni como false)', () => {
    expect(
      filtrosDeBandeja({ estado: '', soloMios: false, miId: MI_ID, esAgente: true, soloIaUrgentes: false }),
    ).toEqual({});
  });

  describe('etiquetas (ADR-0031)', () => {
    const base = { estado: '' as const, soloMios: false, miId: MI_ID, esAgente: true };

    it('sin etiquetas elegidas la clave no cambia', () => {
      expect(filtrosDeBandeja({ ...base, etiquetas: [] })).toEqual({});
    });

    it('las etiquetas van ordenadas: el mismo conjunto es la misma clave', () => {
      expect(filtrosDeBandeja({ ...base, etiquetas: ['b', 'a'] })).toEqual({
        tagIds: ['a', 'b'],
      });
    });

    it('a un viewer no se le manda (el backend respondería 403)', () => {
      expect(filtrosDeBandeja({ ...base, esAgente: false, etiquetas: ['a'] })).toEqual({});
    });
  });

  describe('búsqueda (ADR-0032)', () => {
    const base = { estado: '' as const, soloMios: false, miId: MI_ID, esAgente: false };

    it('el texto va recortado en la clave', () => {
      expect(filtrosDeBandeja({ ...base, busqueda: '  pdf blanco ' })).toEqual({
        q: 'pdf blanco',
      });
    });

    it('vacío o solo espacios se omite (misma clave que "sin filtros")', () => {
      expect(filtrosDeBandeja({ ...base, busqueda: '   ' })).toEqual({});
    });

    it('vale para cualquier rol: el backend decide qué comentarios cuentan', () => {
      expect(filtrosDeBandeja({ ...base, esAgente: false, busqueda: 'x' }).q).toBe('x');
    });
  });
});

describe('mensajeBandejaVacia', () => {
  it('sin filtros, la bandeja está vacía de verdad', () => {
    expect(mensajeBandejaVacia({})).toMatch(/La bandeja está vacía/);
  });

  it('una búsqueda sin resultados lo dice con el texto buscado (gana a todo)', () => {
    expect(mensajeBandejaVacia({ q: 'pdf', status: 'OPEN' })).toBe(
      'Ningún ticket coincide con «pdf».',
    );
  });

  it('con etiquetas y sin resultados no dice que la bandeja está vacía', () => {
    expect(mensajeBandejaVacia({ tagIds: ['a'] })).toBe('Ningún ticket con esas etiquetas.');
  });

  it('conserva los mensajes de antes', () => {
    expect(mensajeBandejaVacia({ status: 'OPEN' })).toBe('Ningún ticket con ese estado.');
    expect(mensajeBandejaVacia({ aiSuggestsHigher: true })).toMatch(/La IA no ve/);
  });
});

