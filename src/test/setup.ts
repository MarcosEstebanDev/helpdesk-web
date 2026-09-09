import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Preparación común de los tests de cliente.
 *
 * El store de Zustand es un módulo con estado: sin limpiarlo, un test que hace
 * login deja al siguiente con sesión abierta y los fallos aparecen según el
 * orden en que corran, que es la peor clase de test frágil.
 */
beforeEach(() => {
  useAuthStore.getState().clear();
});

afterEach(() => {
  cleanup();
});
