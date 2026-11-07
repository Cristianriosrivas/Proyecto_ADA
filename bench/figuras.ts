// Genera las figuras SVG del informe a partir de bench/resultados. No inventa datos: si un
// archivo no existe, la figura no se genera.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { generarRed } from '../src/core/generadores/redes';
import type { RedTransporte } from '../src/core/grafo/RedTransporte';
import { ajustarConstante, CURVAS } from '../src/core/instrumentacion/medicion';
import { cargarPreset } from '../src/redes/presets';

const RES = 'bench/resultados';
const FIG = 'informe/figuras';
mkdirSync(FIG, { recursive: true });

const leer = <T,>(n: string): T => JSON.parse(readFileSync(`${RES}/${n}.json`, 'utf8')) as T;

export const COLORES = ['#B5121B', '#0A6FA8', '#B86E00', '#0F8A5F', '#6D3FC4'];

interface Serie {
  nombre: string;
  puntos: [number, number][];
  color?: string;
  punteada?: boolean;
}

interface Grafica {
  ejeX: string;
  ejeY: string;
  logX?: boolean;
  logY?: boolean;
  series: Serie[];
  w?: number;
  h?: number;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function marcas(min: number, max: number, log: boolean): number[] {
  if (log) {
    const r: number[] = [];
    for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) r.push(10 ** e);
    return r;
  }
  const paso0 = (max - min) / 5;
  const base = 10 ** Math.floor(Math.log10(paso0 || 1));
  const paso = [1, 2, 5, 10].map((f) => f * base).find((x) => x >= paso0) ?? base;
  const r: number[] = [];
  for (let v = Math.floor(min / paso) * paso; v <= max + paso * 0.5; v += paso) r.push(v);
  return r;
}

const fmt = (v: number) => (Math.abs(v) >= 1e6 ? `${v / 1e6} M` : Math.abs(v) >= 1e4 ? `${v / 1e3} k` : Number(v.toPrecision(6)).toLocaleString('es-CO'));

/** Gráfica de líneas en SVG puro, para impresión: una escala por eje, leyenda y marcas por serie. */
export function grafica(g: Grafica): string {
  const W = g.w ?? 640;
  const H = g.h ?? 340;
  const L = 74;
  const R = 16;
  const T = 44;
  const B = 50;
  const todos = g.series.flatMap((s) => s.puntos);
  const xs = todos.map((p) => p[0]);
  const ys = todos.map((p) => p[1]).filter((v) => !g.logY || v > 0);
  let x0 = Math.min(...xs);
  let x1 = Math.max(...xs);
  let y0 = g.logY ? Math.min(...ys) : 0;
  let y1 = Math.max(...ys);
  const mx = marcas(x0, x1, !!g.logX);
  const my = marcas(y0, y1, !!g.logY);
  if (g.logX) {
    x0 = mx[0];
    x1 = mx[mx.length - 1];
  }
  y0 = my[0];
  y1 = my[my.length - 1];
  const X = (v: number) => L + ((g.logX ? Math.log10(v) - Math.log10(x0) : v - x0) / (g.logX ? Math.log10(x1) - Math.log10(x0) : x1 - x0 || 1)) * (W - L - R);
  const Y = (v: number) => H - B - ((g.logY ? Math.log10(v) - Math.log10(y0) : v - y0) / (g.logY ? Math.log10(y1) - Math.log10(y0) : y1 - y0 || 1)) * (H - T - B);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Sora, Arial, sans-serif" font-size="11">`;
  s += `<rect width="${W}" height="${H}" fill="#fff"/>`;
  for (const v of my) s += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#E2E2DC"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" fill="#444">${fmt(v)}</text>`;
  const ticks = g.logX ? mx : marcas(x0, x1, false);
  for (const v of ticks) {
    if (X(v) < L - 1 || X(v) > W - R + 1) continue;
    s += `<line x1="${X(v)}" x2="${X(v)}" y1="${H - B}" y2="${H - B + 4}" stroke="#555"/><text x="${X(v)}" y="${H - B + 16}" text-anchor="middle" fill="#444">${fmt(v)}</text>`;
  }
  s += `<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="#555"/>`;
  s += `<text x="${(L + W - R) / 2}" y="${H - 10}" text-anchor="middle" fill="#222">${esc(g.ejeX)}</text>`;
  s += `<text transform="translate(16 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle" fill="#222">${esc(g.ejeY)}</text>`;
  g.series.forEach((se, i) => {
    const c = se.color ?? COLORES[i % COLORES.length];
    const pts = se.puntos.filter((p) => !g.logY || p[1] > 0);
    s += `<polyline fill="none" stroke="${c}" stroke-width="2" ${se.punteada ? 'stroke-dasharray="6 5"' : ''} points="${pts.map((p) => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ')}"/>`;
    if (!se.punteada) for (const p of pts) s += `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="3.2" fill="${c}" stroke="#fff" stroke-width="1"/>`;
  });
  let lx = L;
  let ly = 14;
  g.series.forEach((se, i) => {
    const c = se.color ?? COLORES[i % COLORES.length];
    const ancho = se.nombre.length * 6.3 + 34;
    if (lx + ancho > W - R) {
      lx = L;
      ly += 15;
    }
    s += `<line x1="${lx}" x2="${lx + 20}" y1="${ly}" y2="${ly}" stroke="${c}" stroke-width="2.4" ${se.punteada ? 'stroke-dasharray="6 4"' : ''}/><text x="${lx + 25}" y="${ly + 4}" fill="#222">${esc(se.nombre)}</text>`;
    lx += ancho;
  });
  return `${s}</svg>`;
}

