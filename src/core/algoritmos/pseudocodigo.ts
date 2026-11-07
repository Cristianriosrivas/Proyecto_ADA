import type { NombreAlgoritmo } from '../instrumentacion/tipos';

export interface Pseudocodigo {
  titulo: string;
  lineas: string[];
}

/**
 * Pseudocódigo estilo CLRS. La línea i del arreglo es la línea i + 1 que reporta el tracer,
 * y el informe usa exactamente este mismo texto para el análisis línea por línea.
 */
export const PSEUDOCODIGO: Record<NombreAlgoritmo, Pseudocodigo> = {
  bfs: {
    titulo: 'BFS(G, s, t)',
    lineas: [
      'for cada vértice u ∈ G.V',
      '    u.color = BLANCO; u.d = ∞; u.π = NIL',
      's.color = GRIS; s.d = 0',
      'Q = ∅',
      'ENQUEUE(Q, s)',
      'while Q ≠ ∅',
      '    u = DEQUEUE(Q)',
      '    for cada v ∈ G.Adj[u]',
      '        if v.color == BLANCO',
      '            v.color = GRIS; v.d = u.d + 1; v.π = u',
      '            if v == t: return RUTA(s, t)',
      '            ENQUEUE(Q, v)',
      '    u.color = NEGRO',
      'return RUTA(s, t)',
    ],
  },
  dfs: {
    titulo: 'DFS-ITERATIVO(G, s, t)',
    lineas: [
      'for cada vértice u ∈ G.V: u.visitado = FALSO; u.π = NIL',
      'S = ∅',
      'PUSH(S, (s, NIL))',
      'while S ≠ ∅',
      '    (u, p) = POP(S)',
      '    if u.visitado: continue',
      '    u.visitado = VERDADERO; u.π = p',
      '    if u == t: return RUTA(s, t)',
      '    for cada v ∈ G.Adj[u], en orden inverso',
      '        if no v.visitado',
      '            PUSH(S, (v, u))',
      'return RUTA(s, t)',
    ],
  },
  dijkstra: {
    titulo: 'DIJKSTRA(G, w, s, t)',
    lineas: [
      'for cada vértice v ∈ G.V: v.d = ∞; v.π = NIL',
      's.d = 0',
      'S = ∅',
      'Q = ∅',
      'INSERT(Q, s, 0)',
      'while Q ≠ ∅',
      '    u = EXTRACT-MIN(Q)',
      '    S = S ∪ {u}',
      '    if u == t: break',
      '    for cada v ∈ G.Adj[u]',
      '        if u.d + w(u, v) < v.d',
      '            v.d = u.d + w(u, v); v.π = u',
      '            if v ∈ Q: DECREASE-KEY(Q, v, v.d)',
      '            else INSERT(Q, v, v.d)',
      'return RUTA(s, t)',
    ],
  },
  aestrella: {
    titulo: 'A-ESTRELLA(G, w, h, s, t)',
    lineas: [
      'for cada vértice v ∈ G.V: v.g = ∞; v.π = NIL',
      's.g = 0',
      'Q = ∅',
      'INSERT(Q, s, h(s))',
      'while Q ≠ ∅',
      '    u = EXTRACT-MIN(Q)',
      '    u.cerrado = VERDADERO',
      '    if u == t: break',
      '    for cada v ∈ G.Adj[u]',
      '        if u.g + w(u, v) < v.g',
      '            v.g = u.g + w(u, v); v.π = u; f = v.g + h(v)',
      '            if v ∈ Q: DECREASE-KEY(Q, v, f)',
      '            else INSERT(Q, v, f)',
      'return RUTA(s, t)',
    ],
  },
};
