# Resultados experimentales

## Metodología

Todas las mediciones usan el mismo `core` que corre en la aplicación, ejecutado en Node con `process.hrtime.bigint()`. El comando `npm run bench` las reproduce y escribe los resultados en `bench/resultados/`.

{{tabla:maquina|Equipo de medición.}}

- **Redes.** Las generamos con semilla fija, {{semilla}}, para $N = 10, 50, 100, 250, 500, 1000, 2500$ y $5000$, en tres tipos: geométrica, cuadrícula y metro.
- **Calentamiento.** Antes de medir, cada función corre durante al menos 60 ms, para que el compilador JIT la optimice.
- **Lotes.** En redes pequeñas una ejecución dura menos que la precisión útil del reloj. Por eso repetimos $K$ veces dentro de cada medición, hasta durar al menos 5 ms, y dividimos entre $K$.
- **Estadístico.** Reportamos la mediana de 21 repeticiones y el rango intercuartílico. La mediana resiste los picos que causan el recolector de basura y el sistema operativo.
- **Ajuste.** Para cada algoritmo ajustamos $T \approx c \cdot f(N)$ por mínimos cuadrados, con $f$ la curva teórica. Ponderamos cada punto por $1/f^2$ para que los puntos grandes no decidan solos, y calculamos $R^2$ sobre los logaritmos.

El ruido es real: el equipo es un portátil de gama de entrada y los tiempos de microsegundos varían entre corridas. Por eso damos más peso a los contadores exactos que a los tiempos.

{{tabla:iqr|Mediana ± la mitad del rango intercuartílico, en la red geométrica.}}

## Tiempo contra tamaño de la red

{{tabla:tiempos|Tiempo de cada algoritmo sobre toda la red, red geométrica. Mediana de 21 repeticiones.}}

{{fig:tiempo-bfs-dfs-pequeno|BFS y DFS para $N = 10, 50, 100$ y $250$, el rango que pide el proyecto.}}

{{fig:tiempo-bfs-dfs|BFS y DFS hasta $N = 5000$, con la curva teórica ajustada $c \cdot (V + E)$.}}

{{fig:tiempo-dijkstra|Dijkstra con Min-Heap y curva $c \cdot (V + E) \lg V$.}}

{{fig:tiempo-dijkstra-arreglo|Dijkstra con arreglo y curva $c \cdot V^2$.}}

{{fig:tiempo-loglog|Todos los algoritmos en escala log-log. La pendiente de una recta es el exponente de crecimiento: Dijkstra con arreglo se separa con pendiente cercana a 2.}}

{{tabla:ajustes|Constante ajustada y $R^2$ por algoritmo y tipo de red.}}

Las curvas lineal y cuadrática dan $R^2$ entre {{r2_min_lineal}} y {{r2_max_lineal}} en los tres tipos de red. Con $N = 5000$, Dijkstra con arreglo tarda {{arreglo_5000}} y con heap {{heap_5000}}: el heap es {{razon_heap_arreglo_5000}} veces más rápido en esta red dispersa.

Los ajustes de Dijkstra con heap son los más flojos, con $R^2$ entre {{r2_min_heap}} y {{r2_max_heap}}, y la razón es instructiva. La cota $O((V + E) \lg V)$ supone un heap de tamaño $V$, pero en la práctica el heap solo guarda la frontera. Con $N = 5000$, su mayor tamaño fue {{heap_max_geo_5000}} en la red geométrica, {{heap_max_cuad_5000}} en la cuadrícula y {{heap_max_metro_5000}} en la de metro. En una red de líneas casi no hay frontera, cada operación cuesta mucho menos que $\lg V$, y el tiempo crece casi linealmente. La cota sigue siendo cierta, pero en esas redes no es ajustada.

## Contadores de operaciones contra la teoría

Los tiempos tienen ruido, pero los contadores no. Comparamos las iteraciones exactas con las fórmulas de la sección 4, en redes dirigidas y no dirigidas.

{{tabla:contadores|Iteraciones exactas de BFS y DFS, contra $|V|$ y $\sum \deg(u)$.}}

En las {{contadores_filas}} combinaciones de tipo de red, dirección y tamaño, coincidieron {{contadores_ok}}: el ciclo externo dio $|V|$ y el interno dio $2|E|$ en las redes no dirigidas y $|E|$ en las dirigidas. Este resultado es exacto, no aproximado.

{{tabla:pila|Tamaño de las estructuras. La pila de DFS guarda copias de nodos: llega más alto que la cola de BFS, y muchas entradas se descartan al salir.}}

## Matriz contra lista

{{tabla:matriz_lista|Memoria y tiempo con matriz y con lista, red geométrica. La memoria medida es la mediana de 5 mediciones con recolección forzada.}}

{{fig:matriz-memoria|Memoria de cada representación. La matriz crece con pendiente 2 en log-log y la lista con pendiente 1.}}

{{fig:matriz-tiempo|Tiempo de BFS y DFS con cada representación.}}

