import type { RedTransporte } from '@core/grafo/RedTransporte';
import type { NombreAlgoritmo, PasoTraza } from '@core/instrumentacion/tipos';
import { num, rutaTexto, trazar } from './ejecutar';

/** Los 4 casos de la tabla del docente. */
export interface CasoEscritorio {
  algoritmo: NombreAlgoritmo;
  nombre: string;
  desde: string;
  hasta: string;
  rutaEsperada: string;
  metricaEsperada: string;
  estructura: string;
  complejidad: string;
}

export const CASOS: CasoEscritorio[] = [
  { algoritmo: 'bfs', nombre: 'BFS', desde: 'A', hasta: 'E', rutaEsperada: 'A → C → E', metricaEsperada: '2 saltos', estructura: 'Cola FIFO', complejidad: 'O(|V|+|E|)' },
  { algoritmo: 'dfs', nombre: 'DFS', desde: 'A', hasta: 'E', rutaEsperada: 'A → B → C → D → E', metricaEsperada: '4 saltos', estructura: 'Pila LIFO', complejidad: 'O(|V|+|E|)' },
  { algoritmo: 'dijkstra', nombre: 'Dijkstra', desde: 'A', hasta: 'F', rutaEsperada: 'A → C → B → D → E → F', metricaEsperada: '13 km', estructura: 'Min-Heap', complejidad: 'O((V+E) log V)' },
  { algoritmo: 'aestrella', nombre: 'A*', desde: 'A', hasta: 'H', rutaEsperada: 'A → C → B → D → E → F → G → H', metricaEsperada: '16 km', estructura: 'Min-Heap + heurística', complejidad: 'O((V+E) log V)' },
];

export interface FilaTraza {
  iteracion: number;
  evento: string;
  estructura: string;
  d: string;
  pi: string;
  visitados: string;
}

const LINEA_CLAVE: Record<NombreAlgoritmo, number[]> = { bfs: [7], dfs: [7], dijkstra: [7], aestrella: [6] };

/** Convierte los pasos en filas de traza "como en papel": una por iteración del ciclo principal. */
export function filasTraza(red: RedTransporte, algoritmo: NombreAlgoritmo, pasos: PasoTraza[]): FilaTraza[] {
  const id = (i: number) => red.estacion(i).id;
  const filas: FilaTraza[] = [];
  const lista = (p: PasoTraza): string => {
    if (p.cola) return `Q = [${p.cola.map(id).join(', ')}]`;
    if (p.pilaNodos) return `S = [${p.pilaNodos.map((x, k) => `(${id(x)},${p.pilaPadres?.[k] === -1 ? 'NIL' : id(p.pilaPadres?.[k] ?? -1)})`).join(' ')}]`;
    if (p.heapIds) return `Q = [${Array.from(p.heapIds, (x, k) => `${id(x)}:${num((p.heapClaves as Float64Array)[k], 2)}`).join(', ')}]`;
    return '';
  };
  const fila = (p: PasoTraza, evento: string): FilaTraza => {
    let d = '';
    let pi = '';
    let visitados = '';
    for (let i = 0; i < red.numEstaciones; i++) {
      const g = p.d[i];
      d += `${id(i)}=${num(g, 2)} `;
      pi += `${id(i)}=${p.pi[i] === -1 ? '–' : id(p.pi[i])} `;
      if (p.estados[i] === 2 || p.estados[i] === 3) visitados += id(i);
    }
    return { iteracion: p.iteracion, evento, estructura: lista(p), d: d.trim(), pi: pi.trim(), visitados };
  };
  // La fila de cada iteración es la foto justo antes de la siguiente extracción
  for (let k = 0; k < pasos.length; k++) {
    const p = pasos[k];
    if (LINEA_CLAVE[algoritmo].includes(p.linea) && p.heapIntercambio === undefined) {
      let u = k;
      while (u + 1 < pasos.length && !LINEA_CLAVE[algoritmo].includes(pasos[u + 1].linea)) u++;
      const ultimo = pasos[u];
      const f = fila(ultimo, p.narracion);
      filas.push(f);
    }
  }
  return filas;
}

export interface ResultadoCaso {
  caso: CasoEscritorio;
  ruta: string;
  metrica: string;
  coincide: boolean;
  filas: FilaTraza[];
  pasos: PasoTraza[];
  /** Fila con h y f, solo en A*. */
  heuristicas?: string;
}

/** Ejecuta un caso y lo compara con la tabla del docente. */
export function ejecutarCaso(red: RedTransporte, caso: CasoEscritorio): ResultadoCaso {
  const s = red.indiceDe(caso.desde);
  const t = red.indiceDe(caso.hasta);
  const { pasos } = trazar(red, caso.algoritmo, s, t, 'km');
  const fin = pasos[pasos.length - 1];
  const c: number[] = [];
  for (let v = t; v !== -1; v = fin.pi[v]) c.unshift(v);
  const ruta = rutaTexto(red, c);
  const metrica = caso.algoritmo === 'bfs' || caso.algoritmo === 'dfs' ? `${c.length - 1} saltos` : `${num(fin.d[t])} km`;
  const heuristicas = fin.h ? Array.from(fin.h, (h, i) => `${red.estacion(i).id}: ${num(h, 2)}`).join(' · ') : undefined;
  return { caso, ruta, metrica, coincide: ruta === caso.rutaEsperada && metrica === caso.metricaEsperada, filas: filasTraza(red, caso.algoritmo, pasos), pasos, heuristicas };
}

export function casoACsv(r: ResultadoCaso): string {
  const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
  const cab = ['iteracion', 'evento', 'estructura', 'd', 'pi', 'visitados'].join(',');
  return [cab, ...r.filas.map((f) => [f.iteracion, q(f.evento), q(f.estructura), q(f.d), q(f.pi), q(f.visitados)].join(','))].join('\n');
}
