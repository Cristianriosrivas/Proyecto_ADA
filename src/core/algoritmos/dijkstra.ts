import { MinHeapIndexado } from '../estructuras/MinHeapIndexado';
import { MinHeapPerezoso } from '../estructuras/MinHeapPerezoso';
import type { RedTransporte } from '../grafo/RedTransporte';
import type { Metrica } from '../grafo/tipos';
import { ESTADO, type Tracer } from '../instrumentacion/tipos';
import { estadosConRuta, numero, reconstruirRuta, textoRuta, type OpcionesRecorrido } from './comun';

export interface OpcionesCamino extends OpcionesRecorrido {
  metrica?: Metrica;
  /** Pesos por arco que reemplazan los de la red, por ejemplo con congestión. */
  pesos?: Float64Array;
}

export interface ContadoresCamino {
  /** Nodos cerrados. */
  expandidos: number;
  /** Arcos relajados: veces que se evaluó d[u] + w(u, v) < d[v]. */
  relajaciones: number;
  /** Relajaciones que sí mejoraron d[v]. */
  mejoras: number;
  inserciones: number;
  extracciones: number;
  disminuciones: number;
  comparaciones: number;
  intercambios: number;
  /** Mayor tamaño del heap. */
  maximoCola: number;
  /** Nodos cerrados que hubo que volver a abrir. Solo ocurre con h inconsistente. */
  reaperturas: number;
}

export interface ResultadoCamino {
  alcanzado: boolean;
  ruta: Int32Array;
  costo: number;
  saltos: number;
  d: Float64Array;
  pi: Int32Array;
  /** Estaciones cerradas, en el orden en que se cerraron. */
  orden: Int32Array;
  contadores: ContadoresCamino;
}

export function contadoresVacios(): ContadoresCamino {
  return { expandidos: 0, relajaciones: 0, mejoras: 0, inserciones: 0, extracciones: 0, disminuciones: 0, comparaciones: 0, intercambios: 0, maximoCola: 0, reaperturas: 0 };
}

function validarPesos(pesos: Float64Array): void {
  for (let e = 0; e < pesos.length; e++) {
    if (pesos[e] < 0) throw new Error('Dijkstra exige pesos no negativos');
  }
}

/**
 * Dijkstra con Min-Heap indexado.
 *
 * Invariante: al extraer u, d[u] ya es δ(s, u). Se cumple porque los pesos no son negativos:
 * cualquier otro camino pasaría por un nodo del heap con clave ≥ d[u].
 * Cada nodo se extrae a lo sumo una vez y cada arco se relaja a lo sumo una vez, con
 * operaciones de heap O(lg V), así que el costo total es O((V + E) lg V).
 * Con destino, para al cerrarlo: en ese momento su distancia ya es definitiva.
 */
