/** Pila LIFO propia (regla de oro 6). Apilar y desapilar son O(1) amortizado. */
export class Pila<T> {
  private datos: T[];
  private n = 0;

  constructor(capacidadInicial = 16) {
    this.datos = new Array<T>(capacidadInicial > 0 ? capacidadInicial : 1);
  }

  get tamano(): number {
    return this.n;
  }

  estaVacia(): boolean {
    return this.n === 0;
  }

  apilar(valor: T): void {
    if (this.n === this.datos.length) {
      const nuevo = new Array<T>(this.datos.length * 2);
      for (let i = 0; i < this.n; i++) nuevo[i] = this.datos[i];
      this.datos = nuevo;
    }
    this.datos[this.n] = valor;
    this.n++;
  }

  desapilar(): T {
    if (this.n === 0) throw new RangeError('La pila está vacía');
    this.n--;
    const v = this.datos[this.n];
    this.datos[this.n] = undefined as T;
    return v;
  }

  cima(): T {
    if (this.n === 0) throw new RangeError('La pila está vacía');
    return this.datos[this.n - 1];
  }

  /** Copia de la base a la cima. Solo la usa el tracer. */
  aArreglo(): T[] {
    const copia = new Array<T>(this.n);
    for (let i = 0; i < this.n; i++) copia[i] = this.datos[i];
    return copia;
  }
}
