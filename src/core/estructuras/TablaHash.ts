import { ListaEnlazada } from './ListaEnlazada';

interface Entrada<V> {
  clave: string;
  valor: V;
}

/** Hash FNV-1a de 32 bits sobre las unidades de código del texto. */
export function fnv1a(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    // Multiplicar por el primo 16777619 sin perder precisión: Math.imul trabaja en 32 bits
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Tabla hash con encadenamiento separado (regla de oro 8).
 *
 * Con factor de carga α = n/m acotado, buscar cuesta Θ(1 + α) en promedio (CLRS, cap. 11).
 * Por eso se redimensiona al pasar de 0.75: se duplican las cubetas y se reinsertan todas
 * las entradas. Cada redimensionamiento cuesta Θ(n), pero ocurre tras n inserciones, así
 * que el costo amortizado por inserción sigue siendo O(1).
 */
export class TablaHash<V> {
  private cubetas: ListaEnlazada<Entrada<V>>[];
  private n = 0;
  /** Veces que se redimensionó, para los tests y el informe. */
  redimensionamientos = 0;

  constructor(capacidadInicial = 16) {
    this.cubetas = crearCubetas<V>(capacidadInicial > 0 ? capacidadInicial : 1);
  }

  get tamano(): number {
    return this.n;
  }

  get numCubetas(): number {
    return this.cubetas.length;
  }

  get factorCarga(): number {
    return this.n / this.cubetas.length;
  }

  poner(clave: string, valor: V): void {
    const cubeta = this.cubetas[fnv1a(clave) % this.cubetas.length];
    const existente = cubeta.buscar((e) => e.clave === clave);
    if (existente !== null) {
      existente.valor = valor;
      return;
    }
    cubeta.agregarAlFinal({ clave, valor });
    this.n++;
    if (this.factorCarga > 0.75) this.redimensionar();
  }

  obtener(clave: string): V | undefined {
    const e = this.cubetas[fnv1a(clave) % this.cubetas.length].buscar((x) => x.clave === clave);
    return e === null ? undefined : e.valor;
  }

  contiene(clave: string): boolean {
    return this.cubetas[fnv1a(clave) % this.cubetas.length].buscar((x) => x.clave === clave) !== null;
  }

  eliminar(clave: string): boolean {
    const ok = this.cubetas[fnv1a(clave) % this.cubetas.length].eliminar((x) => x.clave === clave);
    if (ok) this.n--;
    return ok;
  }

  /** Todas las claves, en orden de cubeta. */
  claves(): string[] {
    const r = new Array<string>(this.n);
    let i = 0;
    for (let c = 0; c < this.cubetas.length; c++) {
      for (let p = this.cubetas[c].cabeza; p !== null; p = p.siguiente) r[i++] = p.valor.clave;
    }
    return r;
  }

  /** Largo de la cubeta más larga: mide qué tan bien reparte el hash. */
  cubetaMasLarga(): number {
    let m = 0;
    for (let c = 0; c < this.cubetas.length; c++) if (this.cubetas[c].tamano > m) m = this.cubetas[c].tamano;
    return m;
  }

  private redimensionar(): void {
    const viejas = this.cubetas;
    this.cubetas = crearCubetas<V>(viejas.length * 2);
    for (let c = 0; c < viejas.length; c++) {
      for (let p = viejas[c].cabeza; p !== null; p = p.siguiente) {
        this.cubetas[fnv1a(p.valor.clave) % this.cubetas.length].agregarAlFinal(p.valor);
      }
    }
    this.redimensionamientos++;
  }
}

function crearCubetas<V>(m: number): ListaEnlazada<Entrada<V>>[] {
  const c = new Array<ListaEnlazada<Entrada<V>>>(m);
  for (let i = 0; i < m; i++) c[i] = new ListaEnlazada<Entrada<V>>();
  return c;
}
