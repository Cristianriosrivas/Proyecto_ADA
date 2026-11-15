import { aEstrella } from '@core/algoritmos/aEstrella';
import { bfs } from '@core/algoritmos/bfs';
import { dfsIterativo } from '@core/algoritmos/dfs';
import { dijkstra } from '@core/algoritmos/dijkstra';
import type { RedTransporte } from '@core/grafo/RedTransporte';
import type { Metrica } from '@core/grafo/tipos';
import { medir } from '@core/instrumentacion/medicion';
import { TracerMemoria } from '@core/instrumentacion/TracerMemoria';
import type { NombreAlgoritmo, PasoTraza } from '@core/instrumentacion/tipos';
import { georreferencia } from '@redes/osm';

export const NOMBRE_ALGORITMO: Record<NombreAlgoritmo, string> = { bfs: 'BFS', dfs: 'DFS', dijkstra: 'Dijkstra', aestrella: 'A*' };

export const COMPLEJIDAD: Record<NombreAlgoritmo, string> = { bfs: 'O(|V| + |E|)', dfs: 'O(|V| + |E|)', dijkstra: 'O((V + E) log V)', aestrella: 'O((V + E) log V)' };

export const ESTRUCTURA: Record<NombreAlgoritmo, string> = { bfs: 'Cola FIFO circular', dfs: 'Pila LIFO', dijkstra: 'Min-Heap indexado', aestrella: 'Min-Heap + heurística' };

/** Resultado común para la tarjeta del planificador. */
export interface ResultadoVista {
  algoritmo: NombreAlgoritmo;
  ruta: Int32Array;
  alcanzado: boolean;
  costo: number | null;
  saltos: number;
  expandidos: number;
  relajaciones: number | null;
  opsHeap: number | null;
  microsegundos: number;
  estados: Uint8Array;
  /** Estaciones en el orden en que el algoritmo las cerró: sirve para animar la exploración. */
  orden: Int32Array;
}

export interface OpcionesCorrida {
  metrica: Metrica;
  pesos?: Float64Array;
  arcosBloqueados?: Uint8Array;
}

/**
 * Corre el algoritmo del core y mide el tiempo sin tracer, igual que el laboratorio.
 * Si hay vías bloqueadas o pesos con congestión, se le pasan tal cual.
 */
export function correr(red: RedTransporte, algoritmo: NombreAlgoritmo, s: number, t: number, o: OpcionesCorrida): ResultadoVista {
  const n = red.numEstaciones;
  const estados = new Uint8Array(n);
  // Una sola corrida dura menos que la resolución del reloj del navegador: se mide por lotes
  const tiempo = (fn: () => void) => medir(fn, () => performance.now(), { repeticiones: 5, minimoMs: 1, calentamiento: 1 }).medianaUs;
  if (algoritmo === 'bfs' || algoritmo === 'dfs') {
    const f = () => (algoritmo === 'bfs' ? bfs(red, s, t, { arcosBloqueados: o.arcosBloqueados }) : dfsIterativo(red, s, t, { arcosBloqueados: o.arcosBloqueados }));
    const r = f();
    const us = tiempo(f);
    for (let i = 0; i < r.visitados; i++) estados[r.orden[i]] = 2;
    return { algoritmo, ruta: r.ruta, alcanzado: r.alcanzado, costo: null, saltos: r.saltos, expandidos: r.visitados, relajaciones: r.contadores.internas, opsHeap: null, microsegundos: us, estados, orden: r.orden.slice(0, r.visitados) };
  }
  const op = { metrica: o.metrica, pesos: o.pesos, arcosBloqueados: o.arcosBloqueados };
  const f = () => (algoritmo === 'dijkstra' ? dijkstra(red, s, t, op) : aEstrella(red, s, t, op));
  const r = f();
  const us = tiempo(f);
  for (let i = 0; i < r.orden.length; i++) estados[r.orden[i]] = 2;
  const c = r.contadores;
  return { algoritmo, ruta: r.ruta, alcanzado: r.alcanzado, costo: r.alcanzado ? r.costo : null, saltos: r.saltos, expandidos: c.expandidos, relajaciones: c.relajaciones, opsHeap: c.inserciones + c.extracciones + c.disminuciones, microsegundos: us, estados, orden: r.orden };
}

/** Corre con tracer y devuelve los pasos para el visualizador. */
export function trazar(red: RedTransporte, algoritmo: NombreAlgoritmo, s: number, t: number, metrica: Metrica, limite = 12000): { pasos: PasoTraza[]; truncado: boolean } {
  const tracer = new TracerMemoria(limite);
  if (algoritmo === 'bfs') bfs(red, s, t, {}, tracer);
  else if (algoritmo === 'dfs') dfsIterativo(red, s, t, {}, tracer);
  else if (algoritmo === 'dijkstra') dijkstra(red, s, t, { metrica }, tracer);
  else aEstrella(red, s, t, { metrica }, tracer);
  return { pasos: tracer.aArreglo(), truncado: tracer.truncado };
}

/** Formato de un número para tablas: ∞ y hasta 2 decimales. */
export function num(v: number, decimales = 2): string {
  if (v === Infinity) return '∞';
  if (Number.isNaN(v)) return '–';
  return Number.isInteger(v) ? String(v) : v.toFixed(decimales);
}

export function rutaTexto(red: RedTransporte, ruta: ArrayLike<number>, largo = false): string {
  if (largo && georreferencia(red) && ruta.length > 2) return itinerarioPorCalles(red, ruta);
  return Array.from(ruta, (i) => (largo ? red.estacion(i).nombre : red.estacion(i).id)).join(' → ');
}

/** Calles de un cruce: "Calle 6 con Carrera 5" da las dos; un lugar conocido no da ninguna. */
function callesDe(nombre: string): string[] {
  if (nombre === 'Cruce sin nombre') return [];
  return nombre.includes(' con ') ? nombre.split(' con ') : [nombre];
}

/**
 * En la red de calles reales una ruta pasa por decenas de cruces. Como en una aplicación de mapas,
 * se cuenta por qué calles va: la calle de cada tramo es la que comparten sus dos extremos, y se
 * nombra una sola vez mientras la ruta siga por ella.
 */
export function itinerarioPorCalles(red: RedTransporte, ruta: ArrayLike<number>): string {
  const partes: string[] = [red.estacion(ruta[0]).nombre];
  for (let k = 1; k < ruta.length; k++) {
    const a = callesDe(red.estacion(ruta[k - 1]).nombre);
    const b = callesDe(red.estacion(ruta[k]).nombre);
    const calle = a.find((c) => b.includes(c));
    if (calle && partes[partes.length - 1] !== calle) partes.push(calle);
  }
  const fin = red.estacion(ruta[ruta.length - 1]).nombre;
  if (partes[partes.length - 1] !== fin) partes.push(fin);
  return partes.join(' → ');
}

/** Descarga texto como archivo, sin servidor. */
export function descargar(nombre: string, contenido: string, tipo = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
