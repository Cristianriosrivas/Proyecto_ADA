// Datos del informe: todas las cifras se leen de bench/resultados y de las ejecuciones reales.
import { existsSync, readFileSync } from 'node:fs';
import { heuristicaEuclidiana, costosHastaDestino } from '../src/core/algoritmos/heuristica';
import { rutasSimples } from '../src/core/algoritmos/rutasSimples';
import { cargarPreset } from '../src/redes/presets';
import { CASOS, ejecutarCaso } from '../src/ui/datos/escritorio';

const RES = 'bench/resultados';
const leer = <T,>(n: string): T => JSON.parse(readFileSync(`${RES}/${n}.json`, 'utf8')) as T;

export interface Datos {
  valores: Record<string, string>;
  tablas: Record<string, () => string>;
}

const ent = (v: number) => Math.round(v).toLocaleString('es-CO');
const dec = (v: number, d = 1) => v.toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
/** Tiempo legible a partir de microsegundos. */
const tiempo = (us: number) => (us >= 1e6 ? `${dec(us / 1e6, 2)} s` : us >= 1e3 ? `${dec(us / 1e3, 2)} ms` : `${dec(us, us >= 100 ? 0 : 1)} μs`);
const bytes = (b: number) => (b >= 2 ** 20 ? `${dec(b / 2 ** 20, 1)} MiB` : b >= 1024 ? `${dec(b / 1024, 1)} KiB` : `${ent(b)} B`);

function tabla(cab: string[], filas: (string | number)[][]): string {
  const f = (c: (string | number)[]) => `| ${c.map((x) => String(x).replace(/\|/g, '\\|')).join(' | ')} |`;
  return [f(cab), f(cab.map(() => '---')), ...filas.map(f)].join('\n');
}

interface Tiempo {
  tipo: string;
  algoritmo: string;
  n: number;
  vias: number;
  mediana_us: number;
  iqr_us: number;
}
interface Ajuste {
  tipo: string;
  algoritmo: string;
  curva: string;
  c_us: number;
  r2: number;
}
interface Contador {
  tipo: string;
  dirigida: boolean;
  n: number;
  vias: number;
  teorico_externo: number;
  teorico_interno: number;
  suma_grados: number;
  bfs_externo: number;
  bfs_interno: number;
  dfs_visitas: number;
  dfs_pops: number;
  dfs_interno: number;
  dfs_max_pila: number;
  bfs_max_cola: number;
}
interface MatrizLista {
  n: number;
  vias: number;
  densidad: number;
  lista_bytes_teorico: number;
  matriz_bytes_teorico: number;
  lista_bytes_medido: number;
  matriz_bytes_medido: number;
  bfs_lista_us: number;
  bfs_matriz_us: number;
  dfs_lista_us: number;
  dfs_matriz_us: number;
  celdas_matriz: number;
  arcos_lista: number;
}
interface Cruce {
  n: number;
  densidad: number;
  vias: number;
  heap_us: number;
  arreglo_us: number;
  razon: number;
}
interface CruceResumen {
  n: number;
  densidad_cruce: number | string;
  vias_cruce: number | string;
  vias_teoricas: number;
  max_vias: number;
}
interface AE {
  tipo: string;
  n: number;
  metrica: string;
  consultas: number;
  expandidos_dijkstra: number;
  expandidos_aestrella: number;
  reduccion_pct: number;
  relajaciones_dijkstra: number;
  relajaciones_aestrella: number;
  dijkstra_us: number;
  aestrella_us: number;
  costos_iguales: number;
}
interface Pond {
  w: number;
  expandidos: number;
  sobrecosto_medio_pct: number;
  sobrecosto_max_pct: number;
}
interface Orden {
  n: number;
  entrada: string;
  algoritmo: string;
  comparaciones: number;
  movimientos: number;
  mediana_us: number;
  n_lg_n: number;
}
interface P6 {
  n: number;
  m: number;
  estrategia: string;
  comparaciones: number;
  movimientos: number;
  ms: number;
}

