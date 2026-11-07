import { ArregloDinamico } from '../estructuras/ArregloDinamico';
import { Pila } from '../estructuras/Pila';
import type { RedTransporte } from '../grafo/RedTransporte';
import { dfsIterativo } from './dfs';

/** ¿Hay camino de s a t? Es la verificación de conectividad que pide la Fase 1. */
export function estanConectadas(red: RedTransporte, s: number, t: number, arcosBloqueados?: Uint8Array): boolean {
  return dfsIterativo(red, s, t, { arcosBloqueados }).alcanzado;
}

/** Estaciones alcanzables desde s, en el orden de la exploración. En redes dirigidas no es simétrico. */
export function alcanzablesDesde(red: RedTransporte, s: number, arcosBloqueados?: Uint8Array): Int32Array {
  const r = dfsIterativo(red, s, -1, { arcosBloqueados });
  return r.orden.subarray(0, r.visitados);
}

export interface Componentes {
  cantidad: number;
  /** Componente de cada estación. */
  de: Int32Array;
  /** Tamaño de cada componente. */
  tamanos: Int32Array;
}

/**
 * Componentes conexas con DFS, Θ(V + E). En redes dirigidas son componentes débiles: se
 * ignora la dirección de las vías, porque para esas redes la pregunta útil es la alcanzabilidad.
 */
export function componentesConexas(red: RedTransporte): Componentes {
  const n = red.numEstaciones;
  const adj = red.listaNoDirigida();
  const de = new Int32Array(n).fill(-1);
  const tamanos = new ArregloDinamico<number>();
  const S = new Pila<number>(n > 0 ? n : 1);
  let cantidad = 0;
  for (let i = 0; i < n; i++) {
    if (de[i] !== -1) continue;
    let tam = 0;
    S.apilar(i);
    de[i] = cantidad;
    while (!S.estaVacia()) {
      const u = S.desapilar();
      tam++;
      for (let e = adj.primero(u); e !== -1; e = adj.siguiente(e)) {
        const v = adj.destino(e);
        if (de[v] === -1) {
          de[v] = cantidad;
          S.apilar(v);
        }
      }
    }
    tamanos.agregar(tam);
    cantidad++;
  }
  return { cantidad, de, tamanos: Int32Array.from(tamanos.aArreglo()) };
}

export interface PuntosCriticos {
  /** Estaciones cuya caída parte la red. */
  articulaciones: Int32Array;
  /** Índices de las vías cuya caída parte la red. */
  puentes: Int32Array;
  /** En cuántas partes queda su componente si cae cada estación: 1 si no es crítica. */
  partesAlFallar: Int32Array;
}

/**
 * Puntos de articulación y puentes con el algoritmo de Tarjan (1972), Θ(V + E).
 *
 * `disc[u]` es el orden de descubrimiento y `low[u]` el menor `disc` alcanzable desde el
 * subárbol de u con a lo sumo una arista de retroceso. Si un hijo v cumple low[v] ≥ disc[u],
 * nada debajo de v llega más arriba de u, así que quitar u separa ese subárbol. Si cumple
 * low[v] > disc[u], ni siquiera llega a u, y la vía u-v es un puente.
 *
 * Se ignora el arco por el que se llegó comparando la vía y no el nodo: así dos vías paralelas
 * entre las mismas estaciones no se confunden con un puente. Trabaja sobre el grafo no dirigido.
 */
export function puntosCriticos(red: RedTransporte): PuntosCriticos {
  const n = red.numEstaciones;
  const adj = red.listaNoDirigida();
  const disc = new Int32Array(n).fill(-1);
  const low = new Int32Array(n);
  const partes = new Int32Array(n).fill(1);
  const puentes = new ArregloDinamico<number>();
  let tiempo = 0;

  // En la lista no dirigida generada los arcos van en pares (2i, 2i + 1): la vía es e >> 1.
  // En una red no dirigida los arcos también se crean en pares, así que aplica lo mismo.
  const visitar = (u: number, viaEntrada: number): void => {
    disc[u] = low[u] = tiempo++;
    let hijos = 0;
    let separados = 0;
    for (let e = adj.primero(u); e !== -1; e = adj.siguiente(e)) {
      const via = e >> 1;
      if (via === viaEntrada) continue;
      const v = adj.destino(e);
      if (disc[v] === -1) {
        hijos++;
        visitar(v, via);
        if (low[v] < low[u]) low[u] = low[v];
        if (low[v] >= disc[u]) separados++;
        if (low[v] > disc[u]) puentes.agregar(via);
      } else if (disc[v] < low[u]) {
        low[u] = disc[v];
      }
    }
    // La raíz del DFS es articulación solo si tiene dos o más hijos
    partes[u] = viaEntrada === -1 ? (hijos > 1 ? hijos : 1) : separados + 1;
  };

  for (let i = 0; i < n; i++) if (disc[i] === -1) visitar(i, -1);

  const criticas = new ArregloDinamico<number>();
  for (let i = 0; i < n; i++) if (partes[i] > 1) criticas.agregar(i);
  return { articulaciones: Int32Array.from(criticas.aArreglo()), puentes: Int32Array.from(puentes.aArreglo()), partesAlFallar: partes };
}
