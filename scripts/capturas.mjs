// Toma las capturas del manual directamente de GestorRutas.html, con Edge o Chrome instalados.
// También sirve de prueba de humo: falla si alguna vista lanza un error en la consola.
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

export const NAVEGADORES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];

const VISTAS = ['Inicio', 'Planificador', 'Visualizador', 'Prueba de Escritorio', 'Explorador DFS', 'Duelo', 'Tráfico', 'Laboratorio', 'Teoría', 'Editor'];
const SALIDA = process.argv[2] ?? 'informe/figuras/capturas';
const TEMA = process.argv[3] ?? 'oscuro';
mkdirSync(SALIDA, { recursive: true });

const ejecutable = NAVEGADORES.find((p) => existsSync(p));
if (!ejecutable) {
  console.error('No se encontró Edge ni Chrome.');
  process.exit(1);
}
const navegador = await puppeteer.launch({ executablePath: ejecutable, headless: true, args: ['--allow-file-access-from-files'] });
const pagina = await navegador.newPage();
await pagina.setViewport({ width: 1440, height: 860 });
const errores = [];
pagina.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
// Sin internet las teselas del mapa real fallan y la app cae a las calles guardadas: eso no es un error
const tolerado = (url) => url.endsWith('logo-univalle.png') || url.startsWith('https://tile.openstreetmap.org/');
pagina.on('console', (m) => {
  if (m.type() === 'error' && !tolerado(m.location().url ?? '')) errores.push(`console: ${m.text()}`);
});
pagina.on('requestfailed', (r) => {
  if (!tolerado(r.url())) errores.push(`red: ${r.url().slice(0, 100)}`);
});

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const clicTexto = (texto, selector = 'button') =>
  pagina.evaluate(
    (t, s) => {
      const b = [...document.querySelectorAll(s)].find((x) => x.textContent.trim() === t);
      if (!b) throw new Error(`Sin botón ${t}`);
      b.click();
    },
    texto,
    selector,
  );

await pagina.goto(pathToFileURL(resolve('GestorRutas.html')).href, { waitUntil: 'load' });
if (TEMA === 'claro') await pagina.click('button[aria-label="Cambiar a tema claro"]');
await espera(1500);
await pagina.select('select[aria-label="Red activa"]', 'buenaventura');
await espera(200);

for (const v of VISTAS) {
  await clicTexto(v, '.nav button');
  await espera(600);
  const nombre = v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
  if (v === 'Planificador') {
    await clicTexto('Calcular ruta');
    await espera(1300);
  }
  if (v === 'Visualizador') {
    await pagina.keyboard.press('ArrowRight');
    await pagina.evaluate(() => {
      const r = document.querySelector('input[aria-label="Línea de tiempo"]');
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      set.call(r, String(Math.floor(Number(r.max) * 0.55)));
      r.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await espera(500);
  }
  if (v === 'Explorador DFS') {
    await clicTexto('Hallar todas las rutas');
    await espera(500);
  }
  if (v === 'Laboratorio') {
    await pagina.evaluate(() => {
      for (const l of document.querySelectorAll('label.etiqueta')) {
        const c = l.querySelector('input');
        const n = Number(l.textContent.replace(/\D/g, ''));
        if (c.checked !== n <= 250) c.click();
      }
    });
    await clicTexto('Correr experimentos');
    await pagina.waitForFunction(() => document.body.textContent.includes('Ordenamientos') && !document.querySelector('[role=status] div div'), { timeout: 120000 }).catch(() => errores.push('El laboratorio no terminó a tiempo'));
    await espera(600);
  }
  await pagina.screenshot({ path: `${SALIDA}/${nombre}.png` });
  console.log('Captura:', nombre);
}

await pagina.select('select[aria-label="Red activa"]', 'docente');
await espera(200);
await clicTexto('Prueba de Escritorio', '.nav button');
await espera(400);
const coincidencias = await pagina.evaluate(() => [...document.querySelectorAll('.etiqueta.ok')].filter((e) => e.textContent.includes('Coincide')).length);
console.log('Filas que coinciden en la prueba de escritorio:', coincidencias);
if (coincidencias !== 4) errores.push('La prueba de escritorio no muestra 4 coincidencias');

await pagina.select('select[aria-label="Red activa"]', 'geometrica-5000');
await espera(800);
await clicTexto('Planificador', '.nav button');
await espera(800);
await clicTexto('Calcular ruta');
await espera(1500);
await pagina.screenshot({ path: `${SALIDA}/red-5000.png` });

// Calles reales de Buenaventura: primero con las calles guardadas y luego sobre el mapa real
await pagina.select('select[aria-label="Red activa"]', 'buenaventura-osm');
await espera(800);
await clicTexto('Calcular ruta');
await espera(3500);
await pagina.screenshot({ path: `${SALIDA}/calles-reales.png` });
console.log('Captura: calles-reales');
await pagina.click('.mapa .capas > button');
await espera(300);
await pagina.evaluate(() => [...document.querySelectorAll('.opcion-capa')].find((b) => b.textContent.includes('Mapa real')).click());
await pagina.waitForFunction(() => [...document.querySelectorAll('.teselas img')].some((i) => i.complete && i.naturalWidth > 0) || document.querySelector('.mapa.fondo-calles'), { timeout: 15000 }).catch(() => {});
await espera(2500);
if (await pagina.evaluate(() => !!document.querySelector('.mapa.fondo-real'))) {
  await pagina.screenshot({ path: `${SALIDA}/mapa-real.png` });
  console.log('Captura: mapa-real');
} else console.log('Sin internet: no se tomó la captura del mapa real');
await pagina.click('.mapa .capas > button');
await espera(300);
await pagina.evaluate(() => [...document.querySelectorAll('.opcion-capa')].find((b) => b.textContent.includes('Calles')).click());
await espera(300);

await pagina.select('select[aria-label="Red activa"]', 'docente');
await espera(300);

await pagina.setViewport({ width: 400, height: 800 });
await clicTexto('Planificador', '.nav button');
await espera(500);
await pagina.screenshot({ path: `${SALIDA}/telefono.png` });
const desborda = await pagina.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
if (desborda) errores.push('La página se desborda en un teléfono');
await pagina.setViewport({ width: 1440, height: 860 });

await clicTexto('Inicio', '.nav button');
await espera(300);
await clicTexto('Iniciar sustentación');
await espera(900);
// Hasta la última escena, Conclusiones (las flechas de más no hacen nada en la última)
for (let i = 0; i < 15; i++) {
  await pagina.keyboard.press('ArrowRight');
  await espera(280);
}
await espera(500);
await pagina.screenshot({ path: `${SALIDA}/sustentacion.png` });
await pagina.keyboard.press('Escape');
await espera(200);

await pagina.keyboard.down('Control');
await pagina.keyboard.press('k');
await pagina.keyboard.up('Control');
await espera(300);
await pagina.screenshot({ path: `${SALIDA}/paleta.png` });

await navegador.close();
console.log('Errores:', errores.length);
errores.slice(0, 15).forEach((e) => console.log(' ', e));
process.exit(errores.length ? 1 : 0);
