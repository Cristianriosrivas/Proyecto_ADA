// Benchmarks reproducibles: el mismo `core` que usa la app, medido con process.hrtime.bigint().
// Toda cifra del informe sale de los archivos que escribe este programa.
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus, platform, release, totalmem, arch } from 'node:os';
import { aEstrella } from '../src/core/algoritmos/aEstrella';
import { bfs, bfsMatriz } from '../src/core/algoritmos/bfs';
import { dfsIterativo, dfsMatriz, dfsRecursivo } from '../src/core/algoritmos/dfs';
import { dijkstra, dijkstraArreglo, dijkstraPerezoso } from '../src/core/algoritmos/dijkstra';
import { KDTree } from '../src/core/estructuras/KDTree';
import { MinHeapIndexado } from '../src/core/estructuras/MinHeapIndexado';
import { TablaHash } from '../src/core/estructuras/TablaHash';
import { enteroAzar, mulberry32 } from '../src/core/generadores/azar';
import { generarRed, type TipoRed } from '../src/core/generadores/redes';
import type { RedTransporte } from '../src/core/grafo/RedTransporte';
import { ajustarConstante, CURVAS, medir } from '../src/core/instrumentacion/medicion';
import { TracerMemoria } from '../src/core/instrumentacion/TracerMemoria';
import { contadoresOrdenVacios, heapSort, mergeSort, quickSort } from '../src/core/ordenamiento/ordenamiento';
import { experimentoP6 } from '../src/core/trafico/trafico';

const SALIDA = 'bench/resultados';
mkdirSync(SALIDA, { recursive: true });
const SEMILLA = 20262;
const TAMANOS = [10, 50, 100, 250, 500, 1000, 2500, 5000];
const reloj = () => Number(process.hrtime.bigint()) / 1e6;
const gc = (globalThis as { gc?: () => void }).gc;

function guardar(nombre: string, filas: Record<string, unknown>[]): void {
  writeFileSync(`${SALIDA}/${nombre}.json`, JSON.stringify(filas, null, 1));
  if (filas.length === 0) return;
  const columnas = Object.keys(filas[0]);
  const csv = [columnas.join(','), ...filas.map((f) => columnas.map((c) => String(f[c] ?? '')).join(','))].join('\n');
  writeFileSync(`${SALIDA}/${nombre}.csv`, csv + '\n');
  console.log(`  ${nombre}: ${filas.length} filas`);
}

function pares(red: RedTransporte, cuantos: number, semilla: number): [number, number][] {
  const azar = mulberry32(semilla);
  const r: [number, number][] = [];
  for (let i = 0; i < cuantos; i++) {
    const s = enteroAzar(azar, red.numEstaciones);
    let t = enteroAzar(azar, red.numEstaciones);
    if (t === s) t = (t + 1) % red.numEstaciones;
    r.push([s, t]);
  }
  return r;
}

function maquina(): void {
  const c = cpus();
  writeFileSync(
    `${SALIDA}/maquina.json`,
    JSON.stringify(
      { cpu: c[0]?.model.trim(), nucleos: c.length, ramGB: Number((totalmem() / 2 ** 30).toFixed(1)), so: `${platform()} ${release()} ${arch()}`, node: process.version, fecha: new Date().toISOString(), semilla: SEMILLA, tamanos: TAMANOS },
      null,
      1,
    ),
  );
}