{{tabla:celdas|Trabajo exacto: arcos que recorre la lista frente a celdas que barre la matriz.}}

La memoria medida con `process.memoryUsage()` sigue a la teórica en las redes grandes, donde las dos casi coinciden. En las pequeñas aparecen dos ruidos que conviene explicar. El recolector de basura decide cuándo liberar, y por eso una medición aislada puede dar casi cualquier valor; usamos la mediana de 5 y forzamos la recolección. Además cada objeto tiene un costo fijo de encabezados que la cuenta teórica no incluye, y con pocos bytes ese costo pesa mucho.

## Dijkstra: arreglo contra heap

{{tabla:cruce_detalle|Barrido de densidad con $N = 1000$.}}

<div class="dos">

{{fig:cruce-1000|Heap y arreglo con $N = 1000$.}}

{{fig:cruce-2000|Heap y arreglo con $N = 2000$.}}

</div>

{{tabla:cruce|Punto de cruce medido contra la estimación $E \approx V^2 / \lg V$. Se toma el menor número de vías desde el cual el arreglo gana en todas las mediciones siguientes.}}

Limitamos estas redes a $N \le 2000$. Una red completa de 5000 estaciones tendría 12,5 millones de vías, y no aporta nada al cruce. Las redes dispersas sí llegan a $N = 5000$.

## A* contra Dijkstra

Para cada red tomamos entre 30 y 60 pares de origen y destino al azar y ejecutamos los dos algoritmos con parada temprana.

{{tabla:aestrella|A* contra Dijkstra, promedio por consulta, en km.}}

{{fig:aestrella-expandidos|Nodos expandidos por consulta. A* expande menos, pero la ganancia depende de la forma de la red.}}

En las {{ae_consultas_total}} consultas medidas, en km y en minutos, A* dio el mismo costo que Dijkstra en {{ae_iguales_total}}. La ganancia en nodos depende de la geometría: con $N = 5000$ fue de {{ae_reduccion_5000}} % en la red geométrica y {{ae_cuadricula_5000}} % en la cuadrícula, pero solo {{ae_metro_5000}} % en la red de metro. En una red de líneas, la ruta debe seguir la línea aunque se aleje del destino, y la línea recta orienta poco.

En tiempo la ganancia es menor que en nodos, porque A* paga una raíz cuadrada por nodo. Con $N = 5000$ en la red geométrica, una consulta tarda {{ae_us_d_5000}} con Dijkstra y {{ae_us_a_5000}} con A*. En la red de metro A* resulta incluso más lento en varios tamaños. Menos nodos no siempre significa menos tiempo.

En minutos la reducción en la red geométrica de 5000 estaciones fue de {{ae_min_5000}} %. Es menor que en km, porque $h$ se divide entre la velocidad máxima de la red y queda más lejos del costo real.

<div class="dos">

{{fig:aestrella-ponderado-expandidos|A* ponderado: nodos expandidos.}}

{{fig:aestrella-ponderado-costo|A* ponderado: sobrecosto medio.}}

</div>

{{tabla:ponderado|A* ponderado, $f = g + w \cdot h$, con $N = 2500$ y 40 consultas.}}

Con $w > 1$, A* expande menos a cambio de perder la garantía de optimalidad. El sobrecosto nunca superó el límite teórico de $w$ veces el óptimo.

## Ordenamientos

{{tabla:ordenamientos|Ordenamientos con $n = 100\,000$, y QuickSort con pivote fijo en $n = 5000$.}}

{{fig:ordenamientos|Tiempo de los tres ordenamientos con datos al azar.}}

{{fig:quicksort-peor|Comparaciones de QuickSort con datos ya ordenados: la mediana de 3 mantiene $n \lg n$ y el último elemento como pivote cae en $n^2$.}}

Con datos al azar y $n = 100\,000$, el más rápido fue {{orden_rapido}} ({{orden_rapido_t}}) y el que menos comparó fue {{orden_menos_comp}}. Comparar no lo es todo: MergeSort copia el arreglo en cada mezcla, y en este equipo esas escrituras pesan más que las comparaciones que ahorra. Con el último elemento como pivote y datos ordenados aparece el peor caso de la sección 5: la curva tiene pendiente 2 en log-log. HeapSort garantiza $n \lg n$, a cambio de más comparaciones.

## Mantener una tabla de congestión

{{tabla:p6|Experimento de la pregunta 6, con $m = {{p6_m}}$ actualizaciones.}}

{{fig:p6|Tiempo total para mantener la vía más congestionada tras cada actualización.}}

## Costo del tracer

{{tabla:tracer|Dijkstra sin tracer y con tracer que guarda una foto de cada paso.}}

El tracer guarda una copia de $\Theta(V)$ datos en cada paso, y por eso su costo es grande y crece con $N$. Solo se usa en el visualizador. Sin tracer el algoritmo no crea fotos ni textos: lo único que queda es la comprobación de una condición. Todas las demás tablas de esta sección se midieron sin tracer.
