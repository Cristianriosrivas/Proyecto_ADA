/**
 * Cola FIFO sobre un buffer circular (regla de oro 5).
 *
 * `inicio` y `n` bastan para ubicar los elementos: el siguiente hueco está en
 * (inicio + n) mód capacidad. Encolar y desencolar son O(1); redimensionar copia los
 * elementos en orden y, como duplica la capacidad, sigue siendo O(1) amortizado.
 * `array.shift()` en cambio mueve todos los elementos y costaría O(n) por operación.
 */
export class ColaCircular<T> {
  private buffer: T[];
  private inicio = 0;
  private n = 0;

  constructor(capacidadInicial = 16) {
    this.buffer = new Array<T>(capacidadInicial > 0 ? capacidadInicial : 1);
  }

  get tamano(): number {
    return this.n;
  }

  get capacidad(): number {
    return this.buffer.length;
  }

  estaVacia(): boolean {
    return this.n === 0;
  }

  encolar(valor: T): void {
    if (this.n === this.buffer.length) this.redimensionar();
    this.buffer[(this.inicio + this.n) % this.buffer.length] = valor;
    this.n++;
  }

  desencolar(): T {
    if (this.n === 0) throw new RangeError('La cola está vacía');
    const v = this.buffer[this.inicio];
    this.buffer[this.inicio] = undefined as T;
    this.inicio = (this.inicio + 1) % this.buffer.length;
    this.n--;
    return v;
  }

  frente(): T {
    if (this.n === 0) throw new RangeError('La cola está vacía');
    return this.buffer[this.inicio];
  }

  /** Copia en orden FIFO. Solo la usa el tracer, nunca el ciclo del algoritmo. */
  aArreglo(): T[] {
    const copia = new Array<T>(this.n);
    for (let i = 0; i < this.n; i++) copia[i] = this.buffer[(this.inicio + i) % this.buffer.length];
    return copia;
  }

  private redimensionar(): void {
    const nuevo = new Array<T>(this.buffer.length * 2);
    for (let i = 0; i < this.n; i++) nuevo[i] = this.buffer[(this.inicio + i) % this.buffer.length];
    this.buffer = nuevo;
    this.inicio = 0;
  }
}