export function dijkstra(red: RedTransporte, s: number, t = -1, opts: OpcionesCamino = {}, tracer?: Tracer): ResultadoCamino {
  const n = red.numEstaciones;
  const adj = red.adj;
  const pesos = opts.pesos ?? red.pesos(opts.metrica ?? 'km');
  const bloqueados = opts.arcosBloqueados;
  validarPesos(pesos);
  const d = new Float64Array(n).fill(Infinity);
  const pi = new Int32Array(n).fill(-1);
  const estado = new Uint8Array(n);
  const orden = new Int32Array(n);
  const c = contadoresVacios();
  const Q = new MinHeapIndexado(n > 0 ? n : 1);
  let cerrados = 0;
  let linea = 0;

  const id = (i: number) => red.estacion(i).id;
  const foto =
    tracer === undefined
      ? undefined
      : (ln: number, narracion: string, nodo: number, arco: number, estados: Uint8Array = estado, heapIntercambio?: [number, number]) => {
          const heapIds = new Int32Array(Q.fotoIds());
          const heapClaves = new Float64Array(heapIds.length);
          for (let i = 0; i < heapIds.length; i++) heapClaves[i] = Q.clave(heapIds[i]);
          tracer.registrar({ linea: ln, narracion, iteracion: c.expandidos, nodo, arco, estados: new Uint8Array(estados), pi: new Int32Array(pi), d: new Float64Array(d), heapIds, heapClaves, heapIntercambio });
        };
  if (foto !== undefined) {
    Q.observador = (ev) => foto(linea, `${ev.tipo === 'subir' ? 'Sift-up' : 'Sift-down'}: se intercambian las posiciones ${ev.i} y ${ev.j} del heap.`, -1, -1, estado, [ev.i, ev.j]);
    foto(1, 'Todas las estaciones empiezan con d = ∞ y π = NIL.', -1, -1);
  }

  d[s] = 0;
  if (foto !== undefined) foto(2, `El origen ${id(s)} recibe d = 0.`, s, -1);
  linea = 5;
  Q.insertar(s, 0);
  c.inserciones++;
  c.maximoCola = 1;
  estado[s] = ESTADO.FRONTERA;
  if (foto !== undefined) foto(5, `Se inserta ${id(s)} en el heap con clave 0.`, s, -1);

  while (!Q.estaVacio()) {
    linea = 7;
    const u = Q.extraerMin();
    c.extracciones++;
    c.expandidos++;
    estado[u] = ESTADO.CERRADO;
    orden[cerrados++] = u;
    if (foto !== undefined) foto(7, `Se extrae ${id(u)} del heap con d = ${numero(d[u])}.`, u, -1);
    if (u === t) {
      if (foto !== undefined) foto(9, `Se cerró el destino ${id(t)}: su distancia ya es definitiva.`, u, -1);
      break;
    }
    for (let e = adj.primero(u); e !== -1; e = adj.siguiente(e)) {
      if (bloqueados !== undefined && bloqueados[e] === 1) continue;
      const v = adj.destino(e);
      const w = pesos[e];
      const nuevo = d[u] + w;
      c.relajaciones++;
      if (nuevo < d[v]) {
        const antes = d[v];
        d[v] = nuevo;
        pi[v] = u;
        c.mejoras++;
        if (foto !== undefined) {
          foto(12, `Se relaja ${id(u)} → ${id(v)}: ${numero(d[u])} + ${numero(w)} = ${numero(nuevo)} < ${numero(antes)}, se actualiza d[${id(v)}] = ${numero(nuevo)} y π[${id(v)}] = ${id(u)}.`, v, e);
        }
        if (Q.contiene(v)) {
          linea = 13;
          Q.disminuirClave(v, nuevo);
          c.disminuciones++;
          if (foto !== undefined) foto(13, `DECREASE-KEY: ${id(v)} baja su clave a ${numero(nuevo)}.`, v, e);
        } else {
          linea = 14;
          Q.insertar(v, nuevo);
          c.inserciones++;
          if (Q.tamano > c.maximoCola) c.maximoCola = Q.tamano;
          estado[v] = ESTADO.FRONTERA;
          if (foto !== undefined) foto(14, `Se inserta ${id(v)} en el heap con clave ${numero(nuevo)}.`, v, e);
        }
      } else if (foto !== undefined) {
        foto(11, `Se relaja ${id(u)} → ${id(v)}: ${numero(d[u])} + ${numero(w)} = ${numero(nuevo)} no mejora d[${id(v)}] = ${numero(d[v])}.`, u, e);
      }
    }
  }
  c.comparaciones = Q.comparaciones;
  c.intercambios = Q.intercambios;
  Q.observador = undefined;

  const ruta = t >= 0 && d[t] !== Infinity ? reconstruirRuta(pi, s, t) : new Int32Array(0);
  if (foto !== undefined) {
    foto(15, ruta.length > 0 ? `Ruta: ${textoRuta(ruta, id)}, con costo ${numero(d[t])}.` : 'No hay ruta entre las estaciones.', t, -1, estadosConRuta(estado, ruta));
  }
  return { alcanzado: ruta.length > 0, ruta, costo: t >= 0 ? d[t] : Infinity, saltos: ruta.length > 0 ? ruta.length - 1 : -1, d, pi, orden: orden.subarray(0, cerrados), contadores: c };
}

/**
 * Dijkstra con arreglo desordenado: EXTRACT-MIN barre todos los nodos, Θ(V) por extracción.
 * Total Θ(V² + E) = Θ(V²). No tiene heap, así que relajar es O(1): por eso gana en redes
 * densas, donde E ≈ V² y el lg V por arco del heap pesa más que el barrido.
 */
