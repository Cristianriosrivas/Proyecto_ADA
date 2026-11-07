import { aEstrella } from '@core/algoritmos/aEstrella';
import { bfs, bfsMatriz } from '@core/algoritmos/bfs';
import { dfsIterativo, dfsMatriz } from '@core/algoritmos/dfs';
import { dijkstra, dijkstraArreglo } from '@core/algoritmos/dijkstra';
import { enteroAzar, mulberry32 } from '@core/generadores/azar';
import { generarRed } from '@core/generadores/redes';
import { medir } from '@core/instrumentacion/medicion';
import { heapSort, mergeSort, quickSort } from '@core/ordenamiento/ordenamiento';

export interface ConfigLaboratorio {
  tamanos: number[];
  semilla: number;
  repeticiones: number;
}

export type FilaLab =
  | { tipo: 'tiempo'; algoritmo: string; n: number; arcos: number; us: number; iqr: number }
  | { tipo: 'contador'; n: number; vias: number; externas: number; internas: number; teoricoExterno: number; teoricoInterno: number }
  | { tipo: 'matriz'; n: number; listaUs: number; matrizUs: number; dfsListaUs: number; dfsMatrizUs: number; bytesLista: number; bytesMatriz: number }
  | { tipo: 'cruce'; n: number; densidad: number; vias: number; heapUs: number; arregloUs: number }
  | { tipo: 'aestrella'; n: number; expD: number; expA: number; usD: number; usA: number }
  | { tipo: 'orden'; n: number; algoritmo: string; comparaciones: number; us: number }
  | { tipo: 'progreso'; texto: string; fraccion: number };

const reloj = () => performance.now();

/**
 * Los experimentos del laboratorio como generador: cada `yield` entrega una fila.
 * Así el Web Worker los corre sin tocar la interfaz y, si el navegador bloquea el worker,
 * el hilo principal puede correrlos por lotes cediendo el control entre filas.
 */
export function* experimentos(c: ConfigLaboratorio): Generator<FilaLab> {
  const op = { repeticiones: c.repeticiones, minimoMs: 2, calentamiento: 2 };
  const total = c.tamanos.length;
  for (let i = 0; i < total; i++) {
    const n = c.tamanos[i];
    yield { tipo: 'progreso', texto: `Midiendo N = ${n}`, fraccion: i / total };
    const red = generarRed('geometrica', n, c.semilla);
    const arcos = red.numArcos;
    const casos: [string, () => void][] = [
      ['BFS', () => void bfs(red, 0)],
      ['DFS', () => void dfsIterativo(red, 0)],
      ['Dijkstra heap', () => void dijkstra(red, 0)],
      ['Dijkstra arreglo', () => void dijkstraArreglo(red, 0)],
    ];
    for (const [algoritmo, fn] of casos) {
      const m = medir(fn, reloj, op);
      yield { tipo: 'tiempo', algoritmo, n, arcos, us: m.medianaUs, iqr: m.iqrUs };
    }
    const b = bfs(red, 0);
    yield { tipo: 'contador', n, vias: red.numVias, externas: b.contadores.externas, internas: b.contadores.internas, teoricoExterno: n, teoricoInterno: 2 * red.numVias };

    if (n <= 2500) {
      const mat = red.matriz('km');
      const l = medir(() => void bfs(red, 0), reloj, op);
      const dl = medir(() => void dfsIterativo(red, 0), reloj, op);
      const m = medir(() => void bfsMatriz(mat, 0), reloj, op);
      const dm = medir(() => void dfsMatriz(mat, 0), reloj, op);
      yield { tipo: 'matriz', n, listaUs: l.medianaUs, matrizUs: m.medianaUs, dfsListaUs: dl.medianaUs, dfsMatrizUs: dm.medianaUs, bytesLista: red.adj.bytesTeoricos(), bytesMatriz: mat.bytesTeoricos() };
    }

    const azar = mulberry32(c.semilla + n);
    const pares: [number, number][] = [];
    for (let q = 0; q < 20; q++) {
      const s = enteroAzar(azar, n);
      pares.push([s, (s + 1 + enteroAzar(azar, n - 1)) % n]);
    }
    let expD = 0;
    let expA = 0;
    for (const [s, t] of pares) {
      expD += dijkstra(red, s, t).contadores.expandidos;
      expA += aEstrella(red, s, t).contadores.expandidos;
    }
    const usD = medir(() => pares.forEach(([s, t]) => void dijkstra(red, s, t)), reloj, op);
    const usA = medir(() => pares.forEach(([s, t]) => void aEstrella(red, s, t)), reloj, op);
    yield { tipo: 'aestrella', n, expD: expD / 20, expA: expA / 20, usD: usD.medianaUs / 20, usA: usA.medianaUs / 20 };
  }

  const nDensa = 500;
  yield { tipo: 'progreso', texto: 'Buscando el punto de cruce de Dijkstra', fraccion: 0.9 };
  for (const densidad of [0.005, 0.02, 0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1]) {
    const red = generarRed('densa', nDensa, c.semilla, { densidad });
    const heap = medir(() => void dijkstra(red, 0), reloj, op);
    const arreglo = medir(() => void dijkstraArreglo(red, 0), reloj, op);
    yield { tipo: 'cruce', n: nDensa, densidad, vias: red.numVias, heapUs: heap.medianaUs, arregloUs: arreglo.medianaUs };
  }

  yield { tipo: 'progreso', texto: 'Comparando ordenamientos', fraccion: 0.96 };
  const cmp = (a: number, b: number) => a - b;
  for (const n of [1000, 5000, 20000]) {
    const azar = mulberry32(c.semilla);
    const base = Float64Array.from({ length: n }, () => azar());
    const algos: [string, (a: Float64Array) => { comparaciones: number }][] = [
      ['MergeSort', (a) => mergeSort(a, cmp)],
      ['QuickSort', (a) => quickSort(a, cmp)],
      ['HeapSort', (a) => heapSort(a, cmp)],
    ];
    for (const [algoritmo, f] of algos) {
      const k = f(new Float64Array(base));
      const m = medir(() => void f(new Float64Array(base)), reloj, { repeticiones: 5, minimoMs: 2, calentamiento: 1 });
      yield { tipo: 'orden', n, algoritmo, comparaciones: k.comparaciones, us: m.medianaUs };
    }
  }
  yield { tipo: 'progreso', texto: 'Listo', fraccion: 1 };
}
