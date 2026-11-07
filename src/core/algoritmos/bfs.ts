import { ColaCircular } from '../estructuras/ColaCircular';
import type { MatrizAdyacencia } from '../estructuras/MatrizAdyacencia';
import type { RedTransporte } from '../grafo/RedTransporte';
import { ESTADO, type Tracer } from '../instrumentacion/tipos';
import { estadosConRuta, reconstruirRuta, saltosAReales, textoRuta, type OpcionesRecorrido, type ResultadoRecorrido } from './comun';

/**
 * BFS con parada al descubrir el destino. Sin destino (t = -1) recorre todo lo alcanzable.
 *
 * Explora por niveles: todos los nodos a distancia k se descubren antes que cualquiera a
 * distancia k + 1. Por eso el primer camino que llega a t tiene el mínimo de saltos.
 * Tiempo Θ(V + E) sobre lista de adyacencia, porque cada nodo entra una vez a la cola y su
 * lista se recorre una vez.
 */
export function bfs(red: RedTransporte, s: number, t = -1, opts: OpcionesRecorrido = {}, tracer?: Tracer): ResultadoRecorrido {
  const n = red.numEstaciones;
  const adj = red.adj;
  const bloqueados = opts.arcosBloqueados;
  const color = new Uint8Array(n);
  const d = new Int32Array(n).fill(-1);
  const pi = new Int32Array(n).fill(-1);
  const orden = new Int32Array(n);
  let visitados = 0;
  let externas = 0;
  let internas = 0;
  let insertados = 0;
  let maximo = 1;

  const Q = new ColaCircular<number>(n > 0 ? n : 1);
  const id = (i: number) => red.estacion(i).id;
  const foto =
    tracer === undefined
      ? undefined
      : (linea: number, narracion: string, nodo: number, arco: number, estados: Uint8Array = color) =>
          tracer.registrar({
            linea,
            narracion,
            iteracion: externas,
            nodo,
            arco,
            estados: new Uint8Array(estados),
            pi: new Int32Array(pi),
            d: saltosAReales(d),
            cola: Q.aArreglo(),
          });

  if (foto !== undefined) foto(2, 'Todas las estaciones empiezan en blanco, con d = ∞ y π = NIL.', -1, -1);
  color[s] = ESTADO.FRONTERA;
  d[s] = 0;
  if (foto !== undefined) foto(3, `El origen ${id(s)} pasa a gris con d = 0.`, s, -1);
  Q.encolar(s);
  insertados++;
  orden[visitados++] = s;
  if (foto !== undefined) foto(5, `Se encola ${id(s)}.`, s, -1);

  let encontrado = s === t;
  while (!encontrado && !Q.estaVacia()) {
    const u = Q.desencolar();
    externas++;
    if (foto !== undefined) foto(7, `Se saca ${id(u)} del frente de la cola, con d = ${d[u]}.`, u, -1);
    for (let e = adj.primero(u); e !== -1; e = adj.siguiente(e)) {
      internas++;
      if (bloqueados !== undefined && bloqueados[e] === 1) continue;
      const v = adj.destino(e);
      if (foto !== undefined) {
        foto(8, `Se examina la vía ${id(u)} → ${id(v)}: ${color[v] === ESTADO.NO_VISITADO ? `${id(v)} está en blanco` : `${id(v)} ya fue descubierta`}.`, u, e);
      }
      if (color[v] === ESTADO.NO_VISITADO) {
        color[v] = ESTADO.FRONTERA;
        d[v] = d[u] + 1;
        pi[v] = u;
        orden[visitados++] = v;
        if (foto !== undefined) foto(10, `${id(v)} pasa a gris con d = ${d[v]} y π = ${id(u)}.`, v, e);
        if (v === t) {
          encontrado = true;
          if (foto !== undefined) foto(11, `Se descubrió el destino ${id(t)}: el recorrido se detiene.`, v, e);
          break;
        }
        Q.encolar(v);
        insertados++;
        if (Q.tamano > maximo) maximo = Q.tamano;
        if (foto !== undefined) foto(12, `Se encola ${id(v)}.`, v, e);
      }
    }
    if (!encontrado) {
      color[u] = ESTADO.CERRADO;
      if (foto !== undefined) foto(13, `${id(u)} pasa a negro: ya se revisaron todos sus vecinos.`, u, -1);
    }
  }

  const ruta = t >= 0 && (encontrado || d[t] >= 0) ? reconstruirRuta(pi, s, t) : new Int32Array(0);
  if (foto !== undefined) {
    foto(14, ruta.length > 0 ? `Ruta: ${textoRuta(ruta, id)}, con ${ruta.length - 1} saltos.` : 'No hay ruta entre las estaciones.', t, -1, estadosConRuta(color, ruta));
  }
  return {
    alcanzado: ruta.length > 0,
    ruta,
    saltos: ruta.length > 0 ? ruta.length - 1 : -1,
    d,
    pi,
    orden,
    visitados,
    contadores: { externas, internas, insertados, maximoEstructura: maximo },
  };
}

/**
 * El mismo BFS sobre matriz de adyacencia, para la pregunta 1.
 * Hallar los vecinos de u cuesta Θ(V) porque se barre la fila completa, así que el total es
 * Θ(V²) aunque la red tenga muy pocas vías.
 */
export function bfsMatriz(m: MatrizAdyacencia, s: number): { d: Int32Array; celdas: number } {
  const n = m.n;
  const d = new Int32Array(n).fill(-1);
  const Q = new ColaCircular<number>(n > 0 ? n : 1);
  d[s] = 0;
  Q.encolar(s);
  let celdas = 0;
  while (!Q.estaVacia()) {
    const u = Q.desencolar();
    for (let v = 0; v < n; v++) {
      celdas++;
      if (m.existe(u, v) && d[v] === -1) {
        d[v] = d[u] + 1;
        Q.encolar(v);
      }
    }
  }
  return { d, celdas };
}
