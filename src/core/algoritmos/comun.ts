import { ESTADO } from '../instrumentacion/tipos';

/** Opciones comunes de los recorridos. */
export interface OpcionesRecorrido {
  /** arcosBloqueados[e] = 1 si la vía de ese arco está cerrada por un incidente. */
  arcosBloqueados?: Uint8Array;
}

/** Contadores exactos de un recorrido, para contrastar con la fórmula teórica (pregunta 2). */
export interface ContadoresRecorrido {
  /** Iteraciones del ciclo externo: nodos sacados de la cola o de la pila. */
  externas: number;
  /** Iteraciones del ciclo interno: arcos examinados. */
  internas: number;
  /** Entradas agregadas a la cola o a la pila. */
  insertados: number;
  /** Mayor tamaño que alcanzó la cola o la pila. */
  maximoEstructura: number;
}

/** Resultado de BFS o DFS. */
export interface ResultadoRecorrido {
  alcanzado: boolean;
  /** Estaciones de origen a destino; vacía si no hay ruta o no se pidió destino. */
  ruta: Int32Array;
  saltos: number;
  /** Saltos desde el origen, o -1 si no se alcanzó. */
  d: Int32Array;
  pi: Int32Array;
  /** Orden en que se visitaron las estaciones. */
  orden: Int32Array;
  visitados: number;
  contadores: ContadoresRecorrido;
}

/** Sigue los antecesores desde t hasta s. Θ(largo de la ruta). */
export function reconstruirRuta(pi: Int32Array, s: number, t: number): Int32Array {
  let largo = 1;
  for (let v = t; v !== s; v = pi[v]) {
    if (v === -1) return new Int32Array(0);
    largo++;
  }
  const ruta = new Int32Array(largo);
  let i = largo - 1;
  for (let v = t; ; v = pi[v]) {
    ruta[i--] = v;
    if (v === s) break;
  }
  return ruta;
}

/** Marca la ruta sobre una copia de los estados, para la foto final del tracer. */
export function estadosConRuta(estados: Uint8Array, ruta: Int32Array): Uint8Array {
  const r = new Uint8Array(estados);
  for (let i = 0; i < ruta.length; i++) r[ruta[i]] = ESTADO.RUTA;
  return r;
}

/** Copia a Float64Array para la foto del tracer, convirtiendo -1 en ∞. */
export function saltosAReales(d: Int32Array): Float64Array {
  const r = new Float64Array(d.length);
  for (let i = 0; i < d.length; i++) r[i] = d[i] === -1 ? Infinity : d[i];
  return r;
}

/** Texto de una ruta: "A → C → E". */
export function textoRuta(ruta: Int32Array, etiqueta: (i: number) => string): string {
  let s = '';
  for (let i = 0; i < ruta.length; i++) s += (i > 0 ? ' → ' : '') + etiqueta(ruta[i]);
  return s;
}

/** Costo de un número para narrar: sin decimales si es entero. */
export function numero(v: number): string {
  if (v === Infinity) return '∞';
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
