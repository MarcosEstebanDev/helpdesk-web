import { cn } from '@/lib/utils';
import type { Tag, TagColor } from '@/lib/api/types';

/**
 * Tono de cada color de la paleta (ADR-0031 del backend), en claro y oscuro.
 * La paleta tiene nombres y no hex justamente para esto: el tono legible en
 * cada tema lo decide esta tabla, no quien creó la etiqueta.
 */
const CLASES: Record<TagColor, string> = {
  gray: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
  red: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
  green: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  teal: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
};

/** Un color que este front no conoce (backend más nuevo) se pinta gris. */
export function clasesDeColor(color: TagColor): string {
  return CLASES[color] ?? CLASES.gray;
}

export function TagLozenge({
  tag,
  className,
  children,
}: {
  tag: Tag;
  className?: string;
  /** Algo al final, como el botón para quitarla. */
  children?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] leading-4 font-medium',
        clasesDeColor(tag.color),
        className,
      )}
    >
      <span className="truncate">{tag.name}</span>
      {children}
    </span>
  );
}
