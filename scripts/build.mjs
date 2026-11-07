// Genera dist/ y, con el mismo código, el archivo único GestorRutas.html que abre con doble clic y sin servidor.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, rmSync, statSync } from 'node:fs';

const correr = (comando) => {
  const r = spawnSync(comando, { stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

correr('npx vite build');
correr('npx vite build --mode unico');

const origen = 'dist-unico/index.html';
if (!existsSync(origen)) {
  console.error('No se generó dist-unico/index.html');
  process.exit(1);
}
copyFileSync(origen, 'GestorRutas.html');
rmSync('dist-unico', { recursive: true, force: true });
console.log(`GestorRutas.html: ${(statSync('GestorRutas.html').size / 1024 / 1024).toFixed(2)} MB`);
