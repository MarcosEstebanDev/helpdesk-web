import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CannedResponsePicker, insertAtCursor } from './canned-response-picker';
import type { CannedResponse } from '@/lib/api/types';

const plantilla = (id: string, title: string): CannedResponse => ({
  id,
  title,
  body: `Cuerpo de ${title}`,
  createdAt: '2026-11-12T10:00:00.000Z',
  updatedAt: '2026-11-12T10:00:00.000Z',
});

describe('insertAtCursor', () => {
  it('inserta en el cursor sin perder lo escrito', () => {
    expect(insertAtCursor('Hola  chau', 'X', 5, 5)).toEqual({
      text: 'Hola X chau',
      cursor: 6,
    });
  });

  it('con una selección reemplaza solo lo seleccionado', () => {
    expect(insertAtCursor('Hola mundo', 'Ana', 5, 10)).toEqual({
      text: 'Hola Ana',
      cursor: 8,
    });
  });

  it('con el editor vacío deja el texto tal cual', () => {
    expect(insertAtCursor('', 'Saludo', 0, 0)).toEqual({
      text: 'Saludo',
      cursor: 6,
    });
  });
});

describe('CannedResponsePicker', () => {
  const plantillas = [plantilla('1', 'Saludo inicial'), plantilla('2', 'Cierre')];

  it('filtra por título sin distinguir mayúsculas', async () => {
    render(
      <CannedResponsePicker
        abierto
        onAbiertoChange={() => {}}
        respuestas={plantillas}
        cargando={false}
        onElegir={() => {}}
      />,
    );

    await userEvent.type(screen.getByLabelText('Buscar respuesta'), 'SALU');

    expect(screen.getByRole('button', { name: /Saludo inicial/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cierre/ })).toBeNull();
  });

  it('elegir una avisa con la plantilla', async () => {
    const onElegir = vi.fn();
    render(
      <CannedResponsePicker
        abierto
        onAbiertoChange={() => {}}
        respuestas={plantillas}
        cargando={false}
        onElegir={onElegir}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Cierre/ }));

    expect(onElegir).toHaveBeenCalledWith(plantillas[1]);
  });

  it('sin plantillas dice que no hay y quién las crea', () => {
    render(
      <CannedResponsePicker
        abierto
        onAbiertoChange={() => {}}
        respuestas={[]}
        cargando={false}
        onElegir={() => {}}
      />,
    );

    expect(screen.getByText(/Todavía no hay respuestas predefinidas/)).toBeInTheDocument();
  });

  it('si la carga falla dice que falló, no que no hay respuestas', () => {
    render(
      <CannedResponsePicker
        abierto
        onAbiertoChange={() => {}}
        respuestas={undefined}
        cargando={false}
        error
        onElegir={() => {}}
      />,
    );

    expect(screen.getByText(/No se pudieron cargar/)).toBeInTheDocument();
    expect(screen.queryByText(/Todavía no hay respuestas/)).toBeNull();
  });
});

