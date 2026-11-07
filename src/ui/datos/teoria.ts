import type { NombreAlgoritmo } from '@core/instrumentacion/tipos';

export interface FichaTeoria {
  titulo: string;
  grupo: 'Algoritmos de grafos' | 'Estructuras de datos' | 'Ordenamiento y búsqueda';
  tiempo: string;
  espacio: string;
  recurrencia?: string;
  maestro?: string;
  correctitud: string;
  /** Si existe, la ficha enlaza a su visualización. */
  algoritmo?: NombreAlgoritmo;
}

export const FICHAS: FichaTeoria[] = [
  {
    titulo: 'BFS',
    grupo: 'Algoritmos de grafos',
    tiempo: 'Θ(V + E) con lista de adyacencia',
    espacio: 'Θ(V)',
    correctitud: 'Explora por niveles. Por inducción sobre k, todo nodo a distancia k entra a la cola antes que cualquiera a distancia k + 1, así que d[v] = δ(s, v).',
    algoritmo: 'bfs',
  },
  {
    titulo: 'DFS',
    grupo: 'Algoritmos de grafos',
    tiempo: 'Θ(V + E)',
    espacio: 'Θ(V) recursivo; O(E) iterativo con marca al sacar',
    correctitud: 'Cada lista se recorre una vez, al visitar su nodo. No garantiza el camino más corto: sigue el primer vecino hasta agotarlo. En la prueba de escritorio da 4 saltos donde BFS da 2.',
    algoritmo: 'dfs',
  },
  {
    titulo: 'Dijkstra',
    grupo: 'Algoritmos de grafos',
    tiempo: 'O((V + E) lg V) con heap; Θ(V²) con arreglo',
    espacio: 'Θ(V)',
    correctitud: 'Invariante: al extraer u, d[u] = δ(s, u). Si existiera un camino mejor, pasaría por un nodo del heap con clave menor que d[u], lo que contradice que u era el mínimo. Exige pesos no negativos.',
    algoritmo: 'dijkstra',
  },
  {
    titulo: 'A*',
    grupo: 'Algoritmos de grafos',
    tiempo: 'O((V + E) lg V), igual que Dijkstra en el peor caso',
    espacio: 'Θ(V)',
    correctitud: 'Con h admisible, h(n) ≤ h*(n), el primer cierre de la meta es óptimo. Con h consistente, h(u) ≤ w(u, v) + h(v), f nunca baja a lo largo de un camino y ningún nodo cerrado se reabre.',
    algoritmo: 'aestrella',
  },
  {
    titulo: 'Tarjan: puntos de articulación y puentes',
    grupo: 'Algoritmos de grafos',
    tiempo: 'Θ(V + E)',
    espacio: 'Θ(V)',
    correctitud: 'low[u] es el menor tiempo alcanzable desde el subárbol de u. Si un hijo v cumple low[v] ≥ disc[u], ningún nodo debajo de v llega más arriba de u: quitar u separa ese subárbol.',
  },
  {
    titulo: 'Rutas simples con backtracking',
    grupo: 'Algoritmos de grafos',
    tiempo: 'Proporcional al número de caminos: exponencial en el peor caso',
    espacio: 'Θ(V) más las rutas guardadas',
    correctitud: 'Es DFS con una diferencia: el nodo se desmarca al regresar, para que otro camino pueda usarlo. Por eso enumera todas las rutas y por eso deja de ser O(V + E).',
  },
  {
    titulo: 'Cola circular',
    grupo: 'Estructuras de datos',
    tiempo: 'Encolar y desencolar O(1) amortizado',
    espacio: 'Θ(n)',
    correctitud: 'inicio y tamaño ubican todo con aritmética módulo capacidad. Duplicar la capacidad cuesta Θ(n), pero ocurre tras n operaciones: el costo amortizado sigue siendo O(1).',
  },
  {
    titulo: 'Lista de adyacencia',
    grupo: 'Estructuras de datos',
    tiempo: 'Insertar O(1); vecinos de u Θ(grado(u))',
    espacio: 'Θ(V + E), frente a Θ(V²) de la matriz',
    correctitud: 'Se inserta por la cola para conservar el orden de las vías. Por el lema del apretón de manos, Σ grado(u) = 2|E|: recorrer todas las listas cuesta Θ(E).',
  },
  {
    titulo: 'Min-Heap indexado',
    grupo: 'Estructuras de datos',
    tiempo: 'insert, extractMin y decreaseKey O(lg n); mínimo O(1)',
    espacio: 'Θ(n)',
    recurrencia: 'MIN-HEAPIFY: T(n) ≤ T(2n/3) + Θ(1)',
    maestro: 'a = 1, b = 3/2, n^(log_b a) = n⁰ = 1. Como f(n) = Θ(1), es el caso 2: T(n) = Θ(lg n).',
    correctitud: 'La tabla de posiciones ubica un id en O(1), y por eso decreaseKey no necesita buscar. Sin ella costaría O(n).',
  },
  {
    titulo: 'BUILD-HEAP',
    grupo: 'Estructuras de datos',
    tiempo: 'O(n), no O(n lg n)',
    espacio: 'Θ(1) adicional',
    recurrencia: 'Σ_{h=0}^{⌊lg n⌋} ⌈n/2^(h+1)⌉ · O(h)',
    maestro: 'No se usa el Maestro: la suma se acota con Σ h/2^h = 2, que da O(n).',
    correctitud: 'Casi todos los nodos están cerca de las hojas, donde MIN-HEAPIFY casi no trabaja.',
  },
  {
    titulo: 'Tabla hash',
    grupo: 'Estructuras de datos',
    tiempo: 'Búsqueda Θ(1 + α) promedio; peor caso Θ(n)',
    espacio: 'Θ(n + m)',
    correctitud: 'Con hashing uniforme, la cubeta esperada tiene α = n/m elementos. Redimensionar al pasar de 0.75 mantiene α acotado, y el costo amortizado por inserción sigue siendo O(1).',
  },
  {
    titulo: 'Árbol k-d',
    grupo: 'Estructuras de datos',
    tiempo: 'Construir Θ(n lg n); consulta O(lg n) esperado',
    espacio: 'Θ(n)',
    recurrencia: 'T(n) = 2T(n/2) + Θ(n)',
    maestro: 'a = 2, b = 2, n^(log_b a) = n. Como f(n) = Θ(n), es el caso 2: T(n) = Θ(n lg n).',
    correctitud: 'Parte por la mediana del eje alterno. La búsqueda descarta un lado cuando la franja está más lejos que el mejor punto hallado.',
  },
  {
    titulo: 'MergeSort',
    grupo: 'Ordenamiento y búsqueda',
    tiempo: 'Θ(n lg n) siempre',
    espacio: 'Θ(n)',
    recurrencia: 'T(n) = 2T(n/2) + Θ(n)',
    maestro: 'a = 2, b = 2, n^(log_b a) = n. Caso 2: T(n) = Θ(n lg n).',
    correctitud: 'Mezclar dos mitades ordenadas da un arreglo ordenado. Es estable, por eso ordena las rutas.',
  },
  {
    titulo: 'QuickSort',
    grupo: 'Ordenamiento y búsqueda',
    tiempo: 'Θ(n lg n) balanceado; Θ(n²) peor caso',
    espacio: 'O(lg n) de pila',
    recurrencia: 'Balanceado: T(n) = 2T(n/2) + Θ(n). Peor caso: T(n) = T(n − 1) + Θ(n)',
    maestro: 'Balanceado: caso 2, Θ(n lg n). Peor caso: el Maestro no aplica porque el subproblema no es n/b. Por sumatoria, Σ k = Θ(n²).',
    correctitud: 'La mediana de 3 evita el peor caso con entradas ya ordenadas.',
  },
  {
    titulo: 'HeapSort',
    grupo: 'Ordenamiento y búsqueda',
    tiempo: 'Θ(n lg n) garantizado',
    espacio: 'Θ(1) adicional',
    correctitud: 'BUILD-MAX-HEAP en O(n) y n − 1 extracciones en O(lg n). No es estable.',
  },
  {
    titulo: 'Búsqueda binaria',
    grupo: 'Ordenamiento y búsqueda',
    tiempo: 'Θ(lg n)',
    espacio: 'Θ(1)',
    recurrencia: 'T(n) = T(n/2) + Θ(1)',
    maestro: 'a = 1, b = 2, n^(log_b a) = 1. Caso 2: T(n) = Θ(lg n).',
    correctitud: 'Cada comparación descarta la mitad del rango, que siempre contiene la respuesta si existe.',
  },
];
