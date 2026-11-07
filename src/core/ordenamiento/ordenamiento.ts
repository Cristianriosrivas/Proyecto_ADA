/** Contadores de un ordenamiento, para comparar con la teoría. */
export interface ContadoresOrden {
  comparaciones: number;
  /** Intercambios, o escrituras en MergeSort. */
  movimientos: number;
}

export type Comparador<T> = (a: T, b: T) => number;

/** Cualquier bloque de memoria indexado: arreglo nativo o arreglo tipado. */
export interface Indexado<T> {
  [i: number]: T;
  length: number;
}

export function contadoresOrdenVacios(): ContadoresOrden {
  return { comparaciones: 0, movimientos: 0 };
}

/**
 * MergeSort: T(n) = 2T(n/2) + Θ(n), caso 2 del Método Maestro, Θ(n lg n) siempre.
 * Es estable, por eso se usa para ordenar rutas: a igual costo conserva el orden de hallazgo.
 */
export function mergeSort<T>(a: Indexado<T>, cmp: Comparador<T>, c: ContadoresOrden = contadoresOrdenVacios()): ContadoresOrden {
  const aux = new Array<T>(a.length);

  const mezclar = (lo: number, medio: number, hi: number): void => {
    for (let k = lo; k <= hi; k++) aux[k] = a[k];
    let i = lo;
    let j = medio + 1;
    for (let k = lo; k <= hi; k++) {
      if (i > medio) a[k] = aux[j++];
      else if (j > hi) a[k] = aux[i++];
      else {
        c.comparaciones++;
        // Con <= gana el de la izquierda en un empate: eso es lo que hace estable al algoritmo
        if (cmp(aux[i], aux[j]) <= 0) a[k] = aux[i++];
        else a[k] = aux[j++];
      }
      c.movimientos++;
    }
  };

  const ordenar = (lo: number, hi: number): void => {
    if (lo >= hi) return;
    const medio = (lo + hi) >> 1;
    ordenar(lo, medio);
    ordenar(medio + 1, hi);
    mezclar(lo, medio, hi);
  };

  ordenar(0, a.length - 1);
  return c;
}

/**
 * QuickSort con partición de Hoare.
 * Balanceado: T(n) = 2T(n/2) + Θ(n) = Θ(n lg n). Peor caso: T(n) = T(n−1) + Θ(n) = Θ(n²), y ahí
 * el Método Maestro no aplica porque el subproblema no es n/b. La mediana de 3 evita ese
 * caso con datos ya ordenados; `pivote: 'ultimo'` existe para reproducirlo en el laboratorio.
 * Recurre primero en la parte menor, lo que acota la pila a O(lg n).
 */
export function quickSort<T>(
  a: Indexado<T>,
  cmp: Comparador<T>,
  c: ContadoresOrden = contadoresOrdenVacios(),
  pivote: 'mediana3' | 'ultimo' = 'mediana3',
): ContadoresOrden {
  const intercambiar = (i: number, j: number): void => {
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
    c.movimientos++;
  };

  const elegirPivote = (lo: number, hi: number): T => {
    if (pivote === 'ultimo') {
      intercambiar(lo, hi);
      return a[lo];
    }
    const m = (lo + hi) >> 1;
    c.comparaciones += 3;
    if (cmp(a[m], a[lo]) < 0) intercambiar(m, lo);
    if (cmp(a[hi], a[lo]) < 0) intercambiar(hi, lo);
    if (cmp(a[hi], a[m]) < 0) intercambiar(hi, m);
    return a[m];
  };

  const particion = (lo: number, hi: number): number => {
    const p = elegirPivote(lo, hi);
    let i = lo - 1;
    let j = hi + 1;
    for (;;) {
      do {
        i++;
        c.comparaciones++;
      } while (cmp(a[i], p) < 0);
      do {
        j--;
        c.comparaciones++;
      } while (cmp(a[j], p) > 0);
      if (i >= j) return j;
      intercambiar(i, j);
    }
  };

  const ordenar = (inicio: number, fin: number): void => {
    let lo = inicio;
    let hi = fin;
    while (lo < hi) {
      const q = particion(lo, hi);
      if (q - lo < hi - q) {
        ordenar(lo, q);
        lo = q + 1;
      } else {
        ordenar(q + 1, hi);
        hi = q;
      }
    }
  };

  ordenar(0, a.length - 1);
  return c;
}

/**
 * HeapSort: BUILD-MAX-HEAP en O(n) y n − 1 extracciones de O(lg n).
 * Da Θ(n lg n) garantizado, sin memoria extra, pero no es estable.
 */
export function heapSort<T>(a: Indexado<T>, cmp: Comparador<T>, c: ContadoresOrden = contadoresOrdenVacios()): ContadoresOrden {
  const n = a.length;

  const bajar = (inicio: number, limite: number): void => {
    let i = inicio;
    for (;;) {
      const izq = 2 * i + 1;
      const der = izq + 1;
      let mayor = i;
      if (izq < limite) {
        c.comparaciones++;
        if (cmp(a[izq], a[mayor]) > 0) mayor = izq;
      }
      if (der < limite) {
        c.comparaciones++;
        if (cmp(a[der], a[mayor]) > 0) mayor = der;
      }
      if (mayor === i) return;
      const t = a[i];
      a[i] = a[mayor];
      a[mayor] = t;
      c.movimientos++;
      i = mayor;
    }
  };

  for (let i = (n >> 1) - 1; i >= 0; i--) bajar(i, n);
  for (let fin = n - 1; fin > 0; fin--) {
    const t = a[0];
    a[0] = a[fin];
    a[fin] = t;
    c.movimientos++;
    bajar(0, fin);
  }
  return c;
}

/**
 * Búsqueda binaria en un arreglo ordenado: T(n) = T(n/2) + Θ(1) = Θ(lg n).
 * Devuelve la primera posición con `cmp(elemento) === 0`, o -1. `cmp` compara el elemento
 * contra lo buscado, y así se puede buscar por un solo campo de la fila.
 */
export function busquedaBinaria<T>(a: Indexado<T>, cmp: (elemento: T) => number, c: ContadoresOrden = contadoresOrdenVacios()): number {
  let lo = 0;
  let hi = a.length - 1;
  let hallado = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    const r = cmp(a[m]);
    c.comparaciones++;
    if (r === 0) {
      hallado = m;
      hi = m - 1;
    } else if (r < 0) lo = m + 1;
    else hi = m - 1;
  }
  return hallado;
}

/** Comprueba el orden en Θ(n). */
export function estaOrdenado<T>(a: Indexado<T>, cmp: Comparador<T>): boolean {
  for (let i = 1; i < a.length; i++) if (cmp(a[i - 1], a[i]) > 0) return false;
  return true;
}
