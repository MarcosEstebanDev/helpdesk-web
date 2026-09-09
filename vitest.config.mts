import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Vitest para los tests de cliente.
 *
 * Next trae su propio pipeline, pero no un runner de tests, así que esto es una
 * configuración aparte: `jsdom` para tener DOM, el plugin de React para el JSX y
 * el mismo alias `@/` que usa `tsconfig.json`, para que los imports de los tests
 * se escriban igual que los del código.
 *
 * Los ficheros de test viven JUNTO al código que prueban (`*.test.ts[x]`), como
 * en el backend: un test que hay que ir a buscar a otro árbol se actualiza menos.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Cada fichero con su entorno limpio: los tests tocan un store de Zustand
    // que es un módulo con estado, y compartirlo entre ficheros los acoplaría.
    restoreMocks: true,
  },
});
