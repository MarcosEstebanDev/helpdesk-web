'use client';

import { Card, ErrorText, Skeleton } from '@/components/ui/primitives';
import { useAvisos } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session';
import { ExceptionsList } from '@/features/business-hours/components/exceptions-list';
import { WeekForm } from '@/features/business-hours/components/week-form';
import {
  useAddCalendarException,
  useBusinessHours,
  useLoadNationalHolidays,
  useRemoveCalendarException,
  useUpdateBusinessHours,
} from '@/features/business-hours/queries';
import { ApiError } from '@/lib/api/client';

const mensaje = (e: unknown, porDefecto: string) =>
  e instanceof ApiError ? e.message : porDefecto;

/**
 * Configuración → Horario (ADR-0034 del backend). Solo ADMIN: el horario
 * decide cuándo vence cada SLA. Cambiarlo NO recalcula los relojes que ya
 * están corriendo; aplica desde ahora.
 */
export default function HorarioPage() {
  const { user } = useSession();
  const esAdmin = user?.role === 'ADMIN';
  const avisos = useAvisos();
  const horario = useBusinessHours(esAdmin);
  const guardar = useUpdateBusinessHours();
  const agregar = useAddCalendarException();
  const borrar = useRemoveCalendarException();
  const feriados = useLoadNationalHolidays();

  if (!esAdmin) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Solo un administrador puede editar el horario laboral.
      </Card>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="max-w-prose">
        <h1 className="text-xl font-semibold tracking-tight">Horario laboral</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          El SLA solo cuenta dentro de este horario: un ticket que entra el
          viernes a la noche empieza a correr el lunes cuando abre la oficina.
          Los cambios aplican a lo que venga; los relojes en marcha no se
          recalculan.
        </p>
      </div>

      {horario.isPending ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : horario.isError ? (
        <Card className="p-4">
          <ErrorText>{mensaje(horario.error, 'No se pudo cargar el horario.')}</ErrorText>
        </Card>
      ) : (
        <>
          <Card className="space-y-2 p-4">
            <h2 className="text-sm font-semibold">Semana</h2>
            {horario.data.source === 'default' ? (
              <p className="text-xs text-muted-foreground">
                Es el horario por defecto: todavía nadie lo cambió.
              </p>
            ) : null}
            <WeekForm
              // Al guardar llega la versión nueva: remontar el formulario
              // reinicia sus campos sin sincronizar estado con un efecto.
              key={JSON.stringify([horario.data.mode, horario.data.weekdays, horario.data.opensAt, horario.data.closesAt, horario.data.timeZone])}
              inicial={horario.data}
              guardando={guardar.isPending}
              onGuardar={(input) =>
                guardar.mutate(input, {
                  onSuccess: () => avisos.exito('Horario guardado'),
                  onError: (e) => avisos.error('No se pudo guardar el horario', mensaje(e, '')),
                })
              }
            />
          </Card>

          <Card className="space-y-3 p-4">
            <h2 className="text-sm font-semibold">Feriados y días especiales</h2>
            <ExceptionsList
              excepciones={horario.data.exceptions}
              anioActual={new Date().getFullYear()}
              onAgregar={(input) =>
                agregar.mutateAsync(input).catch((e: unknown) => {
                  avisos.error('No se pudo agregar la fecha', mensaje(e, ''));
                })
              }
              onBorrar={(id) =>
                borrar.mutate(id, {
                  onError: (e) => avisos.error('No se pudo borrar la fecha', mensaje(e, '')),
                })
              }
              onCargarFeriados={(anio) =>
                feriados.mutateAsync(anio).catch((e: unknown) => {
                  avisos.error('No se pudieron cargar los feriados', mensaje(e, ''));
                  return { added: 0, skipped: 0 };
                })
              }
            />
          </Card>
        </>
      )}
    </div>
  );
}
