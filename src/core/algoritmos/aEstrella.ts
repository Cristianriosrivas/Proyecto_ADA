import { MinHeapIndexado } from '../estructuras/MinHeapIndexado';
import type { RedTransporte } from '../grafo/RedTransporte';
import { ESTADO, type Tracer } from '../instrumentacion/tipos';
import { estadosConRuta, numero, reconstruirRuta, textoRuta } from './comun';
import { contadoresVacios, type OpcionesCamino, type ResultadoCamino } from './dijkstra';

export interface OpcionesAEstrella extends OpcionesCamino {
  /** Peso w de A* ponderado: f = g + w·h. Con w = 1 es A* normal. */
  pesoHeuristica?: number;
  /** Si es verdadero, h = 0 y A* se comporta exactamente como Dijkstra. */
  sinHeuristica?: boolean;
  /** Valores de h por estación, para probar heurísticas distintas a la euclidiana. */
  h?: Float64Array;
}

export interface ResultadoAEstrella extends ResultadoCamino {
  /** h de cada estación que se llegó a evaluar; NaN en las demás. */
  h: Float64Array;
}

/**
 * Divisor que deja la distancia euclidiana en las unidades de la métrica.
 * En km es 1. En minutos es la velocidad máxima de la red: si se usara la distancia sin
 * convertir, h estaría en km y compararía peras con manzanas, y además dejaría de ser
 * admisible en cualquier vía más rápida que 1 km/min.
 */
export function divisorHeuristica(red: RedTransporte, opts: OpcionesCamino): number {
  return (opts.metrica ?? 'km') === 'min' ? red.velocidadMaxima() : 1;
}

/**
 * A*: f(n) = g(n) + w·h(n), con h = distancia euclidiana hasta el destino.
 *
 * Es Dijkstra con otra clave en el heap, así que su cota es la misma, O((V + E) lg V). La
 * ventaja es práctica: con una buena h deja de explorar en círculo y va hacia la meta.
 * Con h consistente ningún nodo cerrado se reabre. Con h solo admisible puede hacer falta
 * reabrir, y por eso este código lo permite y lo cuenta en `reaperturas`.
 */
