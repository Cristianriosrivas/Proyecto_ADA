import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const ruta = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Dos salidas con el mismo código: `dist/` normal y un único HTML que se abre con doble clic.
export default defineConfig(({ mode }) => {
  const unico = mode === 'unico';
  return {
    base: './',
    plugins: [react(), tailwindcss(), ...(unico ? [viteSingleFile({ removeViteModuleLoader: true })] : [])],
    resolve: {
      alias: {
        '@core': ruta('./src/core'),
        '@ui': ruta('./src/ui'),
        '@redes': ruta('./src/redes'),
      },
    },
    // El worker se incrusta como blob en el código (`?worker&inline`), así funciona también con file://
    worker: { format: 'es' },
    build: {
      outDir: unico ? 'dist-unico' : 'dist',
      emptyOutDir: true,
      target: 'es2022',
      chunkSizeWarningLimit: 4000,
      // Las fuentes locales van dentro del HTML en la versión de un solo archivo
      assetsInlineLimit: unico ? 100_000_000 : 4096,
    },
  };
});
