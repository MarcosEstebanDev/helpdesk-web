/**
 * Relleno de las variables de una respuesta predefinida (ADR-0030 del backend).
 *
 * El backend solo guarda plantillas que usan estas cuatro variables; rellenarlas
 * es cosa de esta pantalla, al insertar, para que el agente vea —y pueda
 * cambiar— el texto antes de mandarlo.
 *
 * **La regla de llaves es la misma que `template-variables.ts` del api** (repos
 * separados, ADR-0001). Si cambia allí, cambia aquí: los tests de los dos lados
 * usan los mismos casos.
 */

export interface FillContext {
  ticketNumber: number;
  subject: string;
  /** `null` o vacío = no se sabe: la variable queda literal y el envío avisa. */
  customerEmail: string | null;
  agentEmail: string | null;
}

/** Variable válida; las llaves triples no cuentan (una quedaría literal). */
const VALID_PLACEHOLDER =
  /(?<!\{)\{\{\s*(ticket\.numero|ticket\.asunto|cliente\.email|agente\.email)\s*\}\}(?!\})/g;

/** Lo que queda mal después de quitar las válidas. */
const LEFTOVER = /\{\{[^{}]*\}\}|\{\{|\}\}/;

/**
 * Reemplaza en UNA sola pasada: un asunto que contenga `{{cliente.email}}` se
 * inserta literal en vez de volver a interpretarse.
 */
export function fillTemplate(body: string, ctx: FillContext): string {
  const valores: Record<string, string | null> = {
    'ticket.numero': `#${ctx.ticketNumber}`,
    'ticket.asunto': ctx.subject,
    'cliente.email': ctx.customerEmail,
    'agente.email': ctx.agentEmail,
  };

  return body.replace(VALID_PLACEHOLDER, (original, nombre: string) => {
    const valor = valores[nombre];
    return valor === null || valor === undefined || valor === ''
      ? original
      : valor;
  });
}

/**
 * ¿Queda algo que el cliente no debería ver? Una variable válida que no se pudo
 * rellenar, una desconocida, o una llave suelta.
 */
export function hasUnfilledPlaceholder(text: string): boolean {
  VALID_PLACEHOLDER.lastIndex = 0;
  if (VALID_PLACEHOLDER.test(text)) return true;
  return LEFTOVER.test(text);
}