/** Tiempo de cada algoritmo contra N, en los tres tipos de red, con su curva teórica ajustada. */
function tiempos(): void {
  const filas: Record<string, unknown>[] = [];
  const ajustes: Record<string, unknown>[] = [];
  for (const tipo of ['geometrica', 'cuadricula', 'metro'] as TipoRed[]) {
    const porAlgo: Record<string, { v: number[]; e: number[]; t: number[] }> = {};
    for (const n of TAMANOS) {
      const red = generarRed(tipo, n, SEMILLA);
      const V = red.numEstaciones;
      const E = red.numVias;
      const lejos = red.numEstaciones - 1;
      const casos: [string, () => void][] = [
        ['BFS', () => void bfs(red, 0)],
        ['DFS', () => void dfsIterativo(red, 0)],
        ['DFS recursivo', () => void dfsRecursivo(red, 0)],
        ['Dijkstra heap', () => void dijkstra(red, 0)],
        ['Dijkstra arreglo', () => void dijkstraArreglo(red, 0)],
        ['Dijkstra perezoso', () => void dijkstraPerezoso(red, 0)],
        ['A*', () => void aEstrella(red, 0, lejos)],
      ];
      for (const [algo, fn] of casos) {
        const m = medir(fn, reloj, { repeticiones: 21, minimoMs: 5, calentamientoMs: 60 });
        filas.push({ tipo, algoritmo: algo, n: V, vias: E, mediana_us: Number(m.medianaUs.toFixed(3)), iqr_us: Number(m.iqrUs.toFixed(3)), repeticiones: m.repeticiones, lote: m.lote });
        const k = (porAlgo[algo] ??= { v: [], e: [], t: [] });
        k.v.push(V);
        k.e.push(2 * E);
        k.t.push(m.medianaUs);
      }
    }
    const curvas: Record<string, keyof typeof CURVAS> = { BFS: 'lineal', DFS: 'lineal', 'DFS recursivo': 'lineal', 'Dijkstra heap': 'lineal_log', 'Dijkstra perezoso': 'lineal_log', 'Dijkstra arreglo': 'cuadratica' };
    for (const [algo, nombre] of Object.entries(curvas)) {
      const k = porAlgo[algo];
      const f = k.v.map((v, i) => CURVAS[nombre](v, k.e[i]));
      const a = ajustarConstante(f, k.t);
      ajustes.push({ tipo, algoritmo: algo, curva: nombre, c_us: a.c, r2: Number(a.r2.toFixed(5)) });
    }
    console.log(`  tiempos ${tipo} listo`);
  }
  guardar('tiempos', filas);
  guardar('ajustes', ajustes);
}

/** Pregunta 2: cuenta exacta de iteraciones contra la fórmula, en redes dirigidas y no dirigidas. */
function contadores(): void {
  const filas: Record<string, unknown>[] = [];
  for (const tipo of ['geometrica', 'cuadricula', 'metro'] as TipoRed[]) {
    for (const dirigida of [false, true]) {
      for (const n of TAMANOS) {
        const red = generarRed(tipo, n, SEMILLA, { dirigida });
        const b = bfs(red, 0);
        const d = dfsIterativo(red, 0);
        let sumaGrados = 0;
        for (let u = 0; u < n; u++) sumaGrados += red.adj.grado(u);
        filas.push({
          tipo,
          dirigida,
          n,
          vias: red.numVias,
          teorico_externo: n,
          teorico_interno: dirigida ? red.numVias : 2 * red.numVias,
          suma_grados: sumaGrados,
          bfs_externo: b.contadores.externas,
          bfs_interno: b.contadores.internas,
          dfs_visitas: d.visitados,
          dfs_pops: d.contadores.externas,
          dfs_interno: d.contadores.internas,
          dfs_max_pila: d.contadores.maximoEstructura,
          bfs_max_cola: b.contadores.maximoEstructura,
        });
      }
    }
  }
  guardar('contadores', filas);
}

/** Mediana de 5 mediciones: una sola se la lleva el recolector de basura en redes pequeñas. */
function bytesMedidos(crear: () => unknown): { bytes: number; ref: unknown } {
  const muestras: number[] = [];
  let ref: unknown;
  for (let i = 0; i < 5; i++) {
    gc?.();
    gc?.();
    const a = process.memoryUsage();
    ref = crear();
    gc?.();
    gc?.();
    const b = process.memoryUsage();
    muestras.push(b.heapUsed + b.arrayBuffers - a.heapUsed - a.arrayBuffers);
  }
  muestras.sort((x, y) => x - y);
  return { bytes: muestras[2], ref };
}

