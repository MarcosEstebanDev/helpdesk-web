import { describe, expect, it } from 'vitest';
import { describirEntrada, papelDelActor } from './audit';
import { SYSTEM_ACTOR_ID, type AuditEntry } from '@/lib/api/types';

const YO = '11111111-1111-1111-1111-111111111111';
const SOLICITANTE = '22222222-2222-2222-2222-222222222222';
const OTRO = '33333333-3333-3333-3333-333333333333';

const PARTICIPANTES = {
  miId: YO,
  requesterId: SOLICITANTE,
  assigneeId: YO,
};

const entrada = (parcial: Partial<AuditEntry> = {}): AuditEntry => ({
  id: 'a1',
  actorId: YO,
  action: 'comment.added',
  metadata: null,
  occurredAt: '2026-09-10T12:00:00.000Z',
  ...parcial,
});

describe('papelDelActor', () => {
  // El backend usa un UUID de ceros para lo que no hizo una persona (ADR-0019).
  // Atribuirlo a alguien sería inventar un responsable.
  it('el actor de los ceros se atribuye al sistema, no a una persona', () => {
    expect(papelDelActor(SYSTEM_ACTOR_ID, PARTICIPANTES)).toBe('sistema');
  });

  it('distingue quién sos vos y quién abrió el ticket', () => {
    expect(papelDelActor(YO, PARTICIPANTES)).toBe('vos');
    expect(papelDelActor(SOLICITANTE, PARTICIPANTES)).toBe('solicitante');
    expect(papelDelActor(OTRO, PARTICIPANTES)).toBe('otro');
  });

  // Sin sesión no se puede afirmar que algo lo hiciste vos.
  it('sin id de sesión, nadie es "vos"', () => {
    expect(papelDelActor(YO, { ...PARTICIPANTES, miId: undefined })).toBe(
      'asignado',
    );
  });
});

describe('describirEntrada', () => {
  it('un cambio de estado con from y to se lee como una transición', () => {
    const d = describirEntrada(
      entrada({
        action: 'ticket.status_changed',
        metadata: { from: 'OPEN', to: 'IN_PROGRESS' },
      }),
      PARTICIPANTES,
    );

    expect(d.transicion).toEqual({ desde: 'OPEN', hasta: 'IN_PROGRESS' });
  });

  // El caso que justifica todo el archivo: `metadata` es `unknown` y puede
  // llegar cualquier cosa. Antes que suponer una transición, no se dice.
  it('un cambio de estado con metadata ilegible no inventa la transición', () => {
    for (const metadata of [null, {}, { from: 'PEPE', to: 'OPEN' }, 'texto']) {
      const d = describirEntrada(
        entrada({ action: 'ticket.status_changed', metadata }),
        PARTICIPANTES,
      );
      expect(d.transicion).toBeUndefined();
      expect(d.frase).toBe('Cambió el estado');
    }
  });

  it('una asignación automática se distingue de una hecha a mano', () => {
    const automatica = describirEntrada(
      entrada({
        action: 'ticket.assigned',
        actorId: SYSTEM_ACTOR_ID,
        metadata: { assigneeId: YO, automatic: true },
      }),
      PARTICIPANTES,
    );
    const manual = describirEntrada(
      entrada({
        action: 'ticket.assigned',
        actorId: OTRO,
        metadata: { assigneeId: YO },
      }),
      PARTICIPANTES,
    );

    expect(automatica.automatico).toBe(true);
    expect(automatica.papel).toBe('sistema');
    expect(manual.automatico).toBeUndefined();
    expect(manual.frase).toBe('Asignó el ticket a vos');
  });

  it('una asignación a otra persona no se atribuye a vos', () => {
    const d = describirEntrada(
      entrada({ action: 'ticket.assigned', metadata: { assigneeId: OTRO } }),
      PARTICIPANTES,
    );

    expect(d.frase).toBe('Asignó el ticket a otra persona');
  });

  it('el incumplimiento de SLA dice qué reloj y cuándo vencía', () => {
    const d = describirEntrada(
      entrada({
        action: 'sla.breached',
        metadata: {
          kind: 'RESPONSE',
          dueAt: '2026-09-10T10:00:00.000Z',
          automatic: true,
        },
      }),
      PARTICIPANTES,
    );

    expect(d.reloj).toEqual({
      kind: 'RESPONSE',
      dueAt: '2026-09-10T10:00:00.000Z',
    });
  });

  it('un incumplimiento sin reloj legible sigue contándose, sin detalle', () => {
    const d = describirEntrada(
      entrada({ action: 'sla.breached', metadata: { kind: 'OTRA_COSA' } }),
      PARTICIPANTES,
    );

    expect(d.reloj).toBeUndefined();
    expect(d.frase).toBe('Se incumplió el SLA');
  });

  // `lib/api/types.ts` se mantiene a mano: una acción nueva en el backend llega
  // acá sin avisar. El día que pase, la pantalla tiene que degradar, no caerse.
  it('una acción desconocida se muestra tal cual en vez de romper', () => {
    const d = describirEntrada(
      entrada({ action: 'ticket.escalated' }),
      PARTICIPANTES,
    );

    expect(d.accionCruda).toBe('ticket.escalated');
    expect(d.frase).not.toBe('');
  });

  // Está en el enum del backend pero ningún caso de uso la emite todavía, así
  // que su metadata no tiene forma conocida y no se puede leer.
  it('la prioridad cambiada no inventa valores que el backend nunca escribe', () => {
    const d = describirEntrada(
      entrada({
        action: 'ticket.priority_changed',
        metadata: { from: 'LOW', to: 'URGENT' },
      }),
      PARTICIPANTES,
    );

    expect(d.frase).toBe('Cambió la prioridad');
    expect(d.transicion).toBeUndefined();
    expect(d.prioridad).toBeUndefined();
  });

  it('la apertura del ticket incluye la prioridad solo si es una válida', () => {
    const buena = describirEntrada(
      entrada({ action: 'ticket.created', metadata: { priority: 'HIGH' } }),
      PARTICIPANTES,
    );
    const mala = describirEntrada(
      entrada({ action: 'ticket.created', metadata: { priority: 'ALTISIMA' } }),
      PARTICIPANTES,
    );

    expect(buena.prioridad).toBe('HIGH');
    expect(mala.prioridad).toBeUndefined();
  });
});
