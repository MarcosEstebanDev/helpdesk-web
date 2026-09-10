'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  ErrorText,
  Input,
  Label,
  Lozenge,
  Skeleton,
} from '@/components/ui/primitives';
import { useAvisos } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session';
import * as slaApi from '@/features/sla/api';
import { ApiError } from '@/lib/api/client';
import { slaKeys } from '@/lib/query/keys';
import type { EffectiveSlaTarget, TicketPriority } from '@/lib/api/types';

const PRIORIDAD_TEXTO: Record<TicketPriority, string> = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

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
    <div className="space-y-5">
      <div className="max-w-prose">
        <h1 className="text-xl font-semibold tracking-tight">SLA</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Lo que la organización se compromete a cumplir, por prioridad. Los
          tickets ya abiertos conservan el objetivo con el que nacieron: cambiar
          esto solo afecta a los nuevos.
        </p>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((fila) => (
            <Skeleton key={fila} className="h-14 w-full rounded-lg" />
          ))}
          <span className="sr-only" role="status">
            Cargando la política de SLA
          </span>
        </div>
      ) : isError ? (
        <Card className="p-4">
          <ErrorText>
            {error instanceof ApiError
              ? error.message
              : 'No se pudo cargar la política.'}
          </ErrorText>
        </Card>
      ) : (
        <div className="space-y-2">
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
  const avisos = useAvisos();
  const [editando, setEditando] = useState(false);
  const [respuesta, setRespuesta] = useState(String(objetivo.responseMinutes));
  const [resolucion, setResolucion] = useState(
    String(objetivo.resolutionMinutes),
  );

  /** La API devuelve la política entera ya efectiva: se planta en la caché en
      vez de invalidar y volver a pedirla. */
  function aplicar(politica: EffectiveSlaTarget[]) {
    queryClient.setQueryData(slaKeys.policy, politica);
    setEditando(false);
  }

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
    onSuccess: (politica: EffectiveSlaTarget[]) => {
      aplicar(politica);
      avisos.exito(
        `Objetivo guardado para prioridad ${PRIORIDAD_TEXTO[objetivo.priority].toLowerCase()}`,
      );
    },
  });

  const restaurar = useMutation({
    mutationFn: () => slaApi.resetSlaPolicy(objetivo.priority),
    onSuccess: (politica: EffectiveSlaTarget[]) => {
      aplicar(politica);
      avisos.exito('Objetivo restaurado al valor de fábrica');
    },
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
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="w-16 shrink-0 text-sm font-semibold">
          {PRIORIDAD_TEXTO[objetivo.priority]}
        </span>

        {/* `source` es el dato que evita tocar a ciegas: sin él no se distingue
            "esto lo pactamos" de "esto no lo tocó nadie". */}
        {objetivo.source === 'organization' ? (
          <Lozenge tone="info">Pactado</Lozenge>
        ) : (
          <Lozenge tone="neutral">De fábrica</Lozenge>
        )}

        {editando ? null : (
          <span className="text-sm text-muted-foreground">
            responder en {formatear(objetivo.responseMinutes)} · resolver en{' '}
            {formatear(objetivo.resolutionMinutes)}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
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
        <form
          onSubmit={onSubmit}
          className="mt-3 flex flex-wrap items-end gap-3 border-t border-border pt-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor={`resp-${objetivo.priority}`}>Respuesta (min)</Label>
            <Input
              id={`resp-${objetivo.priority}`}
              type="number"
              min={1}
              className="w-28"
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`reso-${objetivo.priority}`}>Resolución (min)</Label>
            <Input
              id={`reso-${objetivo.priority}`}
              type="number"
              min={1}
              className="w-28"
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
      {errorApi ? (
        <div className="mt-2">
          <ErrorText>
            {errorApi instanceof ApiError
              ? errorApi.message
              : 'No se pudo guardar el objetivo.'}
          </ErrorText>
        </div>
      ) : null}
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
