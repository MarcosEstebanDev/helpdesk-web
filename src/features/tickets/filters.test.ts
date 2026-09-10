import { describe, expect, it } from 'vitest';
import { filtrosDeBandeja } from './filters';

const MI_ID = '11111111-1111-1111-1111-111111111111';

describe('filtrosDeBandeja', () => {
  // La clave de caché de TanStack Query sale de hashear este objeto, así que
  // "sin filtros" tiene que producir EXACTAMENTE el mismo objeto que producía
  // la bandeja antes de que existiera este filtro. Si no, quien ya tenía la
  // lista cargada la vuelve a pedir sin motivo.
  it('sin filtros devuelve el objeto vacío, que es la clave de caché de "todos"', () => {
    expect(filtrosDeBandeja({ estado: '', soloMios: false, miId: MI_ID })).toEqual(
      {},
    );
  });

  it('el estado y "mis tickets" se combinan en un solo filtro', () => {
    expect(
      filtrosDeBandeja({ estado: 'OPEN', soloMios: true, miId: MI_ID }),
    ).toEqual({ status: 'OPEN', assigneeId: MI_ID });
  });

  // Sin sesión no hay a quién filtrar. Fabricar un UUID o mandar la cadena
  // vacía haría que el backend respondiera cualquier cosa menos lo que el
  // usuario pidió.
  it('"mis tickets" sin id de sesión no manda assigneeId', () => {
    expect(
      filtrosDeBandeja({ estado: '', soloMios: true, miId: undefined }),
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
    });
    expect(Object.keys(filtros)).toEqual([]);
  });

  it('dos combinaciones distintas de filtros no comparten clave de caché', () => {
    const todos = filtrosDeBandeja({ estado: '', soloMios: false, miId: MI_ID });
    const mios = filtrosDeBandeja({ estado: '', soloMios: true, miId: MI_ID });
    const miosAbiertos = filtrosDeBandeja({
      estado: 'OPEN',
      soloMios: true,
      miId: MI_ID,
    });

    const claves = [todos, mios, miosAbiertos].map((f) => JSON.stringify(f));
    expect(new Set(claves).size).toBe(3);
  });
});
