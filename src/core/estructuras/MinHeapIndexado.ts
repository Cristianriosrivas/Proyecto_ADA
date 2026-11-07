/** Evento de bajo nivel del heap, para animar sift-up y sift-down. */
export interface EventoHeap {
  tipo: 'subir' | 'bajar';
  /** Posiciones del arreglo que se intercambiaron. */
  i: number;
  j: number;
}

/**
 * Montículo binario mínimo indexado (regla de oro 7), estilo CLRS capítulo 6.
 *
 * Guarda identificadores 0..capacidad-1 con una clave cada uno:
 *  - `monton[i]` es el id en la posición i del arreglo que representa el árbol.
 *  - `posicion[id]` es dónde está ese id, o -1 si no está. Esta tabla es la que permite
 *    que `disminuirClave` sea O(lg n): sin ella, encontrar el id costaría O(n).
 *  - `claves[id]` es su clave.
 *
 * Desempate (regla de oro 10): a igual clave, va primero el id menor. Así toda ejecución
 * extrae en el mismo orden y la prueba de escritorio es reproducible.
 */
export class MinHeapIndexado {
  private monton: Int32Array;
  private posicion: Int32Array;
  private claves: Float64Array;
  private n = 0;

  /** Comparaciones de claves acumuladas, para el contador de operaciones del heap. */
  comparaciones = 0;
  /** Intercambios de posiciones acumulados. */
  intercambios = 0;
  /** Si existe, recibe cada intercambio. Solo lo usa el tracer. */
  observador: ((e: EventoHeap) => void) | undefined = undefined;

  constructor(capacidad: number) {
    this.monton = new Int32Array(capacidad);
    this.posicion = new Int32Array(capacidad);
    this.posicion.fill(-1);
    this.claves = new Float64Array(capacidad);
  }

  get tamano(): number {
    return this.n;
  }

  estaVacio(): boolean {
    return this.n === 0;
  }

  contiene(id: number): boolean {
    return this.posicion[id] !== -1;
  }

  clave(id: number): number {
    return this.claves[id];
  }

  /** Id con la clave mínima, en O(1). */
  minimo(): number {
    if (this.n === 0) throw new RangeError('El heap está vacío');
    return this.monton[0];
  }

  /** MIN-HEAP-INSERT: agrega al final y sube. O(lg n). */
  insertar(id: number, clave: number): void {
    if (this.posicion[id] !== -1) throw new Error(`El id ${id} ya está en el heap`);
    if (this.n === this.monton.length) throw new RangeError('El heap está lleno');
    const i = this.n++;
    this.monton[i] = id;
    this.posicion[id] = i;
    this.claves[id] = clave;
    this.subir(i);
  }

  /** HEAP-EXTRACT-MIN: lleva el último a la raíz y baja. O(lg n). */
  extraerMin(): number {
    if (this.n === 0) throw new RangeError('El heap está vacío');
    const raiz = this.monton[0];
    this.n--;
    if (this.n > 0) {
      const ultimo = this.monton[this.n];
      this.monton[0] = ultimo;
      this.posicion[ultimo] = 0;
    }
    this.posicion[raiz] = -1;
    if (this.n > 0) this.bajar(0);
    return raiz;
  }

  /** HEAP-DECREASE-KEY: la clave solo baja, así que el id solo puede subir. O(lg n). */
  disminuirClave(id: number, clave: number): void {
    const i = this.posicion[id];
    if (i === -1) throw new Error(`El id ${id} no está en el heap`);
    if (clave > this.claves[id]) throw new Error('La clave nueva es mayor que la actual');
    this.claves[id] = clave;
    this.subir(i);
  }

  /** Cambia la clave en cualquier dirección. Lo usa la tabla de congestión (pregunta 6). O(lg n). */
  actualizarClave(id: number, clave: number): void {
    const i = this.posicion[id];
    if (i === -1) throw new Error(`El id ${id} no está en el heap`);
    const anterior = this.claves[id];
    this.claves[id] = clave;
    if (clave < anterior) this.subir(i);
    else this.bajar(i);
  }

  /**
   * BUILD-MIN-HEAP: carga todos los pares y ordena desde el último padre hacia la raíz.
   * Cuesta O(n), no O(n lg n): casi todos los nodos están cerca de las hojas, y la suma
   * Σ ⌈n/2^(h+1)⌉·O(h) converge a O(n).
   */
  construir(ids: ArrayLike<number>, claves: ArrayLike<number>): void {
    if (ids.length > this.monton.length) throw new RangeError('Más elementos que capacidad');
    for (let i = 0; i < this.n; i++) this.posicion[this.monton[i]] = -1;
    this.n = ids.length;
    for (let i = 0; i < this.n; i++) {
      this.monton[i] = ids[i];
      this.posicion[ids[i]] = i;
      this.claves[ids[i]] = claves[i];
    }
    for (let i = (this.n >> 1) - 1; i >= 0; i--) this.bajar(i);
  }

  /** Foto del arreglo, para el inspector del visualizador. */
  fotoIds(): Int32Array {
    return this.monton.subarray(0, this.n);
  }

  /** Comprueba la propiedad de heap y la tabla de posiciones. O(n). Solo para pruebas. */
  esValido(): boolean {
    for (let i = 0; i < this.n; i++) {
      if (this.posicion[this.monton[i]] !== i) return false;
      const izq = 2 * i + 1;
      const der = izq + 1;
      if (izq < this.n && this.menor(izq, i)) return false;
      if (der < this.n && this.menor(der, i)) return false;
    }
    return true;
  }

  /** Orden total: clave y luego id. Es el desempate determinista. */
  private menor(i: number, j: number): boolean {
    const a = this.monton[i];
    const b = this.monton[j];
    const ca = this.claves[a];
    const cb = this.claves[b];
    return ca < cb || (ca === cb && a < b);
  }

  private intercambiar(i: number, j: number, tipo: 'subir' | 'bajar'): void {
    const a = this.monton[i];
    const b = this.monton[j];
    this.monton[i] = b;
    this.monton[j] = a;
    this.posicion[b] = i;
    this.posicion[a] = j;
    this.intercambios++;
    if (this.observador !== undefined) this.observador({ tipo, i, j });
  }

  private subir(inicio: number): void {
    let i = inicio;
    while (i > 0) {
      const padre = (i - 1) >> 1;
      this.comparaciones++;
      if (!this.menor(i, padre)) break;
      this.intercambiar(i, padre, 'subir');
      i = padre;
    }
  }

  /** MIN-HEAPIFY en versión iterativa. */
  private bajar(inicio: number): void {
    let i = inicio;
    for (;;) {
      const izq = 2 * i + 1;
      const der = izq + 1;
      let menor = i;
      if (izq < this.n) {
        this.comparaciones++;
        if (this.menor(izq, menor)) menor = izq;
      }
      if (der < this.n) {
        this.comparaciones++;
        if (this.menor(der, menor)) menor = der;
      }
      if (menor === i) return;
      this.intercambiar(i, menor, 'bajar');
      i = menor;
    }
  }
}
