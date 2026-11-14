import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExceptionsList } from './exceptions-list';
import type { CalendarException } from '@/lib/api/types';

const EXCEPCIONES: CalendarException[] = [
  { id: 'a', date: '2026-12-25', working: false, name: 'Navidad' },
  { id: 'b', date: '2026-11-28', working: true, name: 'Cierre de mes' },
];

const montar = (extra: Partial<Parameters<typeof ExceptionsList>[0]> = {}) => {
  const props = {
    excepciones: EXCEPCIONES,
    anioActual: 2026,
    onAgregar: vi.fn().mockResolvedValue(undefined),
    onBorrar: vi.fn(),
    onCargarFeriados: vi.fn().mockResolvedValue({ added: 14, skipped: 2 }),
    ...extra,
  };
  render(<ExceptionsList {...props} />);
  return props;
};

describe('ExceptionsList (feriados y días especiales)', () => {
  it('muestra fecha, nombre y si es hábil o no', () => {
    montar();
    const navidad = screen.getByText('Navidad').closest('li')!;
    expect(navidad).toHaveTextContent('25/12/2026');
    expect(navidad).toHaveTextContent('no hábil');
    expect(screen.getByText('Cierre de mes').closest('li')).toHaveTextContent('hábil');
  });

  it('borrar confirma en la propia fila, sin diálogos del navegador', () => {
    const { onBorrar } = montar();
    const fila = screen.getByText('Navidad').closest('li')!;

    fireEvent.click(within(fila).getByRole('button', { name: 'Borrar' }));
    expect(onBorrar).not.toHaveBeenCalled();
    fireEvent.click(within(fila).getByRole('button', { name: 'Sí, borrar' }));

    expect(onBorrar).toHaveBeenCalledWith('a');
  });

  it('ofrece cargar los feriados del año actual y del siguiente, y dice cuántos entraron', async () => {
    const { onCargarFeriados } = montar();
    expect(screen.getByRole('button', { name: 'Agregar feriados nacionales 2027' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Agregar feriados nacionales 2026' }));

    expect(onCargarFeriados).toHaveBeenCalledWith(2026);
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Se agregaron 14 feriados (2 ya estaban)'),
    );
  });

  it('agrega una fecha nueva como no hábil por defecto', async () => {
    const { onAgregar } = montar();
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-12-31' } });
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Fin de año' } });

    fireEvent.click(screen.getByRole('button', { name: 'Agregar fecha' }));

    await waitFor(() =>
      expect(onAgregar).toHaveBeenCalledWith({ date: '2026-12-31', working: false, name: 'Fin de año' }),
    );
  });
});
