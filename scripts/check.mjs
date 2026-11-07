// npm run check = typecheck + lint + tests + build. Se detiene en el primer paso que falle.
import { spawnSync } from 'node:child_process';

const pasos = [
  ['Typecheck', 'npm run typecheck --silent'],
  ['Lint', 'npm run lint --silent'],
  ['Pruebas con cobertura', 'npm run coverage --silent'],
  ['Build', 'npm run build --silent'],
];

for (const [nombre, comando] of pasos) {
  console.log(`\n=== ${nombre} ===`);
  const r = spawnSync(comando, { stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    console.error(`\nFalló: ${nombre}`);
    process.exit(r.status ?? 1);
  }
}
console.log('\nTodo en verde.');
