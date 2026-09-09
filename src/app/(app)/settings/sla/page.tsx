'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Badge,
  Card,
  ErrorText,
  Input,
  Label,
} from '@/components/ui/primitives';
import { useSession } from '@/features/auth/session';
import * as slaApi from '@/features/sla/api';
import { ApiError } from '@/lib/api/client';
import { slaKeys } from '@/lib/query/keys';
import type { EffectiveSlaTarget, TicketPriority } from '@/lib/api/types';

/**
 * Configuración de SLA por prioridad.
 *
 * Se edita **una prioridad a la vez**, igual que la expone el backend: mandar
 * las cuatro obligaría a reenviar lo que no se está tocando, y dos
 * administradores editando prioridades distintas se pisarían sin enterarse.
 */
export default function SlaSettingsPage() {
  const { user } = useSession();
  const { data, isPending, isError, error } = useQuery({
    queryKey: slaKeys.policy,
    queryFn: slaApi.getSlaPolicy,
    // Un AGENT que llegue por la URL recibiría un 403; ni se intenta.
    enabled: user?.role === 'ADMIN',
  });

  if (user?.role !== 'ADMIN') {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Solo un administrador puede ver la política de SLA de la organización.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">SLA</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lo que la organización se compromete a cumplir, por prioridad. Los
          tickets ya abiertos conservan el objetivo con el que nacieron: cambiar
          esto solo afecta a los nuevos.
        </p>
      </div>

      {isPending ? (
        <p className="text-sm text-muted-foreground">Cargando política…</p>
      ) : isError ? (
        <ErrorText>
          {error instanceof ApiError
            ? error.message
            : 'No se pudo cargar la política.'}
        </ErrorText>
      ) : (
        <div className="space-y-3">
          {data.map((objetivo) => (
            <FilaPrioridad key={objetivo.priority} objetivo={objetivo} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilaPrioridad({ objetivo }: { objetivo: EffectiveSlaTarget }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [respuesta, setRespuesta] = useState(String(objetivo.responseMinutes));
  const [resolucion, setResolucion] = useState(
    String(objetivo.resolutionMinutes),
  );

  const alGuardar = {
    onSuccess: (politica: EffectiveSlaTarget[]) => {
      queryClient.setQueryData(slaKeys.policy, politica);
      setEditando(false);
    },
  };

  const guardar = useMutation({
    mutationFn: (input: {
      priority: TicketPriority;
      responseMinutes: number;
      resolutionMinutes: number;
    }) =>
      slaApi.updateSlaPolicy(input.priority, {
        responseMinutes: input.responseMinutes,
        resolutionMinutes: input.resolutionMinutes,
      }),
    ...alGuardar,
  });

  const restaurar = useMutation({
    mutationFn: () => slaApi.resetSlaPolicy(objetivo.priority),
    ...alGuardar,
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    guardar.mutate({
      priority: objetivo.priority,
      responseMinutes: Number(respuesta),
      resolutionMinutes: Number(resolucion),
    });
  }

  const errorApi = guardar.error ?? restaurar.error;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium">{objetivo.priority}</span>

        {/* `source` es el dato que evita tocar a ciegas: sin él no se distingue
            "esto lo pactamos" de "esto no lo tocó nadie". */}
        {objetivo.source === 'organization' ? (
          <Badge tone="info">Pactado</Badge>
        ) : (
          <Badge tone="neutral">De fábrica</Badge>
        )}

        {editando ? null : (
          <span className="text-sm text-muted-foreground">
            responder en {formatear(objetivo.responseMinutes)} · resolver en{' '}
            {formatear(objetivo.resolutionMinutes)}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {objetivo.source === 'organization' ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={restaurar.isPending}
              onClick={() => restaurar.mutate()}
            >
              Restaurar
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditando((v) => !v)}
          >
            {editando ? 'Cancelar' : 'Editar'}
          </Button>
        </div>
      </div>

      {editando ? (
        <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`resp-${objetivo.priority}`}>
              Respuesta (min)
            </Label>
            <Input
              id={`resp-${objetivo.priority}`}
              type="number"
              min={1}
              className="w-32"
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`reso-${objetivo.priority}`}>
              Resolución (min)
            </Label>
            <Input
              id={`reso-${objetivo.priority}`}
              type="number"
              min={1}
              className="w-32"
              value={resolucion}
              onChange={(e) => setResolucion(e.target.value)}
              required
            />
          </div>

          <Button type="submit" size="sm" disabled={guardar.isPending}>
            {guardar.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </form>
      ) : null}

      {/*
        La regla "no podés prometer resolver antes que responder" vive en el
        dominio del backend, no en este formulario: es una regla de negocio, y
        duplicarla aquí la desincronizaría en cuanto cambiara. Se muestra tal
        como llega.
      */}
      <ErrorText>
        {errorApi
          ? errorApi instanceof ApiError
            ? errorApi.message
            : 'No se pudo guardar el objetivo.'
          : null}
      </ErrorText>
    </Card>
  );
}

/** 240 -> "4 h". Los SLA se piensan en horas, no en minutos. */
function formatear(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}
