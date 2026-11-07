# Prueba de escritorio

Ejecutamos los 4 casos del documento sobre la red docente, con el mismo código del sistema. Las tablas se generaron a partir de las trazas reales. Cada fila es una iteración del ciclo principal, y muestra el estado al terminarla.

{{tabla:escritorio|Comparación con la tabla del docente.}}

La tabla del docente admite "2 o 3 saltos" para BFS. Nuestro resultado es 2 saltos, por el motivo explicado en la pregunta 3.

## BFS (A, E)

{{tabla:traza_bfs|Traza de BFS de A hacia E.}}

BFS se detiene al descubrir E, mientras procesa C. La ruta se lee por los antecesores: $E \leftarrow C \leftarrow A$.

## DFS (A, E)

{{tabla:traza_dfs|Traza de DFS de A hacia E. La pila guarda pares (nodo, padre).}}

Los vecinos entran en orden inverso. Por eso la cima tras visitar A es (B, A): el primer vecino de A.

## Rutas simples de A a E

El explorador halla exactamente {{rutas_ae}} rutas simples. La más barata cuesta 10 km.

{{tabla:rutas_ae|Rutas simples de A a E, ordenadas por costo con MergeSort.}}

## Dijkstra (A, F)

{{tabla:traza_dijkstra|Traza de Dijkstra de A hacia F. La estructura es el heap, con la clave de cada estación.}}

Con parada temprana se cierran 6 nodos: G y H nunca se extraen.

## A* (A, H)

{{tabla:traza_aestrella|Traza de A* de A hacia H. Las claves del heap son $f = g + h$, y d[ ] es g.}}

En esta red la ruta óptima de A a H pasa por los 8 nodos, así que A* no puede expandir menos que Dijkstra.

{{fig:red-docente-ruta|Ruta óptima de A a H, 16 km.}}

Las diferencias entre A* y Dijkstra aparecen desde $N \ge 50$, como muestra la sección 7.6.
