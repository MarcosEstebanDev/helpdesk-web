import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WeekForm } from './week-form';
import type { BusinessHours } from '@/lib/api/types';

const INICIAL: BusinessHours = {
  mode: 'business_hours',
  timeZone: 'America/Argentina/Buenos_Aires',
  weekdays: [1, 2, 3, 4, 5],
  opensAt: '08:00',
  closesAt: '18:00',
  source: 'default',
  exceptions: [],
};

const montar = (onGuardar = vi.fn()) => {
  render(<WeekForm inicial={INICIAL} guardando={false} onGuardar={onGuardar} />);
  return onGuardar;
};

describe('WeekForm (horario laboral)', () => {
  it('manda la semana completa al guardar', () => {
    const onGuardar = montar();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sábado' }));
    fireEvent.change(screen.getByLabelText('Abre'), { target: { value: '09:00' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar horario' }));

    expect(onGuardar).toHaveBeenCalledWith({
      mode: 'business_hours',
      timeZone: 'America/Argentina/Buenos_Aires',
      weekdays: [1, 2, 3, 4, 5, 6],
      opensAt: '09:00',
      closesAt: '18:00',
    });
  });

  it('no deja guardar sin días hábiles', () => {
    const onGuardar = montar();
    for (const dia of ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']) {
      fireEvent.click(screen.getByRole('checkbox', { name: dia }));
    }
    expect(screen.getByText('Elegí al menos un día hábil.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar horario' })).toBeDisabled();
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it('no deja guardar si cierra antes de abrir', () => {
    montar();
    fireEvent.change(screen.getByLabelText('Cierra'), { target: { value: '07:00' } });
    expect(screen.getByText('El cierre tiene que ser después de la apertura.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar horario' })).toBeDisabled();
  });

  it('con atención 24/7 los campos quedan deshabilitados pero conservan su valor', () => {
    const onGuardar = montar();
    fireEvent.click(screen.getByRole('switch', { name: 'Atención 24/7' }));

    expect(screen.getByLabelText('Abre')).toBeDisabled();
    expect(screen.getByLabelText('Abre')).toHaveValue('08:00');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar horario' }));
    expect(onGuardar).toHaveBeenCalledWith(expect.objectContaining({ mode: '24_7', opensAt: '08:00' }));
  });
});
