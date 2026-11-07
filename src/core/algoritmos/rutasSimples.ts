import { ArregloDinamico } from '../estructuras/ArregloDinamico';
import type { RedTransporte } from '../grafo/RedTransporte';
import type { Metrica } from '../grafo/tipos';
import { mergeSort } from '../ordenamiento/ordenamiento';

export interface RutaSimple {
  estaciones: Int32Array;
  costo: number;
}

export interface OpcionesRutasSimples {
  metrica?: Metrica;
  /** Máximo de rutas a guardar. El número de rutas simples puede crecer exponencialmente. */
  limite?: number;
  /** Poda: abandona un camino en cuanto su costo pasa de este valor. */
  costoMaximo?: number;
  arcosBloqueados?: Uint8Array;
}

export interface ResultadoRutasSimples {
  rutas: RutaSimple[];
  /** Verdadero si se detuvo por el límite: pueden existir más rutas. */
  truncado: boolean;
  /** Llamadas de la búsqueda, para ver el efecto de la poda. */
  nodosExplorados: number;
  podas: number;
}

/**
 * Todas las rutas simples de s a t, con DFS y backtracking.
 *
 * A diferencia del DFS normal, el nodo se desmarca al regresar: así otro camino puede volver
 * a pasar por él. Por eso el costo ya no es O(V + E) sino proporcional al número de caminos,
 * que en el peor caso es exponencial. El resultado sale ordenado por costo con MergeSort.
 */
export function rutasSimples(red: RedTransporte, s: number, t: number, opts: OpcionesRutasSimples = {}): ResultadoRutasSimples {
  const adj = red.adj;
  const pesos = red.pesos(opts.metrica ?? 'km');
  const limite = opts.limite ?? 10000;
  const costoMaximo = opts.costoMaximo ?? Infinity;
  const bloqueados = opts.arcosBloqueados;
  const enCamino = new Uint8Array(red.numEstaciones);
  const camino = new Int32Array(red.numEstaciones);
  const halladas = new ArregloDinamico<RutaSimple>();
  let truncado = false;
  let nodosExplorados = 0;
  let podas = 0;

  const explorar = (u: number, profundidad: number, costo: number): void => {
    nodosExplorados++;
    camino[profundidad] = u;
    if (u === t) {
      if (halladas.tamano >= limite) {
        truncado = true;
        return;
      }
      const ruta = new Int32Array(profundidad + 1);
      for (let i = 0; i <= profundidad; i++) ruta[i] = camino[i];
      halladas.agregar({ estaciones: ruta, costo });
      return;
    }
    enCamino[u] = 1;
    for (let e = adj.primero(u); e !== -1 && !truncado; e = adj.siguiente(e)) {
      if (bloqueados !== undefined && bloqueados[e] === 1) continue;
      const v = adj.destino(e);
      if (enCamino[v] === 1) continue;
      const nuevo = costo + pesos[e];
      if (nuevo > costoMaximo) {
        podas++;
        continue;
      }
      explorar(v, profundidad + 1, nuevo);
    }
    enCamino[u] = 0;
  };

  explorar(s, 0, 0);
  const rutas = halladas.aArreglo();
  mergeSort(rutas, (a, b) => a.costo - b.costo || a.estaciones.length - b.estaciones.length);
  return { rutas, truncado, nodosExplorados, podas };
}