/** Pregunta 1: memoria teórica y medida, y tiempo de BFS y DFS en lista y en matriz. */
function matrizVsLista(): void {
  const filas: Record<string, unknown>[] = [];
  for (const n of TAMANOS) {
    const red = generarRed('geometrica', n, SEMILLA);
    const lista = medir(() => void bfs(red, 0), reloj, { minimoMs: 5, calentamientoMs: 40 });
    const listaD = medir(() => void dfsIterativo(red, 0), reloj, { minimoMs: 5, calentamientoMs: 40 });
    const memoria = bytesMedidos(() => red.matriz('km'));
    const m = memoria.ref as ReturnType<RedTransporte['matriz']>;
    const matriz = medir(() => void bfsMatriz(m, 0), reloj, { repeticiones: n >= 2500 ? 7 : 15 });
    const matrizD = medir(() => void dfsMatriz(m, 0), reloj, { repeticiones: n >= 2500 ? 7 : 15 });
    const memLista = bytesMedidos(() => generarRed('geometrica', n, SEMILLA).adj);
    filas.push({
      n,
      vias: red.numVias,
      densidad: Number(((2 * red.numVias) / (n * (n - 1))).toFixed(5)),
      lista_bytes_teorico: red.adj.bytesTeoricos(),
      matriz_bytes_teorico: m.bytesTeoricos(),
      lista_bytes_medido: memLista.bytes,
      matriz_bytes_medido: memoria.bytes,
      bfs_lista_us: Number(lista.medianaUs.toFixed(2)),
      bfs_matriz_us: Number(matriz.medianaUs.toFixed(2)),
      dfs_lista_us: Number(listaD.medianaUs.toFixed(2)),
      dfs_matriz_us: Number(matrizD.medianaUs.toFixed(2)),
      celdas_matriz: bfsMatriz(m, 0).celdas,
      arcos_lista: bfs(red, 0).contadores.internas,
    });
    console.log(`  matriz vs lista N = ${n}`);
  }
  guardar('matriz_lista', filas);
}

/** Pregunta 4: heap contra arreglo, barriendo la densidad para hallar el punto de cruce. */
function cruceDijkstra(): void {
  const filas: Record<string, unknown>[] = [];
  const cruces: Record<string, unknown>[] = [];
  for (const n of [250, 500, 1000, 2000]) {
    const densidades = [0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1];
    const serie: { p: number; heap: number; arreglo: number; e: number }[] = [];
    for (const densidad of densidades) {
      if (n === 2000 && densidad > 0.5) continue; // 2 millones de vías ya no aportan al cruce y llenan la RAM
      const red = generarRed('densa', n, SEMILLA, { densidad });
      const heap = medir(() => void dijkstra(red, 0), reloj, { repeticiones: 11, calentamientoMs: 40 });
      const arreglo = medir(() => void dijkstraArreglo(red, 0), reloj, { repeticiones: 11, calentamientoMs: 40 });
      filas.push({ n, densidad, vias: red.numVias, heap_us: Number(heap.medianaUs.toFixed(2)), arreglo_us: Number(arreglo.medianaUs.toFixed(2)), razon: Number((heap.medianaUs / arreglo.medianaUs).toFixed(3)), e_teorico_cruce: Math.round((n * n) / Math.log2(n)) });
      serie.push({ p: densidad, heap: heap.medianaUs, arreglo: arreglo.medianaUs, e: red.numVias });
    }
    // Interpolación en escala logarítmica entre el último punto donde gana el heap y el primero donde gana el arreglo
    let cruce: number | null = null;
    let eCruce: number | null = null;
    for (let i = 1; i < serie.length; i++) {
      const a = serie[i - 1];
      const b = serie[i];
      if (a.heap <= a.arreglo && b.heap > b.arreglo) {
        const fa = Math.log(a.heap / a.arreglo);
        const fb = Math.log(b.heap / b.arreglo);
        const u = fa / (fa - fb);
        cruce = Math.exp(Math.log(a.p) + u * (Math.log(b.p) - Math.log(a.p)));
        eCruce = Math.exp(Math.log(a.e) + u * (Math.log(b.e) - Math.log(a.e)));
        break;
      }
    }
    cruces.push({ n, densidad_cruce: cruce === null ? '' : Number(cruce.toFixed(4)), vias_cruce: eCruce === null ? '' : Math.round(eCruce), vias_teoricas: Math.round((n * n) / Math.log2(n)), max_vias: (n * (n - 1)) / 2 });
    console.log(`  cruce Dijkstra N = ${n}`);
  }
  guardar('cruce_dijkstra', filas);
  guardar('cruce_resumen', cruces);
}