export function dijkstraArreglo(red: RedTransporte, s: number, t = -1, opts: OpcionesCamino = {}): ResultadoCamino {
  const n = red.numEstaciones;
  const adj = red.adj;
  const pesos = opts.pesos ?? red.pesos(opts.metrica ?? 'km');
  const bloqueados = opts.arcosBloqueados;
  validarPesos(pesos);
  const d = new Float64Array(n).fill(Infinity);
  const pi = new Int32Array(n).fill(-1);
  const cerrado = new Uint8Array(n);
  const orden = new Int32Array(n);
  const c = contadoresVacios();
  let cerrados = 0;
  d[s] = 0;

  for (;;) {
    // Desempate igual al del heap: a igual distancia, el índice menor
    let u = -1;
    let mejor = Infinity;
    for (let v = 0; v < n; v++) {
      c.comparaciones++;
      if (cerrado[v] === 0 && d[v] < mejor) {
        mejor = d[v];
        u = v;
      }
    }
    if (u === -1) break;
    cerrado[u] = 1;
    orden[cerrados++] = u;
    c.extracciones++;
    c.expandidos++;
    if (u === t) break;
    for (let e = adj.primero(u); e !== -1; e = adj.siguiente(e)) {
      if (bloqueados !== undefined && bloqueados[e] === 1) continue;
      const v = adj.destino(e);
      const nuevo = d[u] + pesos[e];
      c.relajaciones++;
      if (nuevo < d[v]) {
        d[v] = nuevo;
        pi[v] = u;
        c.mejoras++;
      }
    }
  }

  const ruta = t >= 0 && d[t] !== Infinity ? reconstruirRuta(pi, s, t) : new Int32Array(0);
  return { alcanzado: ruta.length > 0, ruta, costo: t >= 0 ? d[t] : Infinity, saltos: ruta.length > 0 ? ruta.length - 1 : -1, d, pi, orden: orden.subarray(0, cerrados), contadores: c };
}

/**
 * Dijkstra con heap de eliminación perezosa, solo para comparar en el laboratorio.
 * Sin decrease-key: inserta duplicados y descarta los obsoletos al extraer. El heap puede
 * llegar a E entradas, pero lg E = O(lg V) porque E ≤ V², así que la cota asintótica no cambia.
 */
export function dijkstraPerezoso(red: RedTransporte, s: number, t = -1, opts: OpcionesCamino = {}): ResultadoCamino {
  const n = red.numEstaciones;
  const adj = red.adj;
  const pesos = opts.pesos ?? red.pesos(opts.metrica ?? 'km');
  const bloqueados = opts.arcosBloqueados;
  validarPesos(pesos);
  const d = new Float64Array(n).fill(Infinity);
  const pi = new Int32Array(n).fill(-1);
  const cerrado = new Uint8Array(n);
  const orden = new Int32Array(n);
  const c = contadoresVacios();
  const Q = new MinHeapPerezoso(n > 0 ? n : 1);
  let cerrados = 0;
  d[s] = 0;
  Q.insertar(s, 0);
  c.inserciones++;

  while (!Q.estaVacio()) {
    const u = Q.extraerId();
    c.extracciones++;
    if (cerrado[u] === 1) continue;
    cerrado[u] = 1;
    orden[cerrados++] = u;
    c.expandidos++;
    if (u === t) break;
    for (let e = adj.primero(u); e !== -1; e = adj.siguiente(e)) {
      if (bloqueados !== undefined && bloqueados[e] === 1) continue;
      const v = adj.destino(e);
      const nuevo = d[u] + pesos[e];
      c.relajaciones++;
      if (nuevo < d[v]) {
        d[v] = nuevo;
        pi[v] = u;
        c.mejoras++;
        Q.insertar(v, nuevo);
        c.inserciones++;
      }
    }
  }
  c.comparaciones = Q.comparaciones;
  c.intercambios = Q.intercambios;
  c.maximoCola = Q.maximo;

  const ruta = t >= 0 && d[t] !== Infinity ? reconstruirRuta(pi, s, t) : new Int32Array(0);
  return { alcanzado: ruta.length > 0, ruta, costo: t >= 0 ? d[t] : Infinity, saltos: ruta.length > 0 ? ruta.length - 1 : -1, d, pi, orden: orden.subarray(0, cerrados), contadores: c };
}
