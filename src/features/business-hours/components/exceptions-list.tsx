'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';
import type { CalendarException } from '@/lib/api/types';

/** `2026-12-25` → `25/12/2026`. Es una fecha LOCAL: no pasa por `Date`. */
const fechaLegible = (iso: string): string => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * Feriados y días especiales: fechas que pisan la semana tipo. Un feriado es
 * "no hábil" aunque caiga martes; un sábado de cierre de mes puede ser "hábil".
 *
 * Borrar confirma en la propia fila (estado del componente, nunca `confirm()`).
 */
export function ExceptionsList({
  excepciones,
  anioActual,
  onAgregar,
  onBorrar,
  onCargarFeriados,
}: {
  excepciones: CalendarException[];
  anioActual: number;
  onAgregar: (input: Omit<CalendarException, 'id'>) => Promise<unknown>;
  onBorrar: (id: string) => void;
  onCargarFeriados: (anio: number) => Promise<{ added: number; skipped: number }>;
}) {
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [fecha, setFecha] = useState('');
  const [nombre, setNombre] = useState('');
  const [habil, setHabil] = useState(false);

  async function cargar(anio: number) {
    const r = await onCargarFeriados(anio);
    setResultado(`Se agregaron ${r.added} feriados (${r.skipped} ya estaban).`);
  }

  async function agregar(e: FormEvent) {
    e.preventDefault();
    if (fecha === '' || nombre.trim() === '') return;
    await onAgregar({ date: fecha, working: habil, name: nombre.trim() });
    setFecha('');
    setNombre('');
    setHabil(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[anioActual, anioActual + 1].map((anio) => (
          <Button key={anio} type="button" variant="outline" size="sm" onClick={() => void cargar(anio)}>
            Agregar feriados nacionales {anio}
          </Button>
        ))}
        {resultado !== null ? (
          <p role="status" className="text-xs text-muted-foreground">
            {resultado}
          </p>
        ) : null}
      </div>

      {excepciones.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay fechas cargadas. Los feriados nacionales se agregan con los botones de arriba.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {excepciones.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <span className="w-24 font-mono text-xs text-muted-foreground">{fechaLegible(e.date)}</span>
              <span className="min-w-0 flex-1 truncate">{e.name}</span>
              <span
                className={cn(
                  'text-xs',
                  e.working ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {e.working ? 'hábil' : 'no hábil'}
              </span>
              {confirmando === e.id ? (
                <span className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      onBorrar(e.id);
                      setConfirmando(null);
                    }}
                  >
                    Sí, borrar
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmando(null)}>
                    No
                  </Button>
                </span>
              ) : (
                <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmando(e.id)}>
                  Borrar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(e) => void agregar(e)} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="excepcion-fecha">Fecha</Label>
          <Input id="excepcion-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="min-w-48 flex-1 space-y-1.5">
          <Label htmlFor="excepcion-nombre">Nombre</Label>
          <Input
            id="excepcion-nombre"
            value={nombre}
            maxLength={120}
            placeholder="Ej.: Aniversario de la empresa"
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="excepcion-tipo">Tipo</Label>
          <Select
            id="excepcion-tipo"
            value={habil ? 'habil' : 'no-habil'}
            onChange={(e) => setHabil(e.target.value === 'habil')}
          >
            <option value="no-habil">No hábil (feriado)</option>
            <option value="habil">Hábil (día extra)</option>
          </Select>
        </div>
        <Button type="submit" variant="outline" disabled={fecha === '' || nombre.trim() === ''}>
          Agregar fecha
        </Button>
      </form>
    </div>
  );
}
