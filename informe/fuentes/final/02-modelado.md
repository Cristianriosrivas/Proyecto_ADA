<!--f1-->
# Modelado de la red

## El grafo $G = (V, E)$

Cada estación es un vértice de $V$ y cada vía es una arista de $E$. Una vía guarda dos pesos no negativos: la distancia en kilómetros y el tiempo en minutos. La métrica activa se elige en la interfaz. Cada estación guarda además sus coordenadas $(x, y)$ en kilómetros, que usa la heurística de A*.

El grafo puede ser dirigido o no dirigido. En una red no dirigida, cada vía se guarda como dos arcos $u \to v$ y $v \to u$ en la lista de adyacencia. Por eso el número de arcos es $m = 2|E|$ en una red no dirigida y $m = |E|$ en una dirigida. Esta distinción aparece en todo el análisis, y por el lema del apretón de manos coincide con la suma de los grados:

$$m = \sum_{u \in V} \deg(u)$$

## Red docente

La prueba de escritorio usa la red estándar del documento del proyecto: 8 estaciones y 11 vías no dirigidas. Se insertan en este orden exacto: A-B (4), A-C (2), B-C (1), B-D (5), C-D (8), C-E (10), D-E (2), D-F (6), E-F (3), F-G (1), G-H (2).

El documento no trae coordenadas, y A* las necesita. Las elegimos de modo que cada vía mida al menos la línea recta entre sus estaciones, lo que hace consistente a la heurística euclidiana (sección 6.3).

{{fig:red-docente|Red docente con sus pesos. Las posiciones son las coordenadas usadas por A*, en km.}}

{{tabla:coordenadas|Coordenadas de la red docente y valor de la heurística hacia H comparado con el costo real $h^*$.}}

Como el documento da un solo peso, en kilómetros y minutos a la vez, en la red docente tomamos `tiempoMin` igual a `distanciaKm`.

## Redes de prueba

Además de la red docente el sistema incluye:

- **Red Fase 1:** 12 estaciones, que cumple el mínimo de 10 de la especificación.
- **Red Buenaventura:** 34 estaciones entre la isla Cascajal y el eje de la Avenida Simón Bolívar. Los pesos son la distancia euclidiana por un factor vial en $[1.15, 1.6]$. Las coordenadas son aproximadas y la red es simulada, con fines académicos.
- **Redes generadas con semilla:** geométrica con árbol generador y $k$ vecinos más cercanos, cuadrícula tipo Manhattan y líneas de metro con estaciones de trasbordo, para $N = 10, 50, 100, 250, 500, 1000, 2500$ y $5000$.

Las redes generadas usan el generador pseudoaleatorio mulberry32 con semilla fija: la misma semilla produce siempre la misma red, y por eso los experimentos son reproducibles. El factor vial mayor que 1 garantiza que ninguna vía sea más corta que la línea recta.

{{fig:red-buenaventura|Red Buenaventura, simulada con fines académicos: la isla Cascajal al occidente y el eje de la Avenida Simón Bolívar hacia el oriente.}}

<div class="dos">

{{fig:red-geometrica-50|Red geométrica con $N = 50$.}}

{{fig:red-geometrica-100|Red geométrica con $N = 100$.}}

{{fig:red-cuadricula-100|Red en cuadrícula con $N = 100$.}}

{{fig:red-metro-100|Red de metro con $N = 100$ y estaciones de trasbordo.}}

</div>

## Desempates deterministas

Para que la prueba de escritorio dé lo mismo en cada ejecución, fijamos dos reglas. Los vecinos se recorren en el orden en que se insertaron las vías, y por eso la lista inserta por la cola. En el heap, a igual clave sale primero el índice de nodo menor.
<!--/f1-->
