'use client';

import { BookmarkPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorText, Input, Label } from '@/components/ui/primitives';
import { useAvisos } from '@/components/ui/toast';
import {
  type EstadoDeBandeja,
  estadoAFiltrosDeVista,
  filtrosDeVistaAEstado,
  mismoEstado,
} from '@/features/views/mapping';
import { useCreateView, useDeleteView, useUpdateView } from '@/features/views/queries';
import { ApiError } from '@/lib/api/client';
import type { SavedView } from '@/lib/api/types';

const mensaje = (e: unknown): string => {
  if (e instanceof ApiError) {
    if (e.code === 'ticketing.duplicate_saved_view_name') {
      return 'Ya hay una vista con ese nombre.';
    }
    return e.message;
  }
  return 'No se pudo guardar la vista.';
};

/**
 * Guardar, actualizar y borrar vistas desde la bandeja (ADR-0033 del backend).
 * Solo para el equipo. Una compartida solo la cambia un ADMIN; la personal,
 * su dueño (las ajenas ni llegan: el backend no las devuelve).
 */
export function ControlesDeVista({
  vista,
  estado,
  esAdmin,
}: {
  /** La vista abierta, o `null` si se está mirando la bandeja sin vista. */
  vista: SavedView | null;
  /** Los filtros que la bandeja tiene puestos ahora. */
  estado: EstadoDeBandeja;
  esAdmin: boolean;
}) {
  const router = useRouter();
  const avisos = useAvisos();
  const actualizar = useUpdateView();
  const borrar = useDeleteView();
  const [guardando, setGuardando] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);

  const hayFiltros = Object.keys(estadoAFiltrosDeVista(estado)).length > 1;
  const puedeEditar = vista !== null && (!vista.shared || esAdmin);
  const cambio =
    vista !== null && !mismoEstado(estado, filtrosDeVistaAEstado(vista.filters));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {puedeEditar && cambio ? (
        <Button
          variant="outline"
          size="sm"
          disabled={actualizar.isPending}
          onClick={() =>
            actualizar.mutate(
              { id: vista.id, name: vista.name, filters: estadoAFiltrosDeVista(estado) },
              {
                onSuccess: () => avisos.exito('Vista actualizada'),
                onError: (e) => avisos.error('No se pudo actualizar', mensaje(e)),
              },
            )
          }
        >
          Actualizar vista
        </Button>
      ) : null}

      {puedeEditar ? (
        confirmandoBorrado ? (
          <span className="flex items-center gap-1">
            <Button
              variant="destructive"
              size="sm"
              disabled={borrar.isPending}
              onClick={() =>
                borrar.mutate(vista.id, {
                  onSuccess: () => {
                    avisos.exito('Vista borrada');
                    router.push('/tickets');
                  },
                  onError: (e) => avisos.error('No se pudo borrar', mensaje(e)),
                  onSettled: () => setConfirmandoBorrado(false),
                })
              }
            >
              Sí, borrar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmandoBorrado(false)}>
              Cancelar
            </Button>
          </span>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmandoBorrado(true)}>
            Borrar vista
          </Button>
        )
      ) : null}

      {hayFiltros ? (
        <Button variant="outline" size="sm" onClick={() => setGuardando(true)}>
          <BookmarkPlus />
          Guardar vista
        </Button>
      ) : null}

      <Dialog
        abierto={guardando}
        onAbiertoChange={setGuardando}
        titulo="Guardar vista"
        descripcion="Guarda los filtros de ahora para volver a ellos desde la barra lateral."
      >
        <NuevaVista
          estado={estado}
          esAdmin={esAdmin}
          onListo={(id) => {
            setGuardando(false);
            router.push(`/tickets?vista=${id}`);
          }}
        />
      </Dialog>
    </div>
  );
}

function NuevaVista({
  estado,
  esAdmin,
  onListo,
}: {
  estado: EstadoDeBandeja;
  esAdmin: boolean;
  onListo: (id: string) => void;
}) {
  const crear = useCreateView();
  const avisos = useAvisos();
  const [nombre, setNombre] = useState('');
  const [compartida, setCompartida] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFallo(null);
    crear.mutate(
      { name: nombre, filters: estadoAFiltrosDeVista(estado), shared: compartida },
      {
        onSuccess: (vista) => {
          avisos.exito('Vista guardada');
          onListo(vista.id);
        },
        onError: (err) => setFallo(mensaje(err)),
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="vista-nombre">Nombre de la vista</Label>
        <Input
          id="vista-nombre"
          value={nombre}
          maxLength={60}
          onChange={(e) => setNombre(e.target.value)}
          required
          autoFocus
        />
      </div>
      {/* Solo un ADMIN comparte (decisión 10): a un agente ni se le ofrece. */}
      {esAdmin ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={compartida}
            onChange={(e) => setCompartida(e.target.checked)}
          />
          Compartir con el equipo
        </label>
      ) : null}
      {fallo !== null ? <ErrorText>{fallo}</ErrorText> : null}
      <div className="flex justify-end gap-2">
        <Button type="submit" size="sm" disabled={crear.isPending || nombre.trim() === ''}>
          {crear.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}
