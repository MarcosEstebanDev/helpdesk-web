import { describe, expect, it } from 'vitest';
import { textoProximaApertura, vencimientoLegible } from './format';

const AR = 'America/Argentina/Buenos_Aires';
// Sábado 14/11/2026 10:00 en Argentina.
const SABADO = new Date('2026-11-14T13:00:00.000Z');

describe('textoProximaApertura', () => {
  it('dice el día y la hora de la organización', () => {
    expect(textoProximaApertura('2026-11-16T11:00:00.000Z', AR, SABADO)).toBe(
      'Estamos fuera de horario. Lo vamos a ver a partir del lunes 16/11 a las 8:00.',
    );
  });

  it('si abre hoy o mañana lo dice así', () => {
    const madrugada = new Date('2026-11-16T05:00:00.000Z'); // lunes 02:00
    expect(textoProximaApertura('2026-11-16T11:00:00.000Z', AR, madrugada)).toBe(
      'Estamos fuera de horario. Lo vamos a ver a partir de hoy a las 8:00.',
    );
    const domingo = new Date('2026-11-15T22:00:00.000Z'); // domingo 19:00
    expect(textoProximaApertura('2026-11-16T11:00:00.000Z', AR, domingo)).toBe(
      'Estamos fuera de horario. Lo vamos a ver a partir de mañana a las 8:00.',
    );
  });

  it('usa la zona de la organización y no la del navegador', () => {
    // 08:00 en Madrid = 07:00Z; un cliente en Argentina igual ve "8:00".
    expect(
      textoProximaApertura('2026-11-16T07:00:00.000Z', 'Europe/Madrid', SABADO),
    ).toContain('lunes 16/11 a las 8:00');
  });
});

describe('vencimientoLegible', () => {
  it('con más de un día de margen muestra la fecha corta', () => {
    expect(vencimientoLegible('2026-11-16T14:00:00.000Z', AR)).toBe('vence lun 16/11 11:00');
  });
});
