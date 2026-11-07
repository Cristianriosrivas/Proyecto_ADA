/** Nodo de la lista enlazada simple. */
export interface NodoLista<T> {
  valor: T;
  siguiente: NodoLista<T> | null;
}

/**
 * Lista enlazada simple con puntero a la cola.
 *
 * El puntero `cola` hace que agregar al final sea O(1) y conserva el orden de inserción.
 * La tabla hash la usa para sus cubetas (encadenamiento separado).
 */
export class ListaEnlazada<T> {
  cabeza: NodoLista<T> | null = null;
  private cola: NodoLista<T> | null = null;
  private n = 0;

  get tamano(): number {
    return this.n;
  }

  estaVacia(): boolean {
    return this.n === 0;
  }

  agregarAlFinal(valor: T): void {
    const nodo: NodoLista<T> = { valor, siguiente: null };
    if (this.cola === null) this.cabeza = nodo;
    else this.cola.siguiente = nodo;
    this.cola = nodo;
    this.n++;
  }

  /** Busca el primer elemento que cumple la condición. O(n). */
  buscar(condicion: (v: T) => boolean): T | null {
    for (let p = this.cabeza; p !== null; p = p.siguiente) if (condicion(p.valor)) return p.valor;
    return null;
  }

  /** Elimina el primer elemento que cumple la condición. O(n). */
  eliminar(condicion: (v: T) => boolean): boolean {
    let previo: NodoLista<T> | null = null;
    for (let p = this.cabeza; p !== null; p = p.siguiente) {
      if (condicion(p.valor)) {
        if (previo === null) this.cabeza = p.siguiente;
        else previo.siguiente = p.siguiente;
        if (p === this.cola) this.cola = previo;
        this.n--;
        return true;
      }
      previo = p;
    }
    return false;
  }

  aArreglo(): T[] {
    const copia = new Array<T>(this.n);
    let i = 0;
    for (let p = this.cabeza; p !== null; p = p.siguiente) copia[i++] = p.valor;
    return copia;
  }
}
