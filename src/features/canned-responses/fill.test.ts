import { describe, expect, it } from 'vitest';
import { fillTemplate, hasUnfilledPlaceholder } from './fill';

const ctx = {
  ticketNumber: 42,
  subject: 'No anda el PDF',
  customerEmail: 'cliente@acme.test',
  agentEmail: 'agente@acme.test',
};

describe('fillTemplate', () => {
  it('rellena las cuatro variables', () => {
    expect(
      fillTemplate(
        '{{ticket.numero}} {{ticket.asunto}} {{cliente.email}} {{agente.email}}',
        ctx,
      ),
    ).toBe('#42 No anda el PDF cliente@acme.test agente@acme.test');
  });

  it('tolera espacio dentro de las llaves', () => {
    expect(fillTemplate('Ticket {{ ticket.numero }}', ctx)).toBe('Ticket #42');
  });

  it.each([null, ''])(
    'si falta el email del cliente (%p) la variable queda literal',
    (customerEmail) => {
      expect(
        fillTemplate('Hola {{cliente.email}}', { ...ctx, customerEmail }),
      ).toBe('Hola {{cliente.email}}');
    },
  );

  it('si falta el email del agente la variable queda literal', () => {
    expect(fillTemplate('{{agente.email}}', { ...ctx, agentEmail: '' })).toBe(
      '{{agente.email}}',
    );
  });

  it('un asunto con llaves se inserta tal cual, sin una segunda pasada', () => {
    expect(
      fillTemplate('Sobre: {{ticket.asunto}}', {
        ...ctx,
        subject: 'Ayuda {{cliente.email}}',
      }),
    ).toBe('Sobre: Ayuda {{cliente.email}}');
  });
});

describe('hasUnfilledPlaceholder', () => {
  it.each(['Hola {{cliente.email}}', 'Hola {{', '{{x}}', 'fin }}'])(
    'detecta %p',
    (texto) => {
      expect(hasUnfilledPlaceholder(texto)).toBe(true);
    },
  );

  it.each(['Hola, todo bien', 'Un JSON {a: 1}'])('no molesta con %p', (texto) => {
    expect(hasUnfilledPlaceholder(texto)).toBe(false);
  });
});