export function datosInforme(): Datos {
  const maquina = leer<{ cpu: string; ramGB: number; nucleos: number; so: string; node: string; semilla: number; fecha: string }>('maquina');
  const t = leer<Tiempo[]>('tiempos');
  const aj = leer<Ajuste[]>('ajustes');
  const ct = leer<Contador[]>('contadores');
  const ml = leer<MatrizLista[]>('matriz_lista');
  const cr = leer<Cruce[]>('cruce_dijkstra');
  const cres = leer<CruceResumen[]>('cruce_resumen');
  const ae = leer<AE[]>('aestrella_dijkstra');
  const pond = leer<Pond[]>('aestrella_ponderado');
  const orden = leer<Orden[]>('ordenamientos');
  const p6 = leer<P6[]>('p6');
  const bh = leer<{ n: number; build_comparaciones: number; inserciones_comparaciones: number; comparaciones_por_n: number }[]>('build_heap');
  const kd = leer<{ n: number; construir_us: number; us_por_n_lg_n: number; consulta_us: number; visitados_medio: number }[]>('kdtree');
  const th = leer<{ n: number; insertar_us_por_op: number; buscar_us_por_op: number; factor_carga: number; cubeta_mas_larga: number; redimensionamientos: number }[]>('tabla_hash');
  const tr = leer<{ n: number; sin_tracer_us: number; con_tracer_us: number; razon: number }[]>('tracer');

  const us = (tipo: string, algo: string, n: number) => {
    const f = t.find((x) => x.tipo === tipo && x.algoritmo === algo && x.n === n);
    if (!f) throw new Error(`Sin dato ${tipo} ${algo} ${n}`);
    return f.mediana_us;
  };
  const ml5000 = ml[ml.length - 1];
  const p6n = (n: number, e: string) => p6.find((f) => f.n === n && f.estrategia === e) as P6;
  const aeG = (n: number, m = 'km', tipo = 'geometrica') => ae.find((f) => f.tipo === tipo && f.n === n && f.metrica === m) as AE;
  const r2 = (tipo: string, a: string) => (aj.find((x) => x.tipo === tipo && x.algoritmo === a) as Ajuste).r2;

  const valores: Record<string, string> = {
    cpu: maquina.cpu,
    ram: dec(maquina.ramGB, 1),
    nucleos: String(maquina.nucleos),
    so: maquina.so,
    node: maquina.node,
    semilla: String(maquina.semilla),
    mem_razon_5000: ent(ml5000.matriz_bytes_teorico / ml5000.lista_bytes_teorico),
    mem_lista_5000: bytes(ml5000.lista_bytes_teorico),
    mem_matriz_5000: bytes(ml5000.matriz_bytes_teorico),
    bfs_razon_5000: ent(ml5000.bfs_matriz_us / ml5000.bfs_lista_us),
    dfs_razon_5000: ent(ml5000.dfs_matriz_us / ml5000.dfs_lista_us),
    bfs_lista_5000: tiempo(ml5000.bfs_lista_us),
    bfs_matriz_5000: tiempo(ml5000.bfs_matriz_us),
    densidad_5000: dec(ml5000.densidad * 100, 2),
    ae_reduccion_5000: dec(aeG(5000).reduccion_pct, 0),
    ae_reduccion_1000: dec(aeG(1000).reduccion_pct, 0),
    ae_reduccion_100: dec(aeG(100).reduccion_pct, 0),
    ae_reduccion_50: dec(aeG(50).reduccion_pct, 0),
    ae_reduccion_10: dec(aeG(10).reduccion_pct, 0),
    ae_cuadricula_5000: dec(aeG(5000, 'km', 'cuadricula').reduccion_pct, 0),
    ae_metro_5000: dec(aeG(5000, 'km', 'metro').reduccion_pct, 0),
    ae_min_5000: dec(aeG(5000, 'min').reduccion_pct, 0),
    ae_consultas_total: ent(ae.reduce((s, f) => s + f.consultas, 0)),
    ae_iguales_total: ent(ae.reduce((s, f) => s + f.costos_iguales, 0)),
    ae_us_d_5000: tiempo(aeG(5000).dijkstra_us),
    ae_us_a_5000: tiempo(aeG(5000).aestrella_us),
    p6_razon_5000: ent(p6n(5000, 'quick').ms / p6n(5000, 'cola').ms),
    p6_quick_5000: dec(p6n(5000, 'quick').ms, 1),
    p6_heap_5000: dec(p6n(5000, 'heap').ms, 1),
    p6_cola_5000: dec(p6n(5000, 'cola').ms, 2),
    p6_m: String(p6[0].m),
    p6_comp_quick_5000: ent(p6n(5000, 'quick').comparaciones),
    p6_comp_cola_5000: ent(p6n(5000, 'cola').comparaciones),
    r2_bfs: dec(r2('geometrica', 'BFS'), 3),
    r2_dfs: dec(r2('geometrica', 'DFS'), 3),
    r2_heap: dec(r2('geometrica', 'Dijkstra heap'), 3),
    r2_arreglo: dec(r2('geometrica', 'Dijkstra arreglo'), 3),
    bfs_5000: tiempo(us('geometrica', 'BFS', 5000)),
    dfs_5000: tiempo(us('geometrica', 'DFS', 5000)),
    heap_5000: tiempo(us('geometrica', 'Dijkstra heap', 5000)),
    arreglo_5000: tiempo(us('geometrica', 'Dijkstra arreglo', 5000)),
    razon_heap_arreglo_5000: dec(us('geometrica', 'Dijkstra arreglo', 5000) / us('geometrica', 'Dijkstra heap', 5000), 0),
    contadores_filas: String(ct.length),
    contadores_ok: String(ct.filter((c) => c.bfs_externo === c.teorico_externo && c.bfs_interno === c.teorico_interno && c.dfs_visitas === c.teorico_externo && c.dfs_interno === c.teorico_interno).length),
    dfs_pila_max: ent(Math.max(...ct.map((c) => c.dfs_max_pila))),
    tracer_razon: dec(tr[1].razon, 0),
    build_por_n: dec(bh[bh.length - 1].comparaciones_por_n, 2),
    fecha_bench: maquina.fecha.slice(0, 10),
    r2_min_lineal: dec(Math.min(...aj.filter((a) => a.curva !== 'lineal_log').map((a) => a.r2)), 3),
    r2_max_lineal: dec(Math.max(...aj.filter((a) => a.curva !== 'lineal_log').map((a) => a.r2)), 3),
    r2_min_heap: dec(Math.min(...aj.filter((a) => a.curva === 'lineal_log').map((a) => a.r2)), 3),
    r2_max_heap: dec(Math.max(...aj.filter((a) => a.curva === 'lineal_log').map((a) => a.r2)), 3),
  };
  const azar = orden.filter((f) => f.n === 100000 && f.entrada === 'azar');
  const masRapido = azar.reduce((a, b) => (b.mediana_us < a.mediana_us ? b : a));
  const menosComp = azar.reduce((a, b) => (b.comparaciones < a.comparaciones ? b : a));
  valores.orden_rapido = masRapido.algoritmo;
  valores.orden_rapido_t = tiempo(masRapido.mediana_us);
  valores.orden_menos_comp = menosComp.algoritmo;
  valores.kd_min = dec(Math.min(...kd.map((f) => f.us_por_n_lg_n)), 3);
  valores.kd_max = dec(Math.max(...kd.map((f) => f.us_por_n_lg_n)), 3);

  const denso = cr.find((f) => f.n === 1000 && f.densidad === 1) as Cruce & { mejoras: number };
  valores.vias_1000_100 = ent(denso.vias);
  valores.mejoras_1000_100 = ent(denso.mejoras);
  valores.razon_1000_100 = dec(denso.razon, 2);
  const heapMax = (tipo: string) => ent((ct.find((c) => c.tipo === tipo && !c.dirigida && c.n === 5000) as Contador & { dijkstra_max_heap: number }).dijkstra_max_heap);
  valores.heap_max_geo_5000 = heapMax('geometrica');
  valores.heap_max_cuad_5000 = heapMax('cuadricula');
  valores.heap_max_metro_5000 = heapMax('metro');
  for (const c of cres) valores[`cruce_vias_${c.n}`] = c.vias_cruce === '' ? 'no hubo cruce' : ent(Number(c.vias_cruce));
  for (const c of cres) valores[`cruce_teorico_${c.n}`] = ent(c.vias_teoricas);
  // Frase para cada N: el cruce puede no ocurrir dentro de las densidades medidas
  for (const c of cres) {
    const maxDens = Math.max(...cr.filter((f) => f.n === c.n).map((f) => f.densidad));
    valores[`cruce_frase_${c.n}`] = c.vias_cruce === '' ? `el heap siguió ganando hasta el ${dec(maxDens * 100, 0)} % de densidad, el mayor valor medido` : `el arreglo empezó a ganar desde unas ${ent(Number(c.vias_cruce))} vías, frente a una estimación de ${ent(c.vias_teoricas)}`;
  }

  const docente = cargarPreset('docente');
  const rutasAE = rutasSimples(docente, docente.indiceDe('A'), docente.indiceDe('E'));
  valores.rutas_ae = String(rutasAE.rutas.length);

  if (existsSync('coverage/coverage-summary.json')) {
    const cob = JSON.parse(readFileSync('coverage/coverage-summary.json', 'utf8')) as { total: { lines: { pct: number } } };
    valores.cobertura = dec(cob.total.lines.pct, 1);
  } else valores.cobertura = 'sin medir';
  if (existsSync('coverage/vitest.json')) {
    const v = JSON.parse(readFileSync('coverage/vitest.json', 'utf8')) as { numTotalTests: number };
    valores.tests = String(v.numTotalTests);
  } else valores.tests = 'sin medir';

  const casos = CASOS.map((c) => ejecutarCaso(docente, c));
  const traza = (i: number) => () => tabla(['#', 'Evento', 'Estructura al final', 'd[ ]', 'π[ ]', 'Cerrados'], casos[i].filas.map((f, k) => [k + 1, f.evento, f.estructura, f.d, f.pi, f.visitados]));

  const tablas: Record<string, () => string> = {
    coordenadas: () => {
      const tt = docente.indiceDe('H');
      const h = heuristicaEuclidiana(docente, tt, 'km');
      const real = costosHastaDestino(docente, tt, 'km');
      return tabla(['Estación', 'x (km)', 'y (km)', 'h(n)', 'h*(n)'], Array.from({ length: 8 }, (_, i) => [docente.estacion(i).id, dec(docente.estacion(i).x), dec(docente.estacion(i).y), dec(h[i], 2), dec(real[i], 0)]));
    },
    estructuras: () =>
      tabla(['Estructura', 'Uso', 'Operaciones', 'Costo'], [
        ['Cola circular', 'BFS', 'encolar, desencolar', 'O(1) amortizado'],
        ['Pila', 'DFS', 'apilar, desapilar', 'O(1) amortizado'],
        ['Lista de adyacencia', 'Toda la red', 'insertar arco; vecinos de u', 'O(1); Θ(deg u)'],
        ['Matriz de adyacencia', 'Comparación', 'existe (u, v); vecinos de u', 'O(1); Θ(V)'],
        ['Min-Heap indexado', 'Dijkstra, A*, top-k', 'insert, extractMin, decreaseKey; mínimo', 'O(lg n); O(1)'],
        ['Tabla hash', 'Nombre a índice', 'poner, obtener', 'Θ(1 + α) promedio'],
        ['Árbol k-d', 'Clic, k-NN', 'construir; más cercano', 'Θ(n lg n); O(lg n) esperado'],
      ]),
    tabla_hash: () => tabla(['n', 'Insertar (μs/op)', 'Buscar (μs/op)', 'Factor de carga', 'Cubeta más larga', 'Redimensionamientos'], th.map((f) => [ent(f.n), dec(f.insertar_us_por_op, 3), dec(f.buscar_us_por_op, 3), dec(f.factor_carga, 3), f.cubeta_mas_larga, f.redimensionamientos])),
    kdtree: () => tabla(['n', 'Construir', 'μs / (n lg n)', 'Consulta', 'Nodos visitados'], kd.map((f) => [ent(f.n), tiempo(f.construir_us), dec(f.us_por_n_lg_n, 4), tiempo(f.consulta_us), dec(f.visitados_medio, 1)])),
    build_heap: () => tabla(['n', 'BUILD-HEAP: comparaciones', 'Por elemento', 'n inserciones: comparaciones'], bh.map((f) => [ent(f.n), ent(f.build_comparaciones), dec(f.comparaciones_por_n, 2), ent(f.inserciones_comparaciones)])),
    escala: () =>
      tabla(['N', '|E|', 'Externo BFS', 'Interno BFS', 'Barrido del arreglo, V(V + 1)', 'BFS', 'Dijkstra heap', 'Dijkstra arreglo'], [10, 50, 100].map((n) => {
        const c = ct.find((x) => x.tipo === 'geometrica' && !x.dirigida && x.n === n) as Contador;
        return [n, c.vias, c.bfs_externo, c.bfs_interno, ent(n * (n + 1)), tiempo(us('geometrica', 'BFS', n)), tiempo(us('geometrica', 'Dijkstra heap', n)), tiempo(us('geometrica', 'Dijkstra arreglo', n))];
      })),
    tiempos: () => {
      const ns = [...new Set(t.map((f) => f.n))];
      const algos = ['BFS', 'DFS', 'DFS recursivo', 'Dijkstra heap', 'Dijkstra perezoso', 'Dijkstra arreglo', 'A*'];
      return tabla(['N', '|E|', ...algos], ns.map((n) => [ent(n), ent((t.find((f) => f.tipo === 'geometrica' && f.n === n) as Tiempo).vias), ...algos.map((a) => tiempo(us('geometrica', a, n)))]));
    },
    iqr: () => {
      const ns = [100, 1000, 5000];
      const algos = ['BFS', 'Dijkstra heap', 'Dijkstra arreglo'];
      return tabla(['Algoritmo', ...ns.map((n) => `N = ${ent(n)}`)], algos.map((a) => [a, ...ns.map((n) => {
        const f = t.find((x) => x.tipo === 'geometrica' && x.algoritmo === a && x.n === n) as Tiempo;
        return `${tiempo(f.mediana_us)} ± ${tiempo(f.iqr_us / 2)}`;
      })]));
    },
    ajustes: () => {
      const nombre: Record<string, string> = { lineal: 'c·(V + E)', lineal_log: 'c·(V + E)·lg V', cuadratica: 'c·V²' };
      const algos = [...new Set(aj.map((a) => a.algoritmo))];
      return tabla(['Algoritmo', 'Curva', 'c (μs), geométrica', 'R² geométrica', 'R² cuadrícula', 'R² metro'], algos.map((a) => {
        const g = aj.find((x) => x.tipo === 'geometrica' && x.algoritmo === a) as Ajuste;
        return [a, nombre[g.curva], dec(g.c_us, 4), dec(g.r2, 3), dec(r2('cuadricula', a), 3), dec(r2('metro', a), 3)];
      }));
    },
    contadores: () =>
      tabla(['Red', 'N', '|E|', 'Tipo', 'Externo BFS', '|V|', 'Interno BFS', 'Interno DFS', 'Teórico interno', 'Σ deg'], ct.filter((c) => c.tipo === 'geometrica' && [10, 100, 1000, 5000].includes(c.n)).map((c) => ['Geométrica', ent(c.n), ent(c.vias), c.dirigida ? 'Dirigida' : 'No dirigida', ent(c.bfs_externo), ent(c.teorico_externo), ent(c.bfs_interno), ent(c.dfs_interno), ent(c.teorico_interno), ent(c.suma_grados)])),
    pila: () => tabla(['N', '|E|', 'Mayor tamaño de la cola (BFS)', 'Mayor tamaño de la pila (DFS)', 'Entradas que pasaron por la pila'], ct.filter((c) => c.tipo === 'geometrica' && !c.dirigida && [100, 1000, 5000].includes(c.n)).map((c) => [ent(c.n), ent(c.vias), ent(c.bfs_max_cola), ent(c.dfs_max_pila), ent(c.dfs_pops)])),
    matriz_lista: () => tabla(['N', 'Densidad', 'Lista (teórico)', 'Matriz (teórico)', 'Lista (medido)', 'Matriz (medido)', 'BFS lista', 'BFS matriz', 'DFS lista', 'DFS matriz'], ml.map((f) => [ent(f.n), `${dec(f.densidad * 100, 2)} %`, bytes(f.lista_bytes_teorico), bytes(f.matriz_bytes_teorico), bytes(f.lista_bytes_medido), bytes(f.matriz_bytes_medido), tiempo(f.bfs_lista_us), tiempo(f.bfs_matriz_us), tiempo(f.dfs_lista_us), tiempo(f.dfs_matriz_us)])),
    celdas: () => tabla(['N', 'Arcos que recorre la lista', 'Celdas que barre la matriz', 'Razón'], ml.map((f) => [ent(f.n), ent(f.arcos_lista), ent(f.celdas_matriz), ent(f.celdas_matriz / f.arcos_lista)])),
    cruce: () => tabla(['N', 'Vías en el cruce (medido)', 'Densidad del cruce', 'V²/lg V', 'Máximo de vías'], cres.map((c) => [ent(c.n), c.vias_cruce === '' ? 'Sin cruce' : ent(Number(c.vias_cruce)), c.densidad_cruce === '' ? '–' : `${dec(Number(c.densidad_cruce) * 100, 1)} %`, ent(c.vias_teoricas), ent(c.max_vias)])),
    cruce_detalle: () => tabla(['Densidad', '|E|', 'Relajaciones que mejoran', 'Min-Heap', 'Arreglo', 'Heap / arreglo'], (cr as (Cruce & { mejoras: number })[]).filter((f) => f.n === 1000).map((f) => [`${dec(f.densidad * 100, 1)} %`, ent(f.vias), ent(f.mejoras), tiempo(f.heap_us), tiempo(f.arreglo_us), dec(f.razon, 2)])),
    aestrella: () => {
      const f = ae.filter((x) => x.metrica === 'km' && [50, 100, 500, 1000, 5000].includes(x.n));
      return tabla(['Red', 'N', 'Expandidos Dijkstra', 'Expandidos A*', 'Reducción', 'Tiempo Dijkstra', 'Tiempo A*', 'Costos iguales'], f.map((x) => [x.tipo, ent(x.n), dec(x.expandidos_dijkstra, 1), dec(x.expandidos_aestrella, 1), `${dec(x.reduccion_pct, 1)} %`, tiempo(x.dijkstra_us), tiempo(x.aestrella_us), `${x.costos_iguales}/${x.consultas}`]));
    },
    ponderado: () => tabla(['w', 'Nodos expandidos', 'Sobrecosto medio', 'Sobrecosto máximo'], pond.map((f) => [dec(f.w, 1), dec(f.expandidos, 1), `${dec(f.sobrecosto_medio_pct, 2)} %`, `${dec(f.sobrecosto_max_pct, 2)} %`])),
    ordenamientos: () => {
      const f = orden.filter((x) => x.n === 100000 || (x.n === 5000 && x.algoritmo === 'QuickSort último pivote'));
      return tabla(['n', 'Entrada', 'Algoritmo', 'Comparaciones', 'Movimientos', 'Tiempo', 'Comparaciones / (n lg n)'], f.map((x) => [ent(x.n), x.entrada.replace('_', ' '), x.algoritmo, ent(x.comparaciones), ent(x.movimientos), tiempo(x.mediana_us), dec(x.comparaciones / x.n_lg_n, 2)]));
    },
    p6: () => tabla(['n', 'Estrategia', 'Comparaciones', 'Movimientos', 'Tiempo total'], p6.map((f) => [ent(f.n), { quick: 'Reordenar con QuickSort', heap: 'Reordenar con HeapSort', cola: 'Cola de prioridad indexada' }[f.estrategia] as string, ent(f.comparaciones), ent(f.movimientos), `${dec(f.ms, 2)} ms`])),
    tracer: () => tabla(['N', 'Sin tracer', 'Con tracer', 'Razón'], tr.map((f) => [ent(f.n), tiempo(f.sin_tracer_us), tiempo(f.con_tracer_us), dec(f.razon, 0)])),
    escritorio: () => tabla(['Algoritmo', 'Entrada', 'Ruta esperada', 'Ruta obtenida', 'Métrica', 'Coincide'], casos.map((c) => [c.caso.nombre, `(${c.caso.desde}, ${c.caso.hasta})`, c.caso.rutaEsperada, c.ruta, c.metrica, c.coincide ? 'Sí' : 'No'])),
    escritorio_f1: () => tabla(['Algoritmo', 'Entrada', 'Ruta', 'Métrica', 'Complejidad', 'Estructura'], casos.slice(0, 2).map((c) => [c.caso.nombre, `(${c.caso.desde}, ${c.caso.hasta})`, c.ruta, c.metrica, c.caso.complejidad, c.caso.estructura])),
    traza_bfs: traza(0),
    traza_dfs: traza(1),
    traza_dijkstra: traza(2),
    traza_aestrella: traza(3),
    rutas_ae: () => tabla(['#', 'Ruta', 'Costo (km)'], rutasAE.rutas.map((r, i) => [i + 1, Array.from(r.estaciones, (x) => docente.estacion(x).id).join(' → '), r.costo])),
    maquina: () => tabla(['Componente', 'Valor'], [['Procesador', maquina.cpu], ['Núcleos lógicos', maquina.nucleos], ['Memoria', `${dec(maquina.ramGB, 1)} GB`], ['Sistema operativo', maquina.so], ['Node.js', maquina.node], ['Semilla', maquina.semilla]]),
  };
  return { valores, tablas };
}
