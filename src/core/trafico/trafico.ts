import { dijkstra } from '../algoritmos/dijkstra';
import { MinHeapIndexado } from '../estructuras/MinHeapIndexado';
import { enteroAzar, mulberry32 } from '../generadores/azar';
import type { RedTransporte } from '../grafo/RedTransporte';
import type { Metrica } from '../grafo/tipos';
import { contadoresOrdenVacios, heapSort, mergeSort, quickSort, type ContadoresOrden } from '../ordenamiento/ordenamiento';

export type AlgoritmoOrden = 'merge' | 'quick' | 'heap';

/** Fila de la tabla de congestión. */
export interface FilaCongestion {
  via: number;
  origen: number;
  destino: number;
  /** Congestión c ≥ 0: el peso efectivo es base × (1 + c). */
  congestion: number;
  pesoBase: number;
  pesoEfectivo: number;
}

export interface Estadisticas {
  n: number;
  media: number;
  mediana: number;
  percentil90: number;
  desviacion: number;
  minimo: number;
  maximo: number;
}

/** Campana centrada en una hora: modela la subida y bajada de una hora pico. */
function pico(hora: number, centro: number, ancho: number): number {
  const z = (hora - centro) / ancho;
  return Math.exp(-z * z);
}

/** Demanda de la ciudad a una hora: picos en 6–8 a. m. y 5–7 p. m. */
export function demandaHoraria(hora: number): number {
  return 0.12 + 1.0 * pico(hora, 7, 1.15) + 0.9 * pico(hora, 18, 1.25) + 0.28 * pico(hora, 12.5, 2.2);
}

/**
 * Congestión de cada vía a una hora. Cada vía tiene una sensibilidad fija derivada de la
 * semilla, así que la misma hora siempre da la misma tabla: el resultado es reproducible.
 */
export function congestionPorVia(red: RedTransporte, hora: number, semilla = 1): Float64Array {
  const azar = mulberry32(semilla);
  const demanda = demandaHoraria(hora);
  const c = new Float64Array(red.numVias);
  for (let i = 0; i < c.length; i++) {
    const sensibilidad = 0.35 + azar() * 1.15;
    const ruido = 0.92 + azar() * 0.16;
    c[i] = demanda * sensibilidad * ruido;
  }
  return c;
}

/** Peso efectivo por arco. Como c ≥ 0 los pesos solo suben, y h sigue siendo admisible. */
export function pesosEfectivos(red: RedTransporte, metrica: Metrica, congestion: Float64Array): Float64Array {
  const base = red.pesos(metrica);
  const r = new Float64Array(base.length);
  for (let e = 0; e < r.length; e++) r[e] = base[e] * (1 + congestion[red.viaDeArco(e)]);
  return r;
}

export function tablaCongestion(red: RedTransporte, metrica: Metrica, congestion: Float64Array): FilaCongestion[] {
  const filas = new Array<FilaCongestion>(red.numVias);
  for (let i = 0; i < filas.length; i++) {
    const v = red.via(i);
    const base = metrica === 'km' ? v.distanciaKm : v.tiempoMin;
    filas[i] = { via: i, origen: v.origen, destino: v.destino, congestion: congestion[i], pesoBase: base, pesoEfectivo: base * (1 + congestion[i]) };
  }
  return filas;
}

/** Ordena de mayor a menor congestión con el algoritmo elegido. A igual valor, va la vía menor. */
export function ordenarTabla(filas: FilaCongestion[], algoritmo: AlgoritmoOrden): ContadoresOrden {
  const cmp = (a: FilaCongestion, b: FilaCongestion) => b.congestion - a.congestion || a.via - b.via;
  if (algoritmo === 'merge') return mergeSort(filas, cmp);
  if (algoritmo === 'quick') return quickSort(filas, cmp);
  return heapSort(filas, cmp);
}

/**
 * Las k vías más congestionadas: BUILD-HEAP en O(n) y k extracciones en O(lg n).
 * Total O(n + k lg n), mejor que ordenar todo cuando k es pequeño.
 */
export function topK(valores: ArrayLike<number>, k: number): Int32Array {
  const n = valores.length;
  const cuantos = k < n ? k : n;
  const ids = new Int32Array(n);
  const claves = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    ids[i] = i;
    claves[i] = -valores[i]; // El heap es de mínimos: negar la clave lo vuelve de máximos
  }
  const h = new MinHeapIndexado(n > 0 ? n : 1);
  h.construir(ids, claves);
  const r = new Int32Array(cuantos);
  for (let i = 0; i < cuantos; i++) r[i] = h.extraerMin();
  return r;
}

