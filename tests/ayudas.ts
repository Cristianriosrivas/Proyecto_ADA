import docente from '../src/redes/docente-8.json';
import type { RedJSON } from '../src/core/grafo/tipos';
import { RedTransporte } from '../src/core/grafo/RedTransporte';

export const redDocente = (): RedTransporte => RedTransporte.desdeJSON(docente as RedJSON);

/** Convierte una ruta de índices en "A → C → E". */
export const texto = (red: RedTransporte, ruta: ArrayLike<number>): string => Array.from(ruta, (i) => red.estacion(i).id).join(' → ');

export interface GrafoAzar {
  n: number;
  dirigida: boolean;
  /** Pares (u, v, peso entero) */
  aristas: [number, number, number][];
}

/** Coordenadas sobre un círculo pequeño, para que cualquier peso ≥ 1 sea admisible. */
export function construir(g: GrafoAzar): RedTransporte {
  const red = new RedTransporte('azar', g.dirigida);
  for (let i = 0; i < g.n; i++) {
    const a = (2 * Math.PI * i) / g.n;
    red.agregarEstacion(`N${i}`, 0.4 * Math.cos(a), 0.4 * Math.sin(a));
  }
  for (const [u, v, w] of g.aristas) if (u !== v) red.agregarVia(u, v, w, w);
  return red;
}

/** Floyd-Warshall de referencia. Existe solo en los tests, para validar a los demás. */
export function floydWarshall(g: GrafoAzar): number[][] {
  const d = Array.from({ length: g.n }, (_, i) => Array.from({ length: g.n }, (_, j) => (i === j ? 0 : Infinity)));
  for (const [u, v, w] of g.aristas) {
    if (u === v) continue;
    d[u][v] = Math.min(d[u][v], w);
    if (!g.dirigida) d[v][u] = Math.min(d[v][u], w);
  }
  for (let k = 0; k < g.n; k++) {
    for (let i = 0; i < g.n; i++) {
      for (let j = 0; j < g.n; j++) if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
    }
  }
  return d;
}

/** Bellman-Ford de referencia, otra implementación independiente de la distancia. */
export function bellmanFord(g: GrafoAzar, s: number): number[] {
  const d = new Array<number>(g.n).fill(Infinity);
  d[s] = 0;
  for (let i = 0; i < g.n; i++) {
    for (const [u, v, w] of g.aristas) {
      if (u === v) continue;
      if (d[u] + w < d[v]) d[v] = d[u] + w;
      if (!g.dirigida && d[v] + w < d[u]) d[u] = d[v] + w;
    }
  }
  return d;
}
