/**
 * Árbol k-d de 2 dimensiones.
 *
 * Construcción: en cada nivel parte por la mediana del eje alterno. Hallar la mediana con
 * selección rápida cuesta Θ(n) en promedio, así que T(n) = 2T(n/2) + Θ(n), que por el caso 2
 * del Método Maestro da Θ(n lg n). Esta es la recurrencia que el informe analiza.
 *
 * Se guarda implícito en arreglos: `orden[medio]` es la raíz del rango y sus mitades son los
 * subárboles, así no hace falta crear nodos ni punteros.
 */
export class KDTree {
  private orden: Int32Array;
  private readonly x: ArrayLike<number>;
  private readonly y: ArrayLike<number>;
  /** Nodos visitados en la última consulta: muestra el O(lg n) esperado frente a O(n). */
  visitados = 0;

  constructor(x: ArrayLike<number>, y: ArrayLike<number>) {
    this.x = x;
    this.y = y;
    this.orden = new Int32Array(x.length);
    for (let i = 0; i < x.length; i++) this.orden[i] = i;
    this.construir(0, x.length - 1, 0);
  }

  get tamano(): number {
    return this.orden.length;
  }

  /** Índice del punto más cercano a (px, py), o -1 si no hay puntos. */
  masCercano(px: number, py: number, excluir = -1): number {
    const r = this.kMasCercanos(px, py, 1, excluir);
    return r.length === 0 ? -1 : r[0];
  }

  /**
   * Los k puntos más cercanos, del más cercano al más lejano.
   * Mantiene los mejores en un arreglo ordenado de tamaño k: para k pequeño es más simple
   * que un heap y cuesta O(k) por inserción.
   */
  kMasCercanos(px: number, py: number, k: number, excluir = -1): Int32Array {
    this.visitados = 0;
    const ids = new Int32Array(k);
    const d2 = new Float64Array(k);
    d2.fill(Infinity);
    let cuenta = 0;

    const considerar = (i: number): void => {
      if (i === excluir) return;
      const dx = this.x[i] - px;
      const dy = this.y[i] - py;
      const d = dx * dx + dy * dy;
      if (cuenta === k && !(d < d2[k - 1] || (d === d2[k - 1] && i < ids[k - 1]))) return;
      let p = cuenta < k ? cuenta++ : k - 1;
      while (p > 0 && (d < d2[p - 1] || (d === d2[p - 1] && i < ids[p - 1]))) {
        d2[p] = d2[p - 1];
        ids[p] = ids[p - 1];
        p--;
      }
      d2[p] = d;
      ids[p] = i;
    };

    const buscar = (lo: number, hi: number, eje: number): void => {
      if (lo > hi) return;
      this.visitados++;
      const medio = (lo + hi) >> 1;
      const nodo = this.orden[medio];
      considerar(nodo);
      const delta = eje === 0 ? px - this.x[nodo] : py - this.y[nodo];
      const proximo = 1 - eje;
      // Primero el lado donde cae el punto; el otro solo si la franja puede tener algo mejor
      if (delta < 0) {
        buscar(lo, medio - 1, proximo);
        if (cuenta < k || delta * delta <= d2[k - 1]) buscar(medio + 1, hi, proximo);
      } else {
        buscar(medio + 1, hi, proximo);
        if (cuenta < k || delta * delta <= d2[k - 1]) buscar(lo, medio - 1, proximo);
      }
    };

    buscar(0, this.orden.length - 1, 0);
    const r = new Int32Array(cuenta);
    for (let i = 0; i < cuenta; i++) r[i] = ids[i];
    return r;
  }

  private coord(i: number, eje: number): number {
    return eje === 0 ? this.x[i] : this.y[i];
  }

  private construir(lo: number, hi: number, eje: number): void {
    if (lo >= hi) return;
    const medio = (lo + hi) >> 1;
    this.seleccionar(lo, hi, medio, eje);
    this.construir(lo, medio - 1, 1 - eje);
    this.construir(medio + 1, hi, 1 - eje);
  }

  /** Selección rápida con pivote mediana de 3: deja en `k` el elemento que le toca. Θ(n) promedio. */
  private seleccionar(inicio: number, fin: number, k: number, eje: number): void {
    const o = this.orden;
    let lo = inicio;
    let hi = fin;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      const a = this.coord(o[lo], eje);
      const b = this.coord(o[m], eje);
      const c = this.coord(o[hi], eje);
      const pivote = a < b ? (b < c ? b : a < c ? c : a) : a < c ? a : b < c ? c : b;
      let i = lo;
      let j = hi;
      while (i <= j) {
        while (this.coord(o[i], eje) < pivote) i++;
        while (this.coord(o[j], eje) > pivote) j--;
        if (i <= j) {
          const t = o[i];
          o[i] = o[j];
          o[j] = t;
          i++;
          j--;
        }
      }
      if (k <= j) hi = j;
      else if (k >= i) lo = i;
      else return;
    }
  }
}
