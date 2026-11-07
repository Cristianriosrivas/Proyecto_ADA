/**
 * Montículo con eliminación perezosa. Solo se usa en el laboratorio, para comparar.
 *
 * No tiene tabla de posiciones: en vez de disminuir una clave, inserta una entrada nueva y
 * deja la vieja adentro. Al extraer, quien llama descarta las entradas obsoletas. Es más
 * simple, pero el heap puede llegar a |E| entradas en lugar de |V|.
 */
export class MinHeapPerezoso {
  private ids: Int32Array;
  private claves: Float64Array;
  private n = 0;

  comparaciones = 0;
  intercambios = 0;
  /** Mayor tamaño alcanzado: muestra cuánta memoria extra cuesta no tener decrease-key. */
  maximo = 0;

  constructor(capacidadInicial = 64) {
    const c = capacidadInicial > 0 ? capacidadInicial : 1;
    this.ids = new Int32Array(c);
    this.claves = new Float64Array(c);
  }

  get tamano(): number {
    return this.n;
  }

  estaVacio(): boolean {
    return this.n === 0;
  }

  insertar(id: number, clave: number): void {
    if (this.n === this.ids.length) {
      const ids = new Int32Array(this.n * 2);
      ids.set(this.ids);
      const claves = new Float64Array(this.n * 2);
      claves.set(this.claves);
      this.ids = ids;
      this.claves = claves;
    }
    let i = this.n++;
    if (this.n > this.maximo) this.maximo = this.n;
    this.ids[i] = id;
    this.claves[i] = clave;
    while (i > 0) {
      const p = (i - 1) >> 1;
      this.comparaciones++;
      if (!this.menor(i, p)) break;
      this.intercambiar(i, p);
      i = p;
    }
  }

  /** Clave de la raíz, que es la entrada que saldrá con `extraerId`. */
  claveMinima(): number {
    if (this.n === 0) throw new RangeError('El heap está vacío');
    return this.claves[0];
  }

  extraerId(): number {
    if (this.n === 0) throw new RangeError('El heap está vacío');
    const id = this.ids[0];
    this.n--;
    if (this.n > 0) {
      this.ids[0] = this.ids[this.n];
      this.claves[0] = this.claves[this.n];
      let i = 0;
      for (;;) {
        const izq = 2 * i + 1;
        const der = izq + 1;
        let m = i;
        if (izq < this.n) {
          this.comparaciones++;
          if (this.menor(izq, m)) m = izq;
        }
        if (der < this.n) {
          this.comparaciones++;
          if (this.menor(der, m)) m = der;
        }
        if (m === i) break;
        this.intercambiar(i, m);
        i = m;
      }
    }
    return id;
  }

  private menor(i: number, j: number): boolean {
    const ca = this.claves[i];
    const cb = this.claves[j];
    return ca < cb || (ca === cb && this.ids[i] < this.ids[j]);
  }

  private intercambiar(i: number, j: number): void {
    const id = this.ids[i];
    const c = this.claves[i];
    this.ids[i] = this.ids[j];
    this.claves[i] = this.claves[j];
    this.ids[j] = id;
    this.claves[j] = c;
    this.intercambios++;
  }
}