/** A* contra Dijkstra con la misma consulta, por tipo de red y distancia entre origen y destino. */
function aEstrellaVsDijkstra(): void {
  const filas: Record<string, unknown>[] = [];
  for (const tipo of ['geometrica', 'cuadricula', 'metro'] as TipoRed[]) {
    for (const n of [10, 50, 100, 250, 500, 1000, 2500, 5000]) {
      const red = generarRed(tipo, n, SEMILLA);
      for (const metrica of ['km', 'min'] as const) {
        const lista = pares(red, n >= 2500 ? 30 : 60, SEMILLA + n);
        let expD = 0;
        let expA = 0;
        let relD = 0;
        let relA = 0;
        let iguales = 0;
        for (const [s, t] of lista) {
          const d = dijkstra(red, s, t, { metrica });
          const a = aEstrella(red, s, t, { metrica });
          expD += d.contadores.expandidos;
          expA += a.contadores.expandidos;
          relD += d.contadores.relajaciones;
          relA += a.contadores.relajaciones;
          if (Math.abs(d.costo - a.costo) < 1e-9) iguales++;
        }
        const tD = medir(() => {
          for (const [s, t] of lista) dijkstra(red, s, t, { metrica });
        }, reloj, { repeticiones: 7 });
        const tA = medir(() => {
          for (const [s, t] of lista) aEstrella(red, s, t, { metrica });
        }, reloj, { repeticiones: 7 });
        const q = lista.length;
        filas.push({
          tipo,
          n,
          metrica,
          consultas: q,
          expandidos_dijkstra: Number((expD / q).toFixed(1)),
          expandidos_aestrella: Number((expA / q).toFixed(1)),
          reduccion_pct: Number((100 * (1 - expA / expD)).toFixed(1)),
          relajaciones_dijkstra: Number((relD / q).toFixed(1)),
          relajaciones_aestrella: Number((relA / q).toFixed(1)),
          dijkstra_us: Number((tD.medianaUs / q).toFixed(2)),
          aestrella_us: Number((tA.medianaUs / q).toFixed(2)),
          costos_iguales: iguales,
        });
      }
    }
    console.log(`  A* vs Dijkstra ${tipo} listo`);
  }
  guardar('aestrella_dijkstra', filas);

  const pesos: Record<string, unknown>[] = [];
  const red = generarRed('geometrica', 2500, SEMILLA);
  const lista = pares(red, 40, SEMILLA);
  const optimos = lista.map(([s, t]) => dijkstra(red, s, t).costo);
  for (const w of [1, 1.2, 1.5, 2, 3, 5]) {
    let exp = 0;
    let sobrecosto = 0;
    let peor = 0;
    lista.forEach(([s, t], i) => {
      const r = aEstrella(red, s, t, { pesoHeuristica: w });
      exp += r.contadores.expandidos;
      const ex = r.costo / optimos[i] - 1;
      sobrecosto += ex;
      if (ex > peor) peor = ex;
    });
    pesos.push({ w, expandidos: Number((exp / lista.length).toFixed(1)), sobrecosto_medio_pct: Number(((100 * sobrecosto) / lista.length).toFixed(3)), sobrecosto_max_pct: Number((100 * peor).toFixed(3)) });
  }
  guardar('aestrella_ponderado', pesos);
}

