/**
 * Arreglo que crece duplicando su capacidad, como un `vector` de C++.
 *
 * Existe porque en `core` el arreglo nativo solo se usa como bloque de memoria indexado.
 * Duplicar la capacidad da un costo amortizado O(1) por inserción: copiar n elementos
 * ocurre solo después de n inserciones baratas.
 */
export class ArregloDinamico<T> {
  private datos: T[];
  private n = 0;

  constructor(capacidadInicial = 8) {
    this.datos = new Array<T>(capacidadInicial > 0 ? capacidadInicial : 1);
  }

  get tamano(): number {
    return this.n;
  }

  get capacidad(): number {
    return this.datos.length;
  }

  agregar(valor: T): void {
    if (this.n === this.datos.length) this.crecer();
    this.datos[this.n] = valor;
    this.n++;
  }

  obtener(i: number): T {
    if (i < 0 || i >= this.n) throw new RangeError(`Índice ${i} fuera de rango (tamaño ${this.n})`);
    return this.datos[i];
  }

  establecer(i: number, valor: T): void {
    if (i < 0 || i >= this.n) throw new RangeError(`Índice ${i} fuera de rango (tamaño ${this.n})`);
    this.datos[i] = valor;
  }

  /** Quita y devuelve el último elemento. */
  quitarUltimo(): T {
    if (this.n === 0) throw new RangeError('El arreglo está vacío');
    this.n--;
    const v = this.datos[this.n];
    // Soltar la referencia evita retener objetos que ya salieron del arreglo
    this.datos[this.n] = undefined as T;
    return v;
  }

  vaciar(): void {
    for (let i = 0; i < this.n; i++) this.datos[i] = undefined as T;
    this.n = 0;
  }

  /** Copia a un arreglo nativo del tamaño exacto, para entregar resultados fuera de `core`. */
  aArreglo(): T[] {
    const copia = new Array<T>(this.n);
    for (let i = 0; i < this.n; i++) copia[i] = this.datos[i];
    return copia;
  }

  private crecer(): void {
    const nuevo = new Array<T>(this.datos.length * 2);
    for (let i = 0; i < this.n; i++) nuevo[i] = this.datos[i];
    this.datos = nuevo;
  }
}
