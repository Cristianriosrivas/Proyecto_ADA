import { ArregloDinamico } from '../estructuras/ArregloDinamico';
import { MinHeapIndexado } from '../estructuras/MinHeapIndexado';
import type { RedTransporte } from '../grafo/RedTransporte';
import type { Metrica } from '../grafo/tipos';

/** Tolerancia del punto flotante: A-C mide 2 y pesa 2, y la raíz puede dar 2.0000000000000004. */
const EPS = 1e-9;

export interface ViolacionAdmisibilidad {
  nodo: number;
  h: number;
  hReal: number;
}

export interface ViolacionConsistencia {
  arco: number;
  desde: number;
  hasta: number;
  hDesde: number;
  peso: number;
  hHasta: number;
}

export interface ReporteHeuristica {
  admisible: boolean;
  consistente: boolean;
  /** Vías más cortas que la línea recta entre sus estaciones. */
  viasMenoresQueRecta: number;
  admisibilidad: ViolacionAdmisibilidad[];
  consistencia: ViolacionConsistencia[];
  /** Costo real h*(n) hasta el destino. */
  hReal: Float64Array;
}

/** h(n) = distancia euclidiana a t, en las unidades de la métrica. */
export function heuristicaEuclidiana(red: RedTransporte, t: number, metrica: Metrica): Float64Array {
  const div = metrica === 'min' ? red.velocidadMaxima() : 1;
  const h = new Float64Array(red.numEstaciones);
  for (let v = 0; v < h.length; v++) h[v] = red.distanciaEuclidiana(v, t) / div;
  return h;
}

/** h*(n): costo real de cada estación hasta t, con Dijkstra sobre la red invertida. */
export function costosHastaDestino(red: RedTransporte, t: number, metrica: Metrica): Float64Array {
  const n = red.numEstaciones;
  const inv = red.listaInvertida();
  const d = new Float64Array(n).fill(Infinity);
  const Q = new MinHeapIndexado(n > 0 ? n : 1);
  d[t] = 0;
  Q.insertar(t, 0);
  while (!Q.estaVacio()) {
    const u = Q.extraerMin();
    for (let e = inv.primero(u); e !== -1; e = inv.siguiente(e)) {
      const v = inv.destino(e);
      const nuevo = d[u] + (metrica === 'km' ? inv.distanciaKm(e) : inv.tiempoMin(e));
      if (nuevo < d[v]) {
        d[v] = nuevo;
        if (Q.contiene(v)) Q.disminuirClave(v, nuevo);
        else Q.insertar(v, nuevo);
      }
    }
  }
  return d;
}

/**
 * Revisa una heurística contra las dos condiciones de la pregunta 5.
 *  - Admisible: h(n) ≤ h*(n) en toda estación.
 *  - Consistente: h(u) ≤ w(u, v) + h(v) en todo arco y h(meta) = 0.
 * Consistente implica admisible; lo contrario no.
 */
export function validarHeuristica(red: RedTransporte, h: Float64Array, t: number, metrica: Metrica): ReporteHeuristica {
  const hReal = costosHastaDestino(red, t, metrica);
  const admisibilidad = new ArregloDinamico<ViolacionAdmisibilidad>();
  for (let v = 0; v < h.length; v++) {
    if (hReal[v] !== Infinity && h[v] > hReal[v] + EPS) admisibilidad.agregar({ nodo: v, h: h[v], hReal: hReal[v] });
  }

  const consistencia = new ArregloDinamico<ViolacionConsistencia>();
  const pesos = red.pesos(metrica);
  for (let u = 0; u < h.length; u++) {
    for (let e = red.adj.primero(u); e !== -1; e = red.adj.siguiente(e)) {
      const v = red.adj.destino(e);
      if (h[u] > pesos[e] + h[v] + EPS) consistencia.agregar({ arco: e, desde: u, hasta: v, hDesde: h[u], peso: pesos[e], hHasta: h[v] });
    }
  }
  const metaEnCero = Math.abs(h[t]) <= EPS;

  let viasMenoresQueRecta = 0;
  const div = metrica === 'min' ? red.velocidadMaxima() : 1;
  for (let i = 0; i < red.numVias; i++) {
    const via = red.via(i);
    const costo = metrica === 'km' ? via.distanciaKm : via.tiempoMin;
    if (red.distanciaEuclidiana(via.origen, via.destino) / div > costo + EPS) viasMenoresQueRecta++;
  }

  return {
    admisible: admisibilidad.tamano === 0,
    consistente: consistencia.tamano === 0 && metaEnCero,
    viasMenoresQueRecta,
    admisibilidad: admisibilidad.aArreglo(),
    consistencia: consistencia.aArreglo(),
    hReal,
  };
}