/** Ordenamientos con distintas entradas: tiempo, comparaciones y movimientos. */
function ordenamientos(): void {
  const filas: Record<string, unknown>[] = [];
  const cmp = (a: number, b: number) => a - b;
  const entradas: Record<string, (n: number) => Float64Array> = {
    azar: (n) => {
      const r = mulberry32(SEMILLA);
      return Float64Array.from({ length: n }, () => r());
    },
    ordenada: (n) => Float64Array.from({ length: n }, (_, i) => i),
    invertida: (n) => Float64Array.from({ length: n }, (_, i) => n - i),
    pocos_valores: (n) => {
      const r = mulberry32(SEMILLA);
      return Float64Array.from({ length: n }, () => enteroAzar(r, 8));
    },
  };
  for (const n of [100, 1000, 5000, 10000, 50000, 100000]) {
    for (const [nombre, gen] of Object.entries(entradas)) {
      const base = gen(n);
      const algos: [string, (a: Float64Array) => ReturnType<typeof contadoresOrdenVacios>][] = [
        ['MergeSort', (a) => mergeSort(a, cmp)],
        ['QuickSort mediana de 3', (a) => quickSort(a, cmp)],
        ['HeapSort', (a) => heapSort(a, cmp)],
      ];
      if (n <= 5000) algos.push(['QuickSort último pivote', (a) => quickSort(a, cmp, contadoresOrdenVacios(), 'ultimo')]);
      for (const [algo, f] of algos) {
        const c = f(new Float64Array(base));
        const m = medir(() => void f(new Float64Array(base)), reloj, { repeticiones: n >= 50000 ? 5 : 9, calentamiento: 1 });
        filas.push({ n, entrada: nombre, algoritmo: algo, comparaciones: c.comparaciones, movimientos: c.movimientos, mediana_us: Number(m.medianaUs.toFixed(2)), n_lg_n: Math.round(n * Math.log2(n)) });
      }
    }
  }
  guardar('ordenamientos', filas);
}

/** Pregunta 6: reordenar en cada actualización contra la cola de prioridad indexada. */
function pregunta6(): void {
  const filas: Record<string, unknown>[] = [];
  for (const n of [100, 500, 1000, 2000, 5000]) {
    const m = 200;
    for (const estrategia of ['quick', 'heap', 'cola'] as const) {
      const muestras: number[] = [];
      let r = experimentoP6(n, m, SEMILLA, estrategia, reloj);
      for (let i = 0; i < 5; i++) {
        r = experimentoP6(n, m, SEMILLA, estrategia, reloj);
        muestras.push(r.ms);
      }
      muestras.sort((a, b) => a - b);
      filas.push({ n, m, estrategia, comparaciones: r.comparaciones, movimientos: r.movimientos, ms: Number(muestras[2].toFixed(3)), maximo_final: r.maximoFinal });
    }
  }
  guardar('p6', filas);
}

