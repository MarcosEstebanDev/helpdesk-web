'use client';

import { useEffect, useState } from 'react';

/**
 * El valor, pero recién cuando deja de cambiar durante `ms`. Para la caja de
 * búsqueda: sin esto, escribir "factura" pediría siete búsquedas al backend.
 */
export function useDebounced<T>(valor: T, ms: number): T {
  const [estable, setEstable] = useState(valor);

  useEffect(() => {
    const id = setTimeout(() => setEstable(valor), ms);
    return () => clearTimeout(id);
  }, [valor, ms]);

  return estable;
}
