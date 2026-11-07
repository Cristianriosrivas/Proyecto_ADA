import type { MatrizAdyacencia } from '../estructuras/MatrizAdyacencia';
import { Pila } from '../estructuras/Pila';
import type { RedTransporte } from '../grafo/RedTransporte';
import { ESTADO, type Tracer } from '../instrumentacion/tipos';
import { estadosConRuta, reconstruirRuta, saltosAReales, textoRuta, type OpcionesRecorrido, type ResultadoRecorrido } from './comun';

/** Par que se apila: la estación y quién la empujó (regla de oro 6). */
interface Par {
  nodo: number;
  padre: number;
}

/**
 * DFS iterativo con pila propia.
 *
 * Dos detalles hacen que reproduzca el orden del DFS recursivo:
 *  1. Se marca visitado al **sacar** de la pila, no al meter. Un nodo puede estar apilado
 *     varias veces; la entrada que cuenta es la que salga primero.
 *  2. Los vecinos se empujan en orden inverso, recorriendo la lista desde `ultimo`. Así el
 *     primer vecino queda en la cima, que es el que la recursión visitaría primero.
 *
 * El precio es que la pila puede llegar a O(E) entradas, no O(V). El tiempo sigue siendo
 * Θ(V + E): cada lista se recorre una sola vez, cuando su nodo se visita.
 */