interface RedDibujo {
  red: RedTransporte;
  pesos?: boolean;
  etiquetas?: boolean;
  w?: number;
  h?: number;
  ruta?: string[];
}

/** Diagrama de una red, con el mismo sistema de coordenadas que el mapa de la aplicación. */
export function diagrama({ red, pesos, etiquetas, w = 640, h = 280, ruta }: RedDibujo): string {
  const xs = red.coordenadasX();
  const ys = red.coordenadasY();
  const m = 34;
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const k = Math.min((w - 2 * m) / (x1 - x0 || 1), (h - 2 * m) / (y1 - y0 || 1));
  const ox = (w - k * (x0 + x1)) / 2;
  const oy = (h + k * (y0 + y1)) / 2;
  const X = (i: number) => ox + k * xs[i];
  const Y = (i: number) => oy - k * ys[i];
  const n = red.numEstaciones;
  const r = n <= 12 ? 12 : n <= 60 ? 4.5 : n <= 120 ? 3.2 : 2.2;
  const enRuta = new Set<string>();
  if (ruta) for (let i = 1; i < ruta.length; i++) {
    enRuta.add(`${ruta[i - 1]}|${ruta[i]}`);
    enRuta.add(`${ruta[i]}|${ruta[i - 1]}`);
  }
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" font-family="Sora, Arial, sans-serif" font-size="11"><rect width="${w}" height="${h}" fill="#fff"/>`;
  for (let i = 0; i < red.numVias; i++) {
    const v = red.via(i);
    const hot = enRuta.has(`${red.estacion(v.origen).id}|${red.estacion(v.destino).id}`);
    s += `<line x1="${X(v.origen).toFixed(1)}" y1="${Y(v.origen).toFixed(1)}" x2="${X(v.destino).toFixed(1)}" y2="${Y(v.destino).toFixed(1)}" stroke="${hot ? '#B5121B' : '#7D8E93'}" stroke-width="${n <= 12 ? (hot ? 3.2 : 2) : 0.9}"/>`;
    if (pesos) {
      const mxp = (X(v.origen) + X(v.destino)) / 2;
      const myp = (Y(v.origen) + Y(v.destino)) / 2;
      s += `<circle cx="${mxp}" cy="${myp}" r="8" fill="#fff" stroke="#CCC"/><text x="${mxp}" y="${myp + 3.6}" text-anchor="middle" font-size="10" fill="#333">${v.distanciaKm}</text>`;
    }
  }
  for (let i = 0; i < n; i++) {
    s += `<circle cx="${X(i).toFixed(1)}" cy="${Y(i).toFixed(1)}" r="${r}" fill="${n <= 12 ? '#123440' : '#0A6FA8'}" stroke="#fff" stroke-width="${n <= 12 ? 1.5 : 0.5}"/>`;
    if (etiquetas) s += `<text x="${X(i).toFixed(1)}" y="${(Y(i) + 4).toFixed(1)}" text-anchor="middle" fill="#fff" font-weight="700">${esc(red.estacion(i).id)}</text>`;
  }
  return `${s}</svg>`;
}

