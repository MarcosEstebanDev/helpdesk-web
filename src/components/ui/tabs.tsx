'use client';

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Pestañas, en el estilo de Atlassian: una fila con borde inferior y la activa
 * subrayada.
 *
 * **Se exportan componentes con nombre y NUNCA el namespace `TabsPrimitive`.**
 * Por la frontera servidor/cliente solo pueden cruzar componentes: un namespace
 * se convierte en una referencia opaca y leerle `.Root` devuelve `undefined`,
 * que revienta la aplicación entera con un "Element type is invalid" que no
 * dice dónde. Ya pasó una vez en este repo con el tooltip.
 */

export function Tabs({
  valor,
  onValorChange,
  children,
  className,
}: {
  valor: string;
  onValorChange: (valor: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <TabsPrimitive.Root
      value={valor}
      onValueChange={(nuevo) => onValorChange(String(nuevo))}
      className={cn('flex flex-col gap-4', className)}
    >
      {children}
    </TabsPrimitive.Root>
  );
}

export function TabsList({
  children,
  etiqueta,
}: {
  children: ReactNode;
  etiqueta: string;
}) {
  return (
    <TabsPrimitive.List
      aria-label={etiqueta}
      className="relative flex items-center gap-1 border-b border-border"
    >
      {children}
      <TabsPrimitive.Indicator className="absolute bottom-0 left-0 h-0.5 w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] bg-primary transition-[width,transform] duration-150" />
    </TabsPrimitive.List>
  );
}

export function TabsTab({
  valor,
  children,
}: {
  valor: string;
  children: ReactNode;
}) {
  return (
    <TabsPrimitive.Tab
      value={valor}
      className={cn(
        '-mb-px cursor-default rounded-t-md px-3 py-2 text-sm font-medium transition-colors',
        'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        'data-[selected]:text-foreground',
      )}
    >
      {children}
    </TabsPrimitive.Tab>
  );
}

export function TabsPanel({
  valor,
  keepMounted,
  children,
  ...props
}: ComponentProps<'div'> & {
  valor: string;
  keepMounted?: boolean;
  children: ReactNode;
}) {
  return (
    <TabsPrimitive.Panel value={valor} keepMounted={keepMounted} {...props}>
      {children}
    </TabsPrimitive.Panel>
  );
}
