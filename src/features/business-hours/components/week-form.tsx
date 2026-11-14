'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorText, Input, Label, Select } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';
import type { BusinessHours, BusinessHoursInput } from '@/lib/api/types';

const DIAS = [
  [1, 'Lunes'],
  [2, 'Martes'],
  [3, 'Miércoles'],
  [4, 'Jueves'],
  [5, 'Viernes'],
  [6, 'Sábado'],
  [7, 'Domingo'],
] as const;

/** Las zonas más probables; la guardada se agrega si no está en la lista. */
const ZONAS = [
  'America/Argentina/Buenos_Aires',
  'America/Argentina/Cordoba',
  'America/Argentina/Mendoza',
  'America/Montevideo',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/Mexico_City',
  'America/Bogota',
  'Europe/Madrid',
];

/**
 * Semana tipo del horario laboral. La validación de acá es UX: el backend
 * repite las mismas reglas en el dominio y devuelve el error tal cual.
 *
 * En 24/7 los campos se deshabilitan pero NO se borran: la semana se conserva
 * para el día que se vuelva al horario laboral (decisión del diseño).
 */
export function WeekForm({
  inicial,
  guardando,
  onGuardar,
}: {
  inicial: BusinessHours;
  guardando: boolean;
  onGuardar: (input: BusinessHoursInput) => void;
}) {
  const [continuo, setContinuo] = useState(inicial.mode === '24_7');
  const [dias, setDias] = useState<number[]>(inicial.weekdays);
  const [abre, setAbre] = useState(inicial.opensAt);
  const [cierra, setCierra] = useState(inicial.closesAt);
  const [zona, setZona] = useState(inicial.timeZone);

  const problema =
    dias.length === 0
      ? 'Elegí al menos un día hábil.'
      : cierra <= abre
        ? 'El cierre tiene que ser después de la apertura.'
        : null;

  function alternarDia(dia: number) {
    setDias((actual) =>
      actual.includes(dia)
        ? actual.filter((d) => d !== dia)
        : [...actual, dia].sort((a, b) => a - b),
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (problema !== null) return;
    onGuardar({
      mode: continuo ? '24_7' : 'business_hours',
      timeZone: zona,
      weekdays: dias,
      opensAt: abre,
      closesAt: cierra,
    });
  }

  const zonas = ZONAS.includes(zona) ? ZONAS : [zona, ...ZONAS];

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Atención 24/7</p>
          <p className="text-xs text-muted-foreground">
            El SLA cuenta las 24 horas, todos los días. Usalo si hay guardia.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={continuo}
          aria-label="Atención 24/7"
          onClick={() => setContinuo((v) => !v)}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors',
            continuo ? 'bg-primary' : 'bg-muted',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'absolute top-0.5 size-4 rounded-full bg-background shadow transition-transform',
              continuo ? 'translate-x-4' : 'translate-x-0.5',
            )}
          />
        </button>
      </div>

      <fieldset disabled={continuo} className="space-y-4 disabled:opacity-60">
        <div className="space-y-1.5">
          <legend className="text-sm font-medium">Días hábiles</legend>
          <div className="flex flex-wrap gap-2">
            {DIAS.map(([dia, nombre]) => (
              <label
                key={dia}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm"
              >
                <input
                  type="checkbox"
                  checked={dias.includes(dia)}
                  onChange={() => alternarDia(dia)}
                />
                {nombre}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="abre">Abre</Label>
            <Input id="abre" type="time" value={abre} onChange={(e) => setAbre(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cierra">Cierra</Label>
            <Input id="cierra" type="time" value={cierra} onChange={(e) => setCierra(e.target.value)} />
          </div>
          <div className="min-w-60 flex-1 space-y-1.5">
            <Label htmlFor="zona">Zona horaria</Label>
            <Select id="zona" value={zona} onChange={(e) => setZona(e.target.value)}>
              {zonas.map((z) => (
                <option key={z} value={z}>
                  {z.replaceAll('_', ' ')}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </fieldset>

      {!continuo ? <ErrorText>{problema}</ErrorText> : null}

      <Button type="submit" disabled={guardando || (!continuo && problema !== null)}>
        {guardando ? 'Guardando…' : 'Guardar horario'}
      </Button>
    </form>
  );
}
