import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, User } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Primitivos de UI, en el vocabulario del Atlassian Design System.
 *
 * Se escriben a mano en vez de tirar de `shadcn add` porque son elementos
 * triviales y así el repo no depende de una herramienta interactiva para
 * compilar. Los tokens (`--primary`, `--success`, …) viven en `globals.css`.
 */

/** Campos de ADS: 32px de alto, fondo apenas hundido, foco por borde y no por halo. */
const campo = cn(
  'w-full rounded-md border border-input bg-background text-sm text-foreground outline-none transition-colors',
  'placeholder:text-muted-foreground',
  'hover:bg-muted/60',
  'focus-visible:border-primary focus-visible:bg-card focus-visible:ring-1 focus-visible:ring-primary',
  'disabled:pointer-events-none disabled:opacity-50',
  'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-destructive',
);

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(campo, 'h-8 px-2.5', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(campo, 'px-2.5 py-2', className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(campo, 'h-8 w-auto px-2', className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return (
    <label
      className={cn('text-xs font-semibold text-muted-foreground', className)}
      {...props}
    />
  );
}

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card text-card-foreground',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Lozenge: la etiqueta de estado de Atlassian. Pequeña, en mayúsculas y con
 * fondo pastel.
 *
 * `closed` se distingue por **forma** y no por color: es un contorno sin
 * relleno. Con cinco estados en la misma bandeja, agregar un quinto tono
 * significaría que ninguno destaca; cambiar la forma sí se lee de un vistazo.
 */
const lozengeVariants = cva(
  'inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] leading-4 font-bold tracking-[0.02em] uppercase whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-muted-foreground',
        info: 'bg-info text-info-foreground',
        progress: 'bg-progress text-progress-foreground',
        warning: 'bg-warning text-warning-foreground',
        danger: 'bg-danger text-danger-foreground',
        success: 'bg-success text-success-foreground',
        closed: 'border border-border bg-transparent text-muted-foreground',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export function Lozenge({
  className,
  tone,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof lozengeVariants>) {
  return (
    <span className={cn(lozengeVariants({ tone }), className)} {...props} />
  );
}

/** Bloque gris que ocupa el sitio de algo que todavía está cargando. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-sm bg-muted', className)}
      {...props}
    />
  );
}

/**
 * Avatar de una persona.
 *
 * El backend no expone ningún endpoint de miembros: de un comentario solo llega
 * un `authorId`, así que **no hay nombres ni iniciales que mostrar**. En vez de
 * inventar unas, el avatar dice lo único que se sabe de verdad — si sos vos o
 * es otra persona— y el rol va al lado en texto.
 */
export function Avatar({
  variante,
  className,
  ...props
}: ComponentProps<'span'> & { variante: 'vos' | 'otro' }) {
  return (
    <span
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
        variante === 'vos'
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground',
        className,
      )}
      {...props}
    >
      {variante === 'vos' ? 'Vos' : <User className="size-3.5" aria-hidden />}
    </span>
  );
}

/** Mensaje de error de formulario o de la API. */
export function ErrorText({ children }: { children: React.ReactNode }) {
  if (children === null || children === undefined || children === false) {
    return null;
  }
  return (
    <p
      role="alert"
      className="flex items-start gap-1.5 text-xs font-medium text-destructive"
    >
      <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
