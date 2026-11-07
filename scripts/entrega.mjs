// npm run entrega: genera el .zip con la estructura que pide el proyecto.
import { createWriteStream, existsSync, readFileSync, statSync } from 'node:fs';
import archiver from 'archiver';

const config = JSON.parse(readFileSync('proyecto.config.json', 'utf8'));
const apellidos = config.integrantes
  .map((p) => p.apellidos.split(' ')[0])
  .filter((a) => !a.startsWith('['))
  .join('_');
const nombre = `Entrega_GestorRutas_ADA_2026-2_${apellidos || 'APELLIDOS'}.zip`;

const obligatorios = ['informe/salida/Informe_Tecnico.pdf', 'GestorRutas.html', 'dist/index.html', 'docs/GUIA_SUSTENTACION.md'];
for (const f of obligatorios) {
  if (!existsSync(f)) {
    console.error(`Falta ${f}. Ejecuta primero npm run build y npm run informe.`);
    process.exit(1);
  }
}

const salida = createWriteStream(nombre);
const zip = archiver('zip', { zlib: { level: 9 } });
zip.on('error', (e) => {
  throw e;
});
zip.pipe(salida);

zip.file('informe/salida/Informe_Tecnico.pdf', { name: 'Informe_Tecnico.pdf' });
zip.file('GestorRutas.html', { name: 'GestorRutas.html' });
zip.directory('docs/', 'docs');
if (existsSync('informe/salida/Documento_Fase1.pdf')) zip.file('informe/salida/Documento_Fase1.pdf', { name: 'docs/Documento_Fase1.pdf' });
zip.directory('dist/', 'software/dist');
zip.glob('**/*', {
  ignore: ['node_modules/**', 'dist/**', 'dist-unico/**', 'coverage/**', '.git/**', 'Entrega_*.zip', 'GestorRutas.html', 'informe/salida/**'],
  dot: true,
}, { prefix: 'software' });

await zip.finalize();
await new Promise((r) => salida.on('close', r));
console.log(`${nombre}: ${(statSync(nombre).size / 1024 / 1024).toFixed(2)} MB`);
