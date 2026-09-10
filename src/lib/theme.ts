/**
 * Preferencia de tema: la parte con lógica, separada del provider para poder
 * probarla sin montar React ni fingir un `matchMedia`.
 */

export const PREFERENCIAS = ['light', 'dark', 'system'] as const;
export type Preferencia = (typeof PREFERENCIAS)[number];
export type Tema = 'light' | 'dark';

export const CLAVE_TEMA = 'helpdesk-theme';

/** `system` no es un tema: es "preguntale al sistema operativo". */
export function resolverTema(
  preferencia: Preferencia,
  prefiereOscuro: boolean,
): Tema {
  if (preferencia === 'system') return prefiereOscuro ? 'dark' : 'light';
  return preferencia;
}

/**
 * Los accesos van envueltos en `try`: Safari en modo privado y los navegadores
 * con el almacenamiento bloqueado **lanzan** al tocar `localStorage`. Quedarse
 * sin aplicación por no poder recordar un color no es un intercambio aceptable.
 */
export function leerPreferencia(almacen: Storage | undefined): Preferencia {
  try {
    const guardada = almacen?.getItem(CLAVE_TEMA);
    return esPreferencia(guardada) ? guardada : 'system';
  } catch {
    return 'system';
  }
}

export function guardarPreferencia(
  almacen: Storage | undefined,
  preferencia: Preferencia,
): void {
  try {
    almacen?.setItem(CLAVE_TEMA, preferencia);
  } catch {
    // Sin memoria entre sesiones, pero con la aplicación en pie.
  }
}

function esPreferencia(valor: string | null | undefined): valor is Preferencia {
  return (
    valor !== null &&
    valor !== undefined &&
    (PREFERENCIAS as readonly string[]).includes(valor)
  );
}
