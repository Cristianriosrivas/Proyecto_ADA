import { ArregloDinamico } from '../estructuras/ArregloDinamico';
import { ListaAdyacencia } from '../estructuras/ListaAdyacencia';
import { MatrizAdyacencia } from '../estructuras/MatrizAdyacencia';
import { TablaHash } from '../estructuras/TablaHash';
import type { Estacion, Metrica, RedJSON, Via } from './tipos';

/**
 * El grafo G = (V, E) de la red de transporte.
 *
 * Una vía no dirigida se guarda como dos arcos, u → v y v → u, en la lista de adyacencia.
 * Por eso |arcos| = 2|E| en una red no dirigida, que es exactamente la suma de grados.
 */
export class RedTransporte {
  readonly nombre: string;
  readonly dirigida: boolean;
  readonly adj: ListaAdyacencia;

  private readonly estaciones = new ArregloDinamico<Estacion>();
  private readonly vias = new ArregloDinamico<Via>();
  private readonly indice = new TablaHash<number>();
  /** Vía a la que pertenece cada arco y estación de la que sale. */
  private readonly viaDeArcoDatos = new ArregloDinamico<number>();
  private readonly origenDeArcoDatos = new ArregloDinamico<number>();

  private cacheX: Float64Array | null = null;
  private cacheY: Float64Array | null = null;
  private cachePesosKm: Float64Array | null = null;
  private cachePesosMin: Float64Array | null = null;

  constructor(nombre: string, dirigida = false, capacidadEstaciones = 16, capacidadArcos = 32) {
    this.nombre = nombre;
    this.dirigida = dirigida;
    this.adj = new ListaAdyacencia(capacidadEstaciones, capacidadArcos);
  }

  get numEstaciones(): number {
    return this.estaciones.tamano;
  }

  /** |E|: una vía no dirigida cuenta una vez. */
  get numVias(): number {
    return this.vias.tamano;
  }

  /** Arcos de la lista de adyacencia: 2|E| si es no dirigida, |E| si es dirigida. */
  get numArcos(): number {
    return this.adj.numArcos;
  }

  agregarEstacion(id: string, x: number, y: number, nombre?: string, linea?: string): number {
    if (this.indice.contiene(id)) throw new Error(`Ya existe la estación ${id}`);
    const u = this.adj.agregarVertice();
    this.estaciones.agregar({ id, nombre: nombre ?? id, x, y, linea });
    this.indice.poner(id, u);
    this.cacheX = null;
    this.cacheY = null;
    return u;
  }

  agregarVia(u: number, v: number, distanciaKm: number, tiempoMin: number): number {
    if (u < 0 || v < 0 || u >= this.numEstaciones || v >= this.numEstaciones) throw new RangeError('Estación inexistente');
    if (!(distanciaKm >= 0) || !(tiempoMin >= 0)) throw new Error('Los pesos no pueden ser negativos');
    const via = this.vias.tamano;
    const arco = this.adj.agregarArco(u, v, distanciaKm, tiempoMin);
    this.viaDeArcoDatos.agregar(via);
    this.origenDeArcoDatos.agregar(u);
    let arcoInverso = -1;
    if (!this.dirigida) {
      arcoInverso = this.adj.agregarArco(v, u, distanciaKm, tiempoMin);
      this.viaDeArcoDatos.agregar(via);
      this.origenDeArcoDatos.agregar(v);
    }
    this.vias.agregar({ origen: u, destino: v, distanciaKm, tiempoMin, arco, arcoInverso });
    this.cachePesosKm = null;
    this.cachePesosMin = null;
    return via;
  }

  estacion(i: number): Estacion {
    return this.estaciones.obtener(i);
  }

  via(i: number): Via {
    return this.vias.obtener(i);
  }

  /** Índice de una estación por su id, en O(1) esperado gracias a la tabla hash. */
  indiceDe(id: string): number {
    const i = this.indice.obtener(id);
    return i === undefined ? -1 : i;
  }

  viaDeArco(e: number): number {
    return this.viaDeArcoDatos.obtener(e);
  }

  origenDeArco(e: number): number {
    return this.origenDeArcoDatos.obtener(e);
  }

  /** Busca la vía entre dos estaciones recorriendo la lista de u. O(grado de u). */
  existeArco(u: number, v: number): boolean {
    for (let e = this.adj.primero(u); e !== -1; e = this.adj.siguiente(e)) if (this.adj.destino(e) === v) return true;
    return false;
  }

  /** Pesos por arco en la métrica pedida. Se calculan una vez por red. */
  pesos(metrica: Metrica): Float64Array {
    if (metrica === 'km') {
      if (this.cachePesosKm === null) this.cachePesosKm = this.adj.copiarPesos('km');
      return this.cachePesosKm;
    }
    if (this.cachePesosMin === null) this.cachePesosMin = this.adj.copiarPesos('min');
    return this.cachePesosMin;
  }

  coordenadasX(): Float64Array {
    if (this.cacheX === null) {
      const x = new Float64Array(this.numEstaciones);
      for (let i = 0; i < x.length; i++) x[i] = this.estaciones.obtener(i).x;
      this.cacheX = x;
    }
    return this.cacheX;
  }

  coordenadasY(): Float64Array {
    if (this.cacheY === null) {
      const y = new Float64Array(this.numEstaciones);
      for (let i = 0; i < y.length; i++) y[i] = this.estaciones.obtener(i).y;
      this.cacheY = y;
    }
    return this.cacheY;
  }