/** Estructuras: BUILD-HEAP, árbol k-d, tabla hash y costo del tracer. */
function estructuras(): void {
  const heap: Record<string, unknown>[] = [];
  for (const n of [1000, 10000, 100000, 1000000]) {
    const r = mulberry32(SEMILLA);
    const claves = Float64Array.from({ length: n }, () => r());
    const ids = Int32Array.from({ length: n }, (_, i) => i);
    const h1 = new MinHeapIndexado(n);
    h1.construir(ids, claves);
    const h2 = new MinHeapIndexado(n);
    for (let i = 0; i < n; i++) h2.insertar(i, claves[i]);
    heap.push({ n, build_comparaciones: h1.comparaciones, inserciones_comparaciones: h2.comparaciones, comparaciones_por_n: Number((h1.comparaciones / n).toFixed(3)) });
  }
  guardar('build_heap', heap);

  const kd: Record<string, unknown>[] = [];
  for (const n of [1000, 5000, 20000, 100000]) {
    const r = mulberry32(SEMILLA);
    const xs = Float64Array.from({ length: n }, () => r() * 1000);
    const ys = Float64Array.from({ length: n }, () => r() * 1000);
    const m = medir(() => void new KDTree(xs, ys), reloj, { repeticiones: 5, calentamiento: 1 });
    const t = new KDTree(xs, ys);
    let visitas = 0;
    const q = 500;
    const consulta = medir(() => {
      const a = mulberry32(7);
      for (let i = 0; i < q; i++) t.masCercano(a() * 1000, a() * 1000);
    }, reloj, { repeticiones: 5, calentamiento: 1 });
    const a = mulberry32(7);
    for (let i = 0; i < q; i++) {
      t.masCercano(a() * 1000, a() * 1000);
      visitas += t.visitados;
    }
    kd.push({ n, construir_us: Number(m.medianaUs.toFixed(1)), n_lg_n: Math.round(n * Math.log2(n)), us_por_n_lg_n: Number((m.medianaUs / (n * Math.log2(n))).toFixed(5)), consulta_us: Number((consulta.medianaUs / q).toFixed(3)), visitados_medio: Number((visitas / q).toFixed(1)) });
  }
  guardar('kdtree', kd);

  const hash: Record<string, unknown>[] = [];
  for (const n of [1000, 10000, 100000]) {
    const t = new TablaHash<number>();
    const m = medir(() => {
      const x = new TablaHash<number>();
      for (let i = 0; i < n; i++) x.poner(`E${i}`, i);
    }, reloj, { repeticiones: 5, calentamiento: 1 });
    for (let i = 0; i < n; i++) t.poner(`E${i}`, i);
    const b = medir(() => {
      for (let i = 0; i < n; i++) t.obtener(`E${i}`);
    }, reloj, { repeticiones: 5, calentamiento: 1 });
    hash.push({ n, insertar_us_por_op: Number((m.medianaUs / n).toFixed(4)), buscar_us_por_op: Number((b.medianaUs / n).toFixed(4)), factor_carga: Number(t.factorCarga.toFixed(3)), cubeta_mas_larga: t.cubetaMasLarga(), redimensionamientos: t.redimensionamientos });
  }
  guardar('tabla_hash', hash);

  const tr: Record<string, unknown>[] = [];
  for (const n of [100, 500, 2500]) {
    const red = generarRed('geometrica', n, SEMILLA);
    const sin = medir(() => void dijkstra(red, 0), reloj);
    const con = medir(() => void dijkstra(red, 0, -1, {}, new TracerMemoria(1e6)), reloj, { repeticiones: 5, calentamiento: 1 });
    tr.push({ n, sin_tracer_us: Number(sin.medianaUs.toFixed(2)), con_tracer_us: Number(con.medianaUs.toFixed(2)), razon: Number((con.medianaUs / sin.medianaUs).toFixed(1)) });
  }
  guardar('tracer', tr);
}

const SECCIONES: Record<string, () => void> = { tiempos, contadores, matrizVsLista, cruceDijkstra, aEstrellaVsDijkstra, ordenamientos, pregunta6, estructuras };

const pedidas = process.argv.slice(2);
const inicio = Date.now();
maquina();
if (gc === undefined) console.log('Aviso: sin --expose-gc la memoria medida tendrá más ruido.');
for (const [nombre, fn] of Object.entries(SECCIONES)) {
  if (pedidas.length > 0 && !pedidas.includes(nombre)) continue;
  console.log(`\n${nombre}`);
  fn();
}
console.log(`\nListo en ${((Date.now() - inicio) / 60000).toFixed(1)} min.`);
