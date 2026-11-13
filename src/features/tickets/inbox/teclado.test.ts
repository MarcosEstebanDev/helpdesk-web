import { describe, expect, it } from 'vitest';
import { debeIgnorarTecla, siguienteIndice } from './teclado';

const evento = (target: EventTarget, extra: Partial<KeyboardEvent> = {}) =>
  ({ key: 'j', target, ctrlKey: false, metaKey: false, altKey: false, ...extra }) as KeyboardEvent;

describe('debeIgnorarTecla', () => {
  it('ignora las teclas mientras se escribe en un campo', () => {
    for (const tag of ['input', 'textarea', 'select']) {
      expect(debeIgnorarTecla(evento(document.createElement(tag)))).toBe(true);
    }
  });

  it('ignora lo editable aunque no sea un input', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    // jsdom no implementa isContentEditable: se fuerza para el test.
    Object.defineProperty(div, 'isContentEditable', { value: true });
    expect(debeIgnorarTecla(evento(div))).toBe(true);
  });

  it('ignora con modificadores (Ctrl+K y compañía son de otros)', () => {
    expect(debeIgnorarTecla(evento(document.body, { ctrlKey: true }))).toBe(true);
    expect(debeIgnorarTecla(evento(document.body, { metaKey: true }))).toBe(true);
  });

  it('ignora lo que pasa dentro de un diálogo', () => {
    const dialogo = document.createElement('div');
    dialogo.setAttribute('role', 'dialog');
    const boton = document.createElement('button');
    dialogo.append(boton);
    expect(debeIgnorarTecla(evento(boton))).toBe(true);
  });

  it('atiende la tecla sobre la página o sobre una fila', () => {
    expect(debeIgnorarTecla(evento(document.body))).toBe(false);
    expect(debeIgnorarTecla(evento(document.createElement('a')))).toBe(false);
  });
});

describe('siguienteIndice', () => {
  it('j sin nada elegido va a la primera fila', () => {
    expect(siguienteIndice(-1, 'j', 5)).toBe(0);
  });

  it('j baja y k sube', () => {
    expect(siguienteIndice(2, 'j', 5)).toBe(3);
    expect(siguienteIndice(2, 'k', 5)).toBe(1);
  });

  it('no se sale de la lista por ningún extremo', () => {
    expect(siguienteIndice(4, 'j', 5)).toBe(4);
    expect(siguienteIndice(0, 'k', 5)).toBe(0);
  });

  it('otras teclas o una lista vacía no mueven nada', () => {
    expect(siguienteIndice(1, 'x', 5)).toBeNull();
    expect(siguienteIndice(-1, 'j', 0)).toBeNull();
  });
});
