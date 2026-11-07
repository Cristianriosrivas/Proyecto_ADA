/** Estado visual de una estación durante la exploración. */
export const ESTADO = { NO_VISITADO: 0, FRONTERA: 1, CERRADO: 2, RUTA: 3 } as const;

/** Algoritmos que producen trazas. */
export type NombreAlgoritmo = 'bfs' | 'dfs' | 'dijkstra' | 'aestrella';

/**
 * Foto de un paso de ejecución. Guarda copias, no referencias: así la línea de tiempo del
 * visualizador puede ir hacia adelante y hacia atrás sin volver a correr el algoritmo.
 */
export interface PasoTraza {
  /** Línea del pseudocódigo que acaba de ejecutarse. */
  linea: number;
  /** Explicación en español, igual a la que se diría en la sustentación. */
  narracion: string;
  /** Iteración del ciclo principal, para la tabla de la prueba de escritorio. */
  iteracion: number;
  /** Nodo actual, o -1. */
  nodo: number;
  /** Arco examinado, o -1. */
  arco: number;
  /** Estado por estación (ver `ESTADO`). */
  estados: Uint8Array;
  /** Antecesores π[]. */
  pi: Int32Array;
  /** Distancias d[] en saltos o costo. En A* es g[]. */
  d: Float64Array;
  /** Solo en A*: h[]. */
  h?: Float64Array;
  /** Contenido de la cola, del frente al final (BFS). */
  cola?: number[];
  /** Pares de la pila, de la base a la cima (DFS). */
  pilaNodos?: number[];
  pilaPadres?: number[];
  /** Arreglo del heap y clave de cada posición (Dijkstra y A*). */
  heapIds?: Int32Array;
  heapClaves?: Float64Array;
  /** Posiciones del heap que acaban de intercambiarse, para animar sift-up y sift-down. */
  heapIntercambio?: [number, number];
}

/** Recibe los pasos de un algoritmo. Si es `undefined`, el algoritmo no registra nada. */
export interface Tracer {
  registrar(paso: PasoTraza): void;
}
