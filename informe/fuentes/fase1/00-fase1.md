<section class="resumen">

# Resumen

Este documento es el entregable de la Fase 1 del proyecto. Presenta el modelo de la red de transporte como un grafo $G = (V, E)$ y la implementación de BFS y DFS con estructuras propias: cola con buffer circular, pila y lista de adyacencia. Incluye el análisis matemático del costo, la justificación del impacto de escalar la red de 10 a 50 y 100 o más estaciones, y las respuestas a las preguntas 1 a 3 del cuestionario.

La implementación se entrega en la carpeta del proyecto, en `src/core/algoritmos/bfs.ts` y `src/core/algoritmos/dfs.ts`. Aquí solo aparece pseudocódigo. Las cifras salen de `npm run bench`, ejecutado en un equipo con {{cpu}}.

</section>

# Objetivo

Comprender y aplicar algoritmos de búsqueda sobre una red de transporte representada como grafo. BFS calcula el trayecto con el menor número de trasbordos o estaciones, sin considerar el peso de las vías. DFS explora exhaustivamente caminos alternativos y verifica la conectividad entre dos puntos.

La red de la Fase 1 tiene 12 estaciones, más que el mínimo de 10 de la especificación. La red docente de 8 estaciones sirve para la prueba de escritorio.

{{tabla:escritorio_f1|Resultados de BFS y DFS en la red docente.}}

Además, DFS con backtracking halla las {{rutas_ae}} rutas simples entre A y E, y verifica la conectividad.
