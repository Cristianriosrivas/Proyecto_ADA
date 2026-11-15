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

## Red de calles reales de Buenaventura

La red simulada sirve para explicar. Para comprobar que el sistema funciona con datos de verdad, incluye también las calles reales de la zona urbana de Buenaventura, tomadas de OpenStreetMap (© colaboradores de OpenStreetMap, licencia ODbL). Dos scripts las descargan una sola vez y las convierten en una red del sistema:

- Cada cruce de calles es una estación, y cada tramo de calle entre dos cruces es una vía con su largo real. Se conservan además los puntos de forma necesarios para que el tramo siga la calle con un error menor de 10 m.
- Las calles de un solo sentido son vías dirigidas, y un tramo de doble sentido da dos vías, una por sentido. Por eso esta red es dirigida.
- Se conserva la componente fuertemente conexa más grande, para que exista ruta entre cualquier par de estaciones.
- El tiempo de cada vía sale de una velocidad supuesta según el tipo de calle, de 25 km/h en una calle residencial a 50 km/h en una troncal, o de la velocidad máxima cuando OpenStreetMap la trae.

El resultado tiene 4.429 estaciones y 5.765 tramos, que dan 11.048 vías dirigidas. Veintinueve estaciones llevan el nombre de un lugar conocido, como el Malecón Bahía de la Cruz, el Terminal de Transportes o la Universidad del Valle Sede Pacífico. Las demás se nombran por las calles que se cruzan, por ejemplo "Calle 6 con Carrera 5".

Las coordenadas usan la proyección de Mercator, escalada por $\cos \varphi_0$ en el centro de la zona. Así quedan en kilómetros reales y, a la vez, son una transformación lineal de las teselas del mapa, lo que permite dibujar la red sobre el mapa real. El largo de cada vía se mide sobre la misma proyección y se redondea hacia arriba, de modo que ninguna vía mide menos que la línea recta entre sus estaciones. Por eso la heurística euclidiana sigue siendo consistente (sección 6.3), y un test lo verifica en las 11.048 vías.

{{captura:mapa-real|Ruta del Malecón Bahía de la Cruz a la Universidad del Valle Sede Pacífico sobre las calles reales y el mapa de OpenStreetMap. Datos © colaboradores de OpenStreetMap.}}