  distanciaEuclidiana(u: number, v: number): number {
    const a = this.estaciones.obtener(u);
    const b = this.estaciones.obtener(v);
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /**
   * Mayor velocidad de la red, en km/min: máx(euclidiana(u, v) / tiempo(u, v)) sobre las vías.
   * Dividir la distancia euclidiana entre este valor nunca sobrestima el tiempo de una vía,
   * y por eso h = euclidiana / velocidadMáxima sigue siendo admisible en minutos.
   */
  velocidadMaxima(): number {
    let v = 0;
    for (let i = 0; i < this.numVias; i++) {
      const via = this.vias.obtener(i);
      if (via.tiempoMin > 0) {
        const r = this.distanciaEuclidiana(via.origen, via.destino) / via.tiempoMin;
        if (r > v) v = r;
      }
    }
    return v > 0 ? v : 1;
  }

  matriz(metrica: Metrica): MatrizAdyacencia {
    const m = new MatrizAdyacencia(this.numEstaciones);
    const pesos = this.pesos(metrica);
    for (let u = 0; u < this.numEstaciones; u++) {
      for (let e = this.adj.primero(u); e !== -1; e = this.adj.siguiente(e)) m.poner(u, this.adj.destino(e), pesos[e]);
    }
    return m;
  }

  /** Lista de adyacencia del grafo con cada arco invertido, para calcular costos hacia un destino. */
  listaInvertida(): ListaAdyacencia {
    const r = new ListaAdyacencia(this.numEstaciones, this.numArcos);
    for (let i = 0; i < this.numEstaciones; i++) r.agregarVertice();
    for (let u = 0; u < this.numEstaciones; u++) {
      for (let e = this.adj.primero(u); e !== -1; e = this.adj.siguiente(e)) {
        r.agregarArco(this.adj.destino(e), u, this.adj.distanciaKm(e), this.adj.tiempoMin(e));
      }
    }
    return r;
  }

  /** El grafo no dirigido subyacente, para componentes débiles y Tarjan en redes dirigidas. */
  listaNoDirigida(): ListaAdyacencia {
    if (!this.dirigida) return this.adj;
    const r = new ListaAdyacencia(this.numEstaciones, this.numVias * 2);
    for (let i = 0; i < this.numEstaciones; i++) r.agregarVertice();
    for (let i = 0; i < this.numVias; i++) {
      const via = this.vias.obtener(i);
      r.agregarArco(via.origen, via.destino, via.distanciaKm, via.tiempoMin);
      r.agregarArco(via.destino, via.origen, via.distanciaKm, via.tiempoMin);
    }
    return r;
  }

  aJSON(): RedJSON {
    const estaciones = new Array<RedJSON['estaciones'][number]>(this.numEstaciones);
    for (let i = 0; i < this.numEstaciones; i++) {
      const e = this.estaciones.obtener(i);
      estaciones[i] = { id: e.id, nombre: e.nombre, x: e.x, y: e.y, linea: e.linea };
    }
    const vias = new Array<RedJSON['vias'][number]>(this.numVias);
    for (let i = 0; i < this.numVias; i++) {
      const v = this.vias.obtener(i);
      vias[i] = {
        desde: this.estaciones.obtener(v.origen).id,
        hasta: this.estaciones.obtener(v.destino).id,
        distanciaKm: v.distanciaKm,
        tiempoMin: v.tiempoMin,
      };
    }
    return { nombre: this.nombre, dirigida: this.dirigida, estaciones, vias };
  }

  static desdeJSON(json: RedJSON): RedTransporte {
    const errores = validarRedJSON(json);
    if (errores.length > 0) throw new Error(errores[0]);
    const red = new RedTransporte(json.nombre, json.dirigida, json.estaciones.length, json.vias.length * 2);
    for (let i = 0; i < json.estaciones.length; i++) {
      const e = json.estaciones[i];
      red.agregarEstacion(e.id, e.x, e.y, e.nombre, e.linea);
    }
    for (let i = 0; i < json.vias.length; i++) {
      const v = json.vias[i];
      red.agregarVia(red.indiceDe(v.desde), red.indiceDe(v.hasta), v.distanciaKm, v.tiempoMin);
    }
    return red;
  }
}

/** Revisa una red importada y devuelve mensajes claros. Lista vacía significa que es válida. */
export function validarRedJSON(json: RedJSON): string[] {
  const errores = new ArregloDinamico<string>();
  if (json === null || typeof json !== 'object') return ['El archivo no contiene una red.'];
  const estaciones = json.estaciones;
  const vias = json.vias;
  if (estaciones === undefined || typeof estaciones.length !== 'number') errores.agregar('Falta la lista de estaciones.');
  if (vias === undefined || typeof vias.length !== 'number') errores.agregar('Falta la lista de vías.');
  if (errores.tamano > 0) return errores.aArreglo();

  const vistos = new TablaHash<number>();
  for (let i = 0; i < estaciones.length; i++) {
    const e = estaciones[i];
    if (typeof e.id !== 'string' || e.id.length === 0) errores.agregar(`La estación ${i + 1} no tiene id.`);
    else if (vistos.contiene(e.id)) errores.agregar(`El id ${e.id} está repetido.`);
    else vistos.poner(e.id, i);
    if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) errores.agregar(`La estación ${e.id} no tiene coordenadas válidas.`);
  }
  for (let i = 0; i < vias.length; i++) {
    const v = vias[i];
    if (!vistos.contiene(v.desde)) errores.agregar(`La vía ${i + 1} sale de ${v.desde}, que no existe.`);
    if (!vistos.contiene(v.hasta)) errores.agregar(`La vía ${i + 1} llega a ${v.hasta}, que no existe.`);
    if (!(v.distanciaKm >= 0) || !(v.tiempoMin >= 0)) errores.agregar(`La vía ${v.desde}-${v.hasta} tiene un peso negativo o inválido.`);
  }
  return errores.aArreglo();
}