function guardar(nombre: string, svg: string): void {
  writeFileSync(`${FIG}/${nombre}.svg`, svg);
}

interface FilaTiempo {
  tipo: string;
  algoritmo: string;
  n: number;
  vias: number;
  mediana_us: number;
}

function serieTiempos(filas: FilaTiempo[], tipo: string, algoritmo: string): [number, number][] {
  return filas.filter((f) => f.tipo === tipo && f.algoritmo === algoritmo).map((f) => [f.n, f.mediana_us]);
}

function curvaAjustada(filas: FilaTiempo[], tipo: string, algoritmo: string, curva: keyof typeof CURVAS): [number, number][] {
  const s = filas.filter((f) => f.tipo === tipo && f.algoritmo === algoritmo);
  const f = s.map((x) => CURVAS[curva](x.n, 2 * x.vias));
  const a = ajustarConstante(f, s.map((x) => x.mediana_us));
  return s.map((x, i) => [x.n, a.c * f[i]]);
}

export function generarFiguras(): void {
  guardar('red-docente', diagrama({ red: cargarPreset('docente'), pesos: true, etiquetas: true, h: 250 }));
  guardar('red-docente-ruta', diagrama({ red: cargarPreset('docente'), pesos: true, etiquetas: true, h: 250, ruta: ['A', 'C', 'B', 'D', 'E', 'F', 'G', 'H'] }));
  guardar('red-buenaventura', diagrama({ red: cargarPreset('buenaventura'), h: 200 }));
  for (const n of [10, 50, 100]) guardar(`red-geometrica-${n}`, diagrama({ red: generarRed('geometrica', n, 20262), w: 300, h: 280 }));
  guardar('red-cuadricula-100', diagrama({ red: generarRed('cuadricula', 100, 20262), w: 300, h: 280 }));
  guardar('red-metro-100', diagrama({ red: generarRed('metro', 100, 20262), w: 300, h: 280 }));

  if (!existsSync(`${RES}/tiempos.json`)) return;
  const t = leer<FilaTiempo[]>('tiempos');
  const eje = { ejeX: 'N, estaciones', ejeY: 'Tiempo (μs)' };

  guardar('tiempo-bfs-dfs', grafica({ ...eje, series: [
    { nombre: 'BFS medido', puntos: serieTiempos(t, 'geometrica', 'BFS') },
    { nombre: 'DFS medido', puntos: serieTiempos(t, 'geometrica', 'DFS') },
    { nombre: 'c·(V + E), ajustada a BFS', puntos: curvaAjustada(t, 'geometrica', 'BFS', 'lineal'), color: '#555', punteada: true },
  ] }));
  guardar('tiempo-bfs-dfs-pequeno', grafica({ ...eje, series: [
    { nombre: 'BFS medido', puntos: serieTiempos(t, 'geometrica', 'BFS').filter((p) => p[0] <= 250) },
    { nombre: 'DFS medido', puntos: serieTiempos(t, 'geometrica', 'DFS').filter((p) => p[0] <= 250) },
  ] }));
  guardar('tiempo-loglog', grafica({ ...eje, logX: true, logY: true, series: [
    { nombre: 'BFS', puntos: serieTiempos(t, 'geometrica', 'BFS') },
    { nombre: 'DFS', puntos: serieTiempos(t, 'geometrica', 'DFS') },
    { nombre: 'Dijkstra heap', puntos: serieTiempos(t, 'geometrica', 'Dijkstra heap') },
    { nombre: 'A*', puntos: serieTiempos(t, 'geometrica', 'A*') },
    { nombre: 'Dijkstra arreglo', puntos: serieTiempos(t, 'geometrica', 'Dijkstra arreglo') },
  ] }));
  guardar('tiempo-dijkstra', grafica({ ...eje, series: [
    { nombre: 'Heap medido', puntos: serieTiempos(t, 'geometrica', 'Dijkstra heap') },
    { nombre: 'c·(V + E)·lg V', puntos: curvaAjustada(t, 'geometrica', 'Dijkstra heap', 'lineal_log'), color: '#555', punteada: true },
  ] }));
  guardar('tiempo-dijkstra-arreglo', grafica({ ...eje, series: [
    { nombre: 'Arreglo medido', puntos: serieTiempos(t, 'geometrica', 'Dijkstra arreglo'), color: COLORES[1] },
    { nombre: 'c·V²', puntos: curvaAjustada(t, 'geometrica', 'Dijkstra arreglo', 'cuadratica'), color: '#555', punteada: true },
  ] }));

  const ml = leer<{ n: number; lista_bytes_teorico: number; matriz_bytes_teorico: number; lista_bytes_medido: number; matriz_bytes_medido: number; bfs_lista_us: number; bfs_matriz_us: number; dfs_lista_us: number; dfs_matriz_us: number }[]>('matriz_lista');
  guardar('matriz-memoria', grafica({ ejeX: 'N, estaciones', ejeY: 'Bytes', logX: true, logY: true, series: [
    { nombre: 'Matriz, teórico', puntos: ml.map((f) => [f.n, f.matriz_bytes_teorico]) },
    { nombre: 'Lista, teórico', puntos: ml.map((f) => [f.n, f.lista_bytes_teorico]) },
    { nombre: 'Matriz, medido', puntos: ml.filter((f) => f.matriz_bytes_medido > 0).map((f) => [f.n, f.matriz_bytes_medido]), color: COLORES[0], punteada: true },
    { nombre: 'Lista, medido', puntos: ml.filter((f) => f.lista_bytes_medido > 0).map((f) => [f.n, f.lista_bytes_medido]), color: COLORES[1], punteada: true },
  ] }));
  guardar('matriz-tiempo', grafica({ ...eje, logX: true, logY: true, series: [
    { nombre: 'BFS matriz', puntos: ml.map((f) => [f.n, f.bfs_matriz_us]) },
    { nombre: 'BFS lista', puntos: ml.map((f) => [f.n, f.bfs_lista_us]) },
    { nombre: 'DFS matriz', puntos: ml.map((f) => [f.n, f.dfs_matriz_us]) },
    { nombre: 'DFS lista', puntos: ml.map((f) => [f.n, f.dfs_lista_us]) },
  ] }));

  const cr = leer<{ n: number; vias: number; heap_us: number; arreglo_us: number }[]>('cruce_dijkstra');
  for (const n of [500, 1000, 2000]) {
    const f = cr.filter((x) => x.n === n);
    guardar(`cruce-${n}`, grafica({ ejeX: '|E|, vías', ejeY: 'Tiempo (μs)', logX: true, logY: true, w: 420, h: 300, series: [
      { nombre: 'Min-Heap', puntos: f.map((x) => [x.vias, x.heap_us]) },
      { nombre: 'Arreglo', puntos: f.map((x) => [x.vias, x.arreglo_us]) },
    ] }));
  }

  const ae = leer<{ tipo: string; n: number; metrica: string; expandidos_dijkstra: number; expandidos_aestrella: number; dijkstra_us: number; aestrella_us: number }[]>('aestrella_dijkstra');
  const km = ae.filter((f) => f.metrica === 'km');
  guardar('aestrella-expandidos', grafica({ ejeX: 'N, estaciones', ejeY: 'Nodos expandidos, promedio', logX: true, logY: true, series: [
    { nombre: 'Dijkstra, geométrica', puntos: km.filter((f) => f.tipo === 'geometrica').map((f) => [f.n, f.expandidos_dijkstra]) },
    { nombre: 'A*, geométrica', puntos: km.filter((f) => f.tipo === 'geometrica').map((f) => [f.n, f.expandidos_aestrella]) },
    { nombre: 'A*, cuadrícula', puntos: km.filter((f) => f.tipo === 'cuadricula').map((f) => [f.n, f.expandidos_aestrella]) },
    { nombre: 'A*, metro', puntos: km.filter((f) => f.tipo === 'metro').map((f) => [f.n, f.expandidos_aestrella]) },
  ] }));
  const pond = leer<{ w: number; expandidos: number; sobrecosto_medio_pct: number }[]>('aestrella_ponderado');
  guardar('aestrella-ponderado-expandidos', grafica({ ejeX: 'w, peso de la heurística', ejeY: 'Nodos expandidos', w: 320, h: 260, series: [{ nombre: 'Expandidos', puntos: pond.map((f) => [f.w, f.expandidos]) }] }));
  guardar('aestrella-ponderado-costo', grafica({ ejeX: 'w, peso de la heurística', ejeY: 'Sobrecosto medio (%)', w: 320, h: 260, series: [{ nombre: 'Sobrecosto', puntos: pond.map((f) => [f.w, f.sobrecosto_medio_pct]), color: COLORES[1] }] }));

  const or = leer<{ n: number; entrada: string; algoritmo: string; mediana_us: number; comparaciones: number; n_lg_n: number }[]>('ordenamientos');
  const azar = or.filter((f) => f.entrada === 'azar');
  guardar('ordenamientos', grafica({ ejeX: 'n, elementos', ejeY: 'Tiempo (μs)', logX: true, logY: true, series: ['MergeSort', 'QuickSort mediana de 3', 'HeapSort'].map((a) => ({ nombre: a, puntos: azar.filter((f) => f.algoritmo === a).map((f) => [f.n, f.mediana_us] as [number, number]) })) }));
  const ord = or.filter((f) => f.entrada === 'ordenada');
  guardar('quicksort-peor', grafica({ ejeX: 'n, elementos ordenados', ejeY: 'Comparaciones', logX: true, logY: true, series: [
    { nombre: 'Mediana de 3', puntos: ord.filter((f) => f.algoritmo === 'QuickSort mediana de 3' && f.n <= 5000).map((f) => [f.n, f.comparaciones]) },
    { nombre: 'Último elemento como pivote', puntos: ord.filter((f) => f.algoritmo === 'QuickSort último pivote').map((f) => [f.n, f.comparaciones]) },
  ] }));

  const p6 = leer<{ n: number; estrategia: string; ms: number }[]>('p6');
  guardar('p6', grafica({ ejeX: 'n, vías en la tabla', ejeY: 'Tiempo total (ms)', logX: true, logY: true, series: [
    { nombre: 'Reordenar con QuickSort', puntos: p6.filter((f) => f.estrategia === 'quick').map((f) => [f.n, f.ms]) },
    { nombre: 'Reordenar con HeapSort', puntos: p6.filter((f) => f.estrategia === 'heap').map((f) => [f.n, f.ms]) },
    { nombre: 'Cola de prioridad indexada', puntos: p6.filter((f) => f.estrategia === 'cola').map((f) => [f.n, f.ms]) },
  ] }));
  console.log('Figuras generadas en informe/figuras');
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('bench/figuras.ts')) generarFiguras();
