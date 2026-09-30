'use client';

import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import {
  guardarPreferencia,
  leerPreferencia,
  resolverTema,
  type Preferencia,
  type Tema,
} from '@/lib/theme';

/**
 * Tema claro/oscuro, escrito a mano en vez de traer `next-themes`.
 *
 * Son treinta líneas y evita una dependencia, en la misma línea que
 * `components/ui/primitives.tsx`. Lo que sí hay que hacer bien son dos cosas:
 *
 * 1. **No parpadear.** El tema vive en `localStorage`, que el servidor no puede
 *    leer, así que el HTML sale siempre "claro" y la corrección tiene que pasar
 *    ANTES de la primera pintura. De eso se encarga el script del `<head>`
 *    (ver `guionAntiParpadeo`), no este componente.
 * 2. **No sincronizar estado con un efecto.** La preferencia se lee con
 *    `useSyncExternalStore`, que es la herramienta de React para leer algo que
 *    vive fuera de React: da un valor distinto en servidor y en cliente sin
 *    mentirle a la hidratación, y sin el `setState` dentro de un efecto que la
 *    regla `react-hooks/set-state-in-effect` prohíbe en este repo.
 */

const EVENTO = 'helpdesk:tema';

interface ValorTema {
  preferencia: Preferencia;
  tema: Tema;
  setPreferencia: (preferencia: Preferencia) => void;
}

const TemaContext = createContext<ValorTema>({
  preferencia: 'system',
  tema: 'light',
  setPreferencia: () => {},
});

function suscribir(avisar: () => void) {
  const consulta = window.matchMedia('(prefers-color-scheme: dark)');
  consulta.addEventListener('change', avisar);
  window.addEventListener(EVENTO, avisar);
  // `storage` solo se dispara en las OTRAS pestañas: cambiar el tema en una
  // deja al resto en el mismo tema sin tener que recargar.
  window.addEventListener('storage', avisar);
  return () => {
    consulta.removeEventListener('change', avisar);
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener('storage', avisar);
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preferencia = useSyncExternalStore(
    suscribir,
    () => leerPreferencia(window.localStorage),
    () => 'system' as Preferencia,
  );

  const prefiereOscuro = useSyncExternalStore(
    suscribir,
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    () => false,
  );

  const tema = resolverTema(preferencia, prefiereOscuro);

  // Efecto de DOM, no de estado: el script del `<head>` ya dejó la clase puesta
  // en la primera pintura; esto solo la mantiene al día cuando cambia.
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.classList.toggle('dark', tema === 'dark');
    // Le dice al navegador de qué color pintar las barras de scroll y los
    // controles nativos. Sin esto, un `<select>` sale blanco en modo oscuro.
    raiz.style.colorScheme = tema;
  }, [tema]);

  function setPreferencia(nueva: Preferencia) {
    guardarPreferencia(window.localStorage, nueva);
    window.dispatchEvent(new Event(EVENTO));
  }

  return (
    <TemaContext.Provider value={{ preferencia, tema, setPreferencia }}>
      {children}
    </TemaContext.Provider>
  );
}

export function useTema(): ValorTema {
  return useContext(TemaContext);
}

/**
 * Se inyecta como `<script>` síncrono en el `<head>`: corre antes de que el
 * navegador pinte nada, así que quien tiene el modo oscuro puesto no ve un
 * fogonazo blanco en cada carga. Va en texto plano y no como módulo importado
 * justamente para que no espere a ningún bundle.
 */
export const guionAntiParpadeo = `(function(){try{var p=localStorage.getItem('helpdesk-theme');var o=p==='dark'||((!p||p==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',o);e.style.colorScheme=o?'dark':'light';}catch(_){}})();`;
