/**
 * Lista de adyacencia con inserción por la cola (regla de oro 4).
 *
 * Es una lista enlazada por vértice, pero sus nodos viven en arreglos tipados en vez de
 * objetos sueltos: el arco `e` tiene destino `destino[e]`, siguiente `siguiente[e]` y pesos
 * `distanciaKm[e]` y `tiempoMin[e]`. `cabeza[u]` y `cola[u]` son los índices del primer y el
 * último arco de u, y -1 marca el fin de la lista, como NIL.
 *
 * Por qué así: conserva exactamente la semántica de lista enlazada, insertar por la cola
 * sigue siendo O(1), y además hace exacta la cuenta de memoria que pide la pregunta 1
 * y permite llegar a N = 5000 sin presión del recolector de basura.
 */
export class ListaAdyacencia {
  private cabeza: Int32Array;
  private cola: Int32Array;
  private gradoSalida: Int32Array;
  private nVertices = 0;
  private nArcos = 0;

  private destinos: Int32Array;
  private siguientes: Int32Array;
  private anteriores: Int32Array;
  private km: Float64Array;
  private min: Float64Array;

  constructor(capacidadVertices = 16, capacidadArcos = 32) {
    const cv = capacidadVertices > 0 ? capacidadVertices : 1;
    const ca = capacidadArcos > 0 ? capacidadArcos : 1;
    this.cabeza = new Int32Array(cv);
    this.cola = new Int32Array(cv);
    this.gradoSalida = new Int32Array(cv);
    this.destinos = new Int32Array(ca);
    this.siguientes = new Int32Array(ca);
    this.anteriores = new Int32Array(ca);
    this.km = new Float64Array(ca);
    this.min = new Float64Array(ca);
  }

  get numVertices(): number {
    return this.nVertices;
  }

  get numArcos(): number {
    return this.nArcos;
  }

  /** Agrega un vértice sin arcos y devuelve su índice. */
  agregarVertice(): number {
    if (this.nVertices === this.cabeza.length) {
      const c = this.cabeza.length * 2;
      this.cabeza = crecerEntero(this.cabeza, c);
      this.cola = crecerEntero(this.cola, c);
      this.gradoSalida = crecerEntero(this.gradoSalida, c);
    }
    const u = this.nVertices++;
    this.cabeza[u] = -1;
    this.cola[u] = -1;
    this.gradoSalida[u] = 0;
    return u;
  }

  /**
   * Agrega el arco u → v al final de la lista de u, en O(1) amortizado.
   * Por la cola, para que recorrer la lista dé el orden de inserción de las vías.
   */
  agregarArco(u: number, v: number, distanciaKm: number, tiempoMin: number): number {
    if (this.nArcos === this.destinos.length) {
      const c = this.destinos.length * 2;
      this.destinos = crecerEntero(this.destinos, c);
      this.siguientes = crecerEntero(this.siguientes, c);
      this.anteriores = crecerEntero(this.anteriores, c);
      this.km = crecerReal(this.km, c);
      this.min = crecerReal(this.min, c);
    }
    const e = this.nArcos++;
    this.destinos[e] = v;
    this.siguientes[e] = -1;
    this.anteriores[e] = this.cola[u];
    this.km[e] = distanciaKm;
    this.min[e] = tiempoMin;
    if (this.cola[u] === -1) this.cabeza[u] = e;
    else this.siguientes[this.cola[u]] = e;
    this.cola[u] = e;
    this.gradoSalida[u]++;
    return e;
  }

  /** Primer arco de u, o -1 si no tiene. */
  primero(u: number): number {
    return this.cabeza[u];
  }

  /** Último arco de u, o -1. Permite recorrer al revés sin copiar la lista. */
  ultimo(u: number): number {
    return this.cola[u];
  }

  siguiente(e: number): number {
    return this.siguientes[e];
  }

  anterior(e: number): number {
    return this.anteriores[e];
  }

  destino(e: number): number {
    return this.destinos[e];
  }

  distanciaKm(e: number): number {
    return this.km[e];
  }

  tiempoMin(e: number): number {
    return this.min[e];
  }

  grado(u: number): number {
    return this.gradoSalida[u];
  }

  /** Copia de los pesos por arco en la métrica pedida, indexada por arco. */
  copiarPesos(metrica: 'km' | 'min'): Float64Array {
    const r = new Float64Array(this.nArcos);
    const fuente = metrica === 'km' ? this.km : this.min;
    for (let e = 0; e < this.nArcos; e++) r[e] = fuente[e];
    return r;
  }

  /** Bytes de los bloques que usa esta representación, por vértice y por arco. */
  bytesTeoricos(): number {
    // Por vértice: cabeza, cola y grado (3 enteros de 4 B).
    // Por arco: destino, siguiente y anterior (4 B) más dos pesos (8 B).
    return this.nVertices * 12 + this.nArcos * (12 + 16);
  }
}

function crecerEntero(a: Int32Array, capacidad: number): Int32Array {
  const b = new Int32Array(capacidad);
  b.set(a);
  return b;
}

function crecerReal(a: Float64Array, capacidad: number): Float64Array {
  const b = new Float64Array(capacidad);
  b.set(a);
  return b;
}
