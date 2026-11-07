/**
 * Matriz de adyacencia n × n. Existe para comparar contra la lista (pregunta 1).
 *
 * Guarda el peso de cada arco y `Infinity` donde no hay vía. Ocupa Θ(V²) sin importar
 * cuántas vías existan, y hallar los vecinos de un nodo cuesta Θ(V) porque hay que
 * revisar toda la fila.
 */
export class MatrizAdyacencia {
  readonly n: number;
  private pesos: Float64Array;

  constructor(n: number) {
    this.n = n;
    this.pesos = new Float64Array(n * n);
    this.pesos.fill(Infinity);
  }

  poner(u: number, v: number, peso: number): void {
    this.pesos[u * this.n + v] = peso;
  }

  peso(u: number, v: number): number {
    return this.pesos[u * this.n + v];
  }

  existe(u: number, v: number): boolean {
    return this.pesos[u * this.n + v] !== Infinity;
  }

  /** Vecinos de u: hay que barrer toda la fila, Θ(V). */
  grado(u: number): number {
    let g = 0;
    const base = u * this.n;
    for (let v = 0; v < this.n; v++) if (this.pesos[base + v] !== Infinity) g++;
    return g;
  }

  bytesTeoricos(): number {
    return this.n * this.n * 8;
  }
}