/** Percentil por interpolación lineal sobre datos ordenados. */
function percentil(ordenados: Float64Array, p: number): number {
  const pos = (ordenados.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return ordenados[lo] + (ordenados[hi] - ordenados[lo]) * (pos - lo);
}

export function estadisticas(valores: ArrayLike<number>): Estadisticas {
  const n = valores.length;
  if (n === 0) return { n: 0, media: 0, mediana: 0, percentil90: 0, desviacion: 0, minimo: 0, maximo: 0 };
  const o = new Float64Array(n);
  let suma = 0;
  for (let i = 0; i < n; i++) {
    o[i] = valores[i];
    suma += valores[i];
  }
  mergeSort(o, (a, b) => a - b);
  const media = suma / n;
  let cuadrados = 0;
  for (let i = 0; i < n; i++) cuadrados += (o[i] - media) * (o[i] - media);
  return { n, media, mediana: percentil(o, 0.5), percentil90: percentil(o, 0.9), desviacion: Math.sqrt(cuadrados / n), minimo: o[0], maximo: o[n - 1] };
}

export interface ResultadoViajes {
  viajes: number;
  sinRuta: number;
  /** Veces que un viaje pasó por cada estación. */
  pasosPorEstacion: Int32Array;
  costoPromedio: number;
  costos: Float64Array;
}

/** Simula m viajes entre estaciones al azar y cuenta por dónde pasan. */
export function simularViajes(red: RedTransporte, m: number, semilla: number, metrica: Metrica, pesos?: Float64Array, arcosBloqueados?: Uint8Array): ResultadoViajes {
  const azar = mulberry32(semilla);
  const n = red.numEstaciones;
  const pasos = new Int32Array(n);
  const costos = new Float64Array(m);
  let hechos = 0;
  let sinRuta = 0;
  let suma = 0;
  for (let i = 0; i < m; i++) {
    const s = enteroAzar(azar, n);
    let t = enteroAzar(azar, n);
    if (t === s) t = (t + 1) % n;
    const r = dijkstra(red, s, t, { metrica, pesos, arcosBloqueados });
    if (!r.alcanzado) {
      sinRuta++;
      continue;
    }
    for (let j = 0; j < r.ruta.length; j++) pasos[r.ruta[j]]++;
    costos[hechos++] = r.costo;
    suma += r.costo;
  }
  return { viajes: hechos, sinRuta, pasosPorEstacion: pasos, costoPromedio: hechos > 0 ? suma / hechos : 0, costos: costos.subarray(0, hechos) };
}

/** Marca como bloqueados todos los arcos que tocan una estación o una vía cerrada. */
export function bloquear(red: RedTransporte, estacionesCerradas: ArrayLike<number>, viasCerradas: ArrayLike<number>): Uint8Array {
  const b = new Uint8Array(red.numArcos);
  const cerrada = new Uint8Array(red.numEstaciones);
  for (let i = 0; i < estacionesCerradas.length; i++) cerrada[estacionesCerradas[i]] = 1;
  for (let e = 0; e < b.length; e++) if (cerrada[red.origenDeArco(e)] === 1 || cerrada[red.adj.destino(e)] === 1) b[e] = 1;
  for (let i = 0; i < viasCerradas.length; i++) {
    const v = red.via(viasCerradas[i]);
    b[v.arco] = 1;
    if (v.arcoInverso !== -1) b[v.arcoInverso] = 1;
  }
  return b;
}

export interface ResultadoP6 {
  n: number;
  m: number;
  estrategia: 'quick' | 'heap' | 'cola';
  comparaciones: number;
  movimientos: number;
  ms: number;
  /** Máximo al final: las tres estrategias deben coincidir. */
  maximoFinal: number;
}

/**
 * Experimento de la pregunta 6. Una tabla de n vías recibe m actualizaciones de congestión y
 * tras cada una se pide la vía más congestionada. Se compara reordenar toda la tabla contra
 * actualizar una cola de prioridad indexada, que cuesta O(lg n) y consulta el máximo en O(1).
 */
export function experimentoP6(n: number, m: number, semilla: number, estrategia: 'quick' | 'heap' | 'cola', reloj: () => number): ResultadoP6 {
  const azar = mulberry32(semilla);
  const valores = new Float64Array(n);
  for (let i = 0; i < n; i++) valores[i] = azar();
  const cambios = new Int32Array(m);
  const nuevos = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    cambios[i] = enteroAzar(azar, n);
    nuevos[i] = azar();
  }

  const c = contadoresOrdenVacios();
  let maximoFinal = -1;
  const inicio = reloj();
  if (estrategia === 'cola') {
    const ids = new Int32Array(n);
    const claves = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      ids[i] = i;
      claves[i] = -valores[i];
    }
    const h = new MinHeapIndexado(n);
    h.construir(ids, claves);
    for (let i = 0; i < m; i++) {
      h.actualizarClave(cambios[i], -nuevos[i]);
      maximoFinal = -h.clave(h.minimo());
    }
    c.comparaciones = h.comparaciones;
    c.movimientos = h.intercambios;
  } else {
    // La tabla ya venía ordenada, pero reordenar no aprovecha eso: es lo que se quiere medir
    const tabla = new Float64Array(valores);
    const ids = new Int32Array(n);
    for (let i = 0; i < n; i++) ids[i] = i;
    const cmp = (a: number, b: number) => tabla[b] - tabla[a] || a - b;
    for (let i = 0; i < m; i++) {
      tabla[cambios[i]] = nuevos[i];
      if (estrategia === 'quick') quickSort(ids, cmp, c);
      else heapSort(ids, cmp, c);
      maximoFinal = tabla[ids[0]];
    }
  }
  return { n, m, estrategia, comparaciones: c.comparaciones, movimientos: c.movimientos, ms: reloj() - inicio, maximoFinal };
}
