import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const ruta = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@core': ruta('./src/core'),
      '@ui': ruta('./src/ui'),
      '@redes': ruta('./src/redes'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 60_000,
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts'],
      exclude: ['src/core/**/tipos.ts'],
      reporter: ['text-summary', 'json-summary'],
      thresholds: { lines: 90, functions: 90, statements: 90, branches: 85 },
    },
  },
});