export function aEstrella(red: RedTransporte, s: number, t: number, opts: OpcionesAEstrella = {}, tracer?: Tracer): ResultadoAEstrella {
  const n = red.numEstaciones;
  const adj = red.adj;
  const pesos = opts.pesos ?? red.pesos(opts.metrica ?? 'km');
  const bloqueados = opts.arcosBloqueados;
  const w = opts.pesoHeuristica ?? 1;
  const hDada = opts.h;
  const sinH = opts.sinHeuristica === true;
  const div = divisorHeuristica(red, opts);
  const xs = red.coordenadasX();
  const ys = red.coordenadasY();
  const tx = xs[t];
  const ty = ys[t];

  const g = new Float64Array(n).fill(Infinity);
  const h = new Float64Array(n).fill(NaN);
  const pi = new Int32Array(n).fill(-1);
  const cerrado = new Uint8Array(n);
  const estado = new Uint8Array(n);
  const orden = new Int32Array(n);
  const c = contadoresVacios();
  const Q = new MinHeapIndexado(n > 0 ? n : 1);
  let cerrados = 0;
  let linea = 0;

  // h se calcula al primer uso: en una consulta local la mayoría de nodos nunca se toca
  const hDe = (v: number): number => {
    let r = h[v];
    if (r !== r) {
      r = sinH ? 0 : hDada !== undefined ? hDada[v] : Math.hypot(xs[v] - tx, ys[v] - ty) / div;
      h[v] = r;
    }
    return r;
  };

  const id = (i: number) => red.estacion(i).id;
  const foto =
    tracer === undefined
      ? undefined
      : (ln: number, narracion: string, nodo: number, arco: number, estados: Uint8Array = estado, heapIntercambio?: [number, number]) => {
          const heapIds = new Int32Array(Q.fotoIds());
          const heapClaves = new Float64Array(heapIds.length);
          for (let i = 0; i < heapIds.length; i++) heapClaves[i] = Q.clave(heapIds[i]);
          tracer.registrar({ linea: ln, narracion, iteracion: c.expandidos, nodo, arco, estados: new Uint8Array(estados), pi: new Int32Array(pi), d: new Float64Array(g), h: new Float64Array(h), heapIds, heapClaves, heapIntercambio });
        };
  if (foto !== undefined) {
    Q.observador = (ev) => foto(linea, `${ev.tipo === 'subir' ? 'Sift-up' : 'Sift-down'}: se intercambian las posiciones ${ev.i} y ${ev.j} del heap.`, -1, -1, estado, [ev.i, ev.j]);
    foto(1, 'Todas las estaciones empiezan con g = ∞ y π = NIL.', -1, -1);
  }

  g[s] = 0;
  if (foto !== undefined) foto(2, `El origen ${id(s)} recibe g = 0.`, s, -1);
  linea = 4;
  const f0 = w * hDe(s);
  Q.insertar(s, f0);
  c.inserciones++;
  c.maximoCola = 1;
  estado[s] = ESTADO.FRONTERA;
  if (foto !== undefined) foto(4, `Se inserta ${id(s)} con f = 0 + ${numero(h[s])} = ${numero(f0)}.`, s, -1);

  while (!Q.estaVacio()) {
    linea = 6;
    const u = Q.extraerMin();
    c.extracciones++;
    c.expandidos++;
    cerrado[u] = 1;
    estado[u] = ESTADO.CERRADO;
    orden[cerrados++] = u;
    if (foto !== undefined) foto(6, `Se extrae ${id(u)}: g = ${numero(g[u])}, h = ${numero(h[u])}, f = ${numero(g[u] + w * h[u])}.`, u, -1);
    if (u === t) {
      if (foto !== undefined) foto(8, `Se cerró el destino ${id(t)}.`, u, -1);
      break;
    }
    for (let e = adj.primero(u); e !== -1; e = adj.siguiente(e)) {
      if (bloqueados !== undefined && bloqueados[e] === 1) continue;
      const v = adj.destino(e);
      const peso = pesos[e];
      const nuevo = g[u] + peso;
      c.relajaciones++;
      if (nuevo < g[v]) {
        const antes = g[v];
        g[v] = nuevo;
        pi[v] = u;
        c.mejoras++;
        const f = nuevo + w * hDe(v);
        if (foto !== undefined) {
          foto(11, `Se relaja ${id(u)} → ${id(v)}: g = ${numero(g[u])} + ${numero(peso)} = ${numero(nuevo)} < ${numero(antes)}, h = ${numero(h[v])}, f = ${numero(f)}.`, v, e);
        }
        if (Q.contiene(v)) {
          linea = 12;
          Q.disminuirClave(v, f);
          c.disminuciones++;
          if (foto !== undefined) foto(12, `DECREASE-KEY: ${id(v)} baja su clave a f = ${numero(f)}.`, v, e);
        } else {
          linea = 13;
          if (cerrado[v] === 1) {
            cerrado[v] = 0;
            c.reaperturas++;
          }
          Q.insertar(v, f);
          c.inserciones++;
          if (Q.tamano > c.maximoCola) c.maximoCola = Q.tamano;
          estado[v] = ESTADO.FRONTERA;
          if (foto !== undefined) foto(13, `Se inserta ${id(v)} en el heap con f = ${numero(f)}.`, v, e);
        }
      } else if (foto !== undefined) {
        foto(10, `Se relaja ${id(u)} → ${id(v)}: g = ${numero(nuevo)} no mejora ${numero(g[v])}.`, u, e);
      }
    }
  }
  c.comparaciones = Q.comparaciones;
  c.intercambios = Q.intercambios;
  Q.observador = undefined;

  const ruta = g[t] !== Infinity ? reconstruirRuta(pi, s, t) : new Int32Array(0);
  if (foto !== undefined) {
    foto(14, ruta.length > 0 ? `Ruta: ${textoRuta(ruta, id)}, con costo ${numero(g[t])}.` : 'No hay ruta entre las estaciones.', t, -1, estadosConRuta(estado, ruta));
  }
  return { alcanzado: ruta.length > 0, ruta, costo: g[t], saltos: ruta.length > 0 ? ruta.length - 1 : -1, d: g, pi, orden: orden.subarray(0, cerrados), contadores: c, h };
}