export function dfsIterativo(red: RedTransporte, s: number, t = -1, opts: OpcionesRecorrido = {}, tracer?: Tracer): ResultadoRecorrido {
  const n = red.numEstaciones;
  const adj = red.adj;
  const bloqueados = opts.arcosBloqueados;
  const estado = new Uint8Array(n);
  const visitado = new Uint8Array(n);
  const d = new Int32Array(n).fill(-1);
  const pi = new Int32Array(n).fill(-1);
  const orden = new Int32Array(n);
  let visitados = 0;
  let externas = 0;
  let internas = 0;
  let insertados = 0;
  let maximo = 1;

  const S = new Pila<Par>(n > 0 ? n : 1);
  const id = (i: number) => red.estacion(i).id;
  const foto =
    tracer === undefined
      ? undefined
      : (linea: number, narracion: string, nodo: number, arco: number, estados: Uint8Array = estado) => {
          const contenido = S.aArreglo();
          const pilaNodos = new Array<number>(contenido.length);
          const pilaPadres = new Array<number>(contenido.length);
          for (let i = 0; i < contenido.length; i++) {
            pilaNodos[i] = contenido[i].nodo;
            pilaPadres[i] = contenido[i].padre;
          }
          tracer.registrar({
            linea,
            narracion,
            iteracion: externas,
            nodo,
            arco,
            estados: new Uint8Array(estados),
            pi: new Int32Array(pi),
            d: saltosAReales(d),
            pilaNodos,
            pilaPadres,
          });
        };

  if (foto !== undefined) foto(1, 'Ninguna estación está visitada y todas tienen π = NIL.', -1, -1);
  S.apilar({ nodo: s, padre: -1 });
  insertados++;
  estado[s] = ESTADO.FRONTERA;
  if (foto !== undefined) foto(3, `Se apila el par (${id(s)}, NIL).`, s, -1);

  let encontrado = false;
  while (!S.estaVacia()) {
    const { nodo: u, padre } = S.desapilar();
    externas++;
    if (visitado[u] === 1) {
      if (foto !== undefined) foto(6, `${id(u)} ya estaba visitada: esta entrada de la pila se descarta.`, u, -1);
      continue;
    }
    visitado[u] = 1;
    estado[u] = ESTADO.CERRADO;
    pi[u] = padre;
    d[u] = padre === -1 ? 0 : d[padre] + 1;
    orden[visitados++] = u;
    if (foto !== undefined) foto(7, `Se visita ${id(u)}${padre === -1 ? '' : `, que llegó desde ${id(padre)}`}, a profundidad ${d[u]}.`, u, -1);
    if (u === t) {
      encontrado = true;
      if (foto !== undefined) foto(8, `Se llegó al destino ${id(t)}: el recorrido se detiene.`, u, -1);
      break;
    }
    for (let e = adj.ultimo(u); e !== -1; e = adj.anterior(e)) {
      internas++;
      if (bloqueados !== undefined && bloqueados[e] === 1) continue;
      const v = adj.destino(e);
      if (visitado[v] === 0) {
        S.apilar({ nodo: v, padre: u });
        insertados++;
        if (S.tamano > maximo) maximo = S.tamano;
        estado[v] = ESTADO.FRONTERA;
        if (foto !== undefined) foto(11, `Se apila (${id(v)}, ${id(u)}). Los vecinos van al revés para que el primero quede en la cima.`, u, e);
      } else if (foto !== undefined) {
        foto(10, `${id(v)} ya está visitada: no se apila.`, u, e);
      }
    }
  }

  const ruta = t >= 0 && (encontrado || visitado[t] === 1) ? reconstruirRuta(pi, s, t) : new Int32Array(0);
  if (foto !== undefined) {
    foto(12, ruta.length > 0 ? `Ruta: ${textoRuta(ruta, id)}, con ${ruta.length - 1} saltos.` : 'No hay ruta entre las estaciones.', t, -1, estadosConRuta(estado, ruta));
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
 * DFS recursivo, la versión de referencia. Los tests prueban que da el mismo resultado que
 * el iterativo. Su pila es la del lenguaje, por eso una red muy larga podría agotarla.
 */
export function dfsRecursivo(red: RedTransporte, s: number, t = -1, opts: OpcionesRecorrido = {}): ResultadoRecorrido {
  const n = red.numEstaciones;
  const adj = red.adj;
  const bloqueados = opts.arcosBloqueados;
  const visitado = new Uint8Array(n);
  const d = new Int32Array(n).fill(-1);
  const pi = new Int32Array(n).fill(-1);
  const orden = new Int32Array(n);
  let visitados = 0;
  let externas = 0;
  let internas = 0;
  let profundidad = 0;
  let maximo = 0;

  const visitar = (u: number, padre: number): boolean => {
    externas++;
    profundidad++;
    if (profundidad > maximo) maximo = profundidad;
    visitado[u] = 1;
    pi[u] = padre;
    d[u] = padre === -1 ? 0 : d[padre] + 1;
    orden[visitados++] = u;
    if (u === t) return true;
    for (let e = adj.primero(u); e !== -1; e = adj.siguiente(e)) {
      internas++;
      if (bloqueados !== undefined && bloqueados[e] === 1) continue;
      const v = adj.destino(e);
      if (visitado[v] === 0 && visitar(v, u)) return true;
    }
    profundidad--;
    return false;
  };

  const encontrado = visitar(s, -1);
  const ruta = t >= 0 && encontrado ? reconstruirRuta(pi, s, t) : new Int32Array(0);
  return {
    alcanzado: ruta.length > 0,
    ruta,
    saltos: ruta.length > 0 ? ruta.length - 1 : -1,
    d,
    pi,
    orden,
    visitados,
    contadores: { externas, internas, insertados: visitados, maximoEstructura: maximo },
  };
}

/** DFS sobre matriz de adyacencia, para la pregunta 1: Θ(V²) por barrer filas enteras. */
export function dfsMatriz(m: MatrizAdyacencia, s: number): { visitados: number; celdas: number } {
  const n = m.n;
  const visitado = new Uint8Array(n);
  const S = new Pila<number>(n > 0 ? n : 1);
  S.apilar(s);
  let visitados = 0;
  let celdas = 0;
  while (!S.estaVacia()) {
    const u = S.desapilar();
    if (visitado[u] === 1) continue;
    visitado[u] = 1;
    visitados++;
    for (let v = n - 1; v >= 0; v--) {
      celdas++;
      if (m.existe(u, v) && visitado[v] === 0) S.apilar(v);
    }
  }
  return { visitados, celdas };
}
