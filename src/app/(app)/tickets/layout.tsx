import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * Layout de servidor cuyo único trabajo es el título de la pestaña.
 *
 * La página de este segmento es `'use client'` y un componente de cliente no
 * puede exportar `metadata`. Envolverla en un layout de servidor es la salida
 * barata: no añade marcado ni un cliente más al bundle.
 */
export const metadata: Metadata = { title: 'Tickets' };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
