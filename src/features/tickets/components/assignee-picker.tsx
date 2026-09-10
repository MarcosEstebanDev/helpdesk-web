'use client';

import { Menu } from '@base-ui/react/menu';
import { Check, ChevronDown, UserX } from 'lucide-react';
import { Avatar, Lozenge, Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { useAvisos } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session';
import { etiquetaDe, type Directorio } from '@/features/members/directory';
import { useMembers } from '@/features/members/queries';
import { useAssignment } from '@/features/tickets/queries';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { Member, TicketDetail } from '@/lib/api/types';

/**
 * Selector de a quién se le asigna el ticket.
 *
 * Cada persona se lista **con su rol al lado**, y no es decoración. El backend
 * tiene una asimetría conocida: el reparto automático elige solo entre AGENT y
 * ADMIN, pero la asignación manual acepta a cualquier miembro — solo comprueba
 * que pertenezca a la organización, no su rango. Mientras la única acción era
 * "Asignármelo" eso no se notaba; con una lista de personas en pantalla, un
 * administrador puede asignarle un ticket al cliente que lo abrió sin querer.
 *
 * Se decidió NO endurecer la regla en el backend por ahora —es un cambio de
 * negocio con su propio diseño— y mitigarlo acá: mostrando el rol, la persona
 * que asigna ve lo que está haciendo. La interfaz no lo impide; lo hace visible.
 */
export function AssigneePicker({
  ticket,
  directorio,
}: {
  ticket: TicketDetail;
  directorio: Directorio;
}) {
  const { user } = useSession();
  const avisos = useAvisos();
  const { asignar, desasignar } = useAssignment(ticket.id);

  // La lista solo se pide cuando hay sesión de agente; un VIEWER no llega acá.
  const { data, isPending, isError } = useMembers(user !== null);
  const miembros = data?.items ?? [];

  const asignado = ticket.assigneeId === null ? null : directorio(ticket.assigneeId);
  const trabajando = asignar.isPending || desasignar.isPending;

  function alFallar(accion: string) {
    return (e: unknown) =>
      avisos.error(accion, e instanceof ApiError ? e.message : undefined);
  }

  function asignarA(miembro: Member) {
    asignar.mutate(miembro.userId, {
      onSuccess: () =>
        avisos.exito(
          miembro.userId === user?.id
            ? 'El ticket es tuyo'
            : `Asignado a ${etiquetaDe(miembro)}`,
        ),
      onError: alFallar('No se pudo asignar'),
    });
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={trabajando}
        render={
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between gap-2"
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          {ticket.assigneeId === null ? (
            <span className="text-muted-foreground">Sin asignar</span>
          ) : (
            <>
              <Avatar
                variante={ticket.assigneeId === user?.id ? 'vos' : 'otro'}
                aria-hidden
                className="size-5"
              />
              <span className="truncate">{textoDelAsignado(ticket, user?.id, asignado)}</span>
            </>
          )}
        </span>
        <ChevronDown />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={4} align="start">
          <Menu.Popup className="z-50 max-h-72 min-w-56 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
            {isPending ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : isError ? (
              <p className="p-2 text-xs text-muted-foreground">
                No se pudo cargar la lista de personas.
              </p>
            ) : (
              miembros.map((miembro) => (
                <Menu.Item
                  key={miembro.userId}
                  onClick={() => asignarA(miembro)}
                  className="flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                >
                  <Check
                    className={cn(
                      'size-3.5 shrink-0',
                      miembro.userId === ticket.assigneeId
                        ? 'opacity-100'
                        : 'opacity-0',
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {etiquetaDe(miembro)}
                    {miembro.userId === user?.id ? ' (vos)' : ''}
                  </span>
                  {/* El rol, a la vista: ver el comentario de arriba. */}
                  <Lozenge tone={miembro.role === 'VIEWER' ? 'warning' : 'neutral'}>
                    {miembro.role}
                  </Lozenge>
                </Menu.Item>
              ))
            )}

            {ticket.assigneeId !== null ? (
              <Menu.Item
                onClick={() =>
                  desasignar.mutate(undefined, {
                    onSuccess: () => avisos.exito('Asignación quitada'),
                    onError: alFallar('No se pudo quitar la asignación'),
                  })
                }
                className="mt-1 flex cursor-default items-center gap-2 rounded-md border-t border-border px-2 py-1.5 text-sm text-muted-foreground outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
              >
                <UserX className="size-3.5" aria-hidden />
                Quitar asignación
              </Menu.Item>
            ) : null}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/**
 * Qué decir del asignado actual.
 *
 * El directorio puede no tenerlo: alguien que se dio de baja sigue figurando
 * como asignado en un ticket viejo. En ese caso se dice lo que sí se sabe —que
 * es otra persona— en vez de inventar una etiqueta.
 */
function textoDelAsignado(
  ticket: TicketDetail,
  miId: string | undefined,
  asignado: Member | null,
): string {
  if (miId !== undefined && ticket.assigneeId === miId) return 'Vos';
  if (asignado !== null) return etiquetaDe(asignado);
  return 'Otra persona';
}
