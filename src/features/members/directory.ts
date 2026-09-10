import type { Member } from '@/lib/api/types';

/**
 * Resuelve un `userId` a algo legible, cuando se puede.
 *
 * El "cuando se puede" es la clave: `GET /members` solo lo puede pedir un AGENT
 * o superior (ADR-0025), así que un VIEWER **nunca** tiene directorio y sigue
 * viendo papeles ("Solicitante", "Agente asignado") en vez de personas. Y aun
 * siendo agente, un id puede no estar en la lista: alguien que se dio de baja
 * sigue apareciendo en la auditoría de lo que hizo.
 *
 * Por eso devuelve `null` en vez de una cadena de relleno: quien llama decide
 * con qué rellenar, y ese hueco se rellena con lo que sí se sabe, nunca con un
 * nombre inventado.
 */
export type Directorio = (userId: string) => Member | null;

/** Directorio vacío: el de un VIEWER, o el de antes de que la lista cargue. */
export const SIN_DIRECTORIO: Directorio = () => null;

export function crearDirectorio(miembros: Member[] | undefined): Directorio {
  if (miembros === undefined || miembros.length === 0) return SIN_DIRECTORIO;

  const porId = new Map(miembros.map((m) => [m.userId, m]));
  return (userId) => porId.get(userId) ?? null;
}

/**
 * La etiqueta de una persona: su email.
 *
 * El backend no tiene columna `name` (consecuencia anotada en el ADR-0025), así
 * que el correo es la única etiqueta legible que existe. Se recorta el dominio
 * porque en una lista de la misma organización todos comparten el de después de
 * la arroba, y repetirlo veinte veces no distingue a nadie.
 */
export function etiquetaDe(miembro: Member): string {
  return miembro.email.split('@')[0];
}
