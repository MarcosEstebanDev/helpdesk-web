'use client';

import { Menu } from '@base-ui/react/menu';
import { Check, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TagLozenge } from '@/features/tags/components/tag-lozenge';
import { useTags } from '@/features/tags/queries';
import { cn } from '@/lib/utils';

/**
 * Filtro de la bandeja por etiquetas: "tiene al menos una de" (ADR-0031). Solo
 * lo monta el equipo. Un menú con casillas que NO se cierra al marcar, porque
 * lo normal es elegir más de una.
 */
export function TagFilter({
  seleccion,
  onChange,
}: {
  seleccion: string[];
  onChange: (ids: string[]) => void;
}) {
  const catalogo = useTags(true);
  const tags = catalogo.data?.items ?? [];
  // Una etiqueta elegida que después se borró ya no filtra nada: no se cuenta.
  // Mientras el catálogo carga no se sabe, así que se cuenta lo elegido.
  const activas =
    catalogo.data === undefined
      ? seleccion.length
      : seleccion.filter((id) => tags.some((t) => t.id === id)).length;

  function alternar(id: string, marcada: boolean) {
    onChange(marcada ? [...seleccion, id] : seleccion.filter((s) => s !== id));
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <Button
            variant="outline"
            aria-pressed={activas > 0}
            className={cn(activas > 0 && 'border-primary bg-accent text-accent-foreground')}
          />
        }
      >
        <Tags />
        {activas > 0 ? `Etiquetas (${activas})` : 'Etiquetas'}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={4} align="start">
          <Menu.Popup className="z-50 max-h-80 min-w-48 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
            {tags.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                {catalogo.isPending ? 'Cargando…' : 'Todavía no hay etiquetas.'}
              </p>
            ) : (
              tags.map((tag) => (
                <Menu.CheckboxItem
                  key={tag.id}
                  closeOnClick={false}
                  checked={seleccion.includes(tag.id)}
                  onCheckedChange={(marcada) => alternar(tag.id, marcada)}
                  className="flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent"
                >
                  <span className="flex size-4 items-center justify-center">
                    <Menu.CheckboxItemIndicator>
                      <Check className="size-3.5" />
                    </Menu.CheckboxItemIndicator>
                  </span>
                  <TagLozenge tag={tag} />
                </Menu.CheckboxItem>
              ))
            )}
            {activas > 0 ? (
              <Menu.Item
                onClick={() => onChange([])}
                className="mt-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground outline-none data-[highlighted]:bg-accent"
              >
                Quitar el filtro
              </Menu.Item>
            ) : null}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
