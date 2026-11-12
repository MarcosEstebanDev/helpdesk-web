import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/** Solo el título de la pestaña: la página es `'use client'` (ver `settings/sla`). */
export const metadata: Metadata = { title: 'Respuestas' };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
