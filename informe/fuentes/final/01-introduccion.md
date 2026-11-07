<section class="resumen">

# Resumen

Este informe presenta el diseño, la implementación y la evaluación de un sistema que simula una red de transporte público urbano. Modelamos la red como un grafo $G = (V, E)$ dirigido o no dirigido e implementamos, sin librerías de grafos, las estructuras que los algoritmos necesitan: cola con buffer circular, pila, lista de adyacencia con inserción por la cola, montículo binario indexado, tabla hash con encadenamiento y árbol k-d.

Sobre esas estructuras corren BFS, DFS, Dijkstra y A*. Analizamos cada algoritmo línea por línea, con tablas de costo y sumatorias, y usamos el Método Maestro en las recurrencias del proyecto. Después contrastamos la teoría con mediciones reales sobre redes de 10 a 5000 estaciones.

Los resultados principales son estos. Los contadores de operaciones coinciden exactamente con las fórmulas: el ciclo externo de BFS ejecuta $|V|$ iteraciones y el interno $2|E|$ en todas las redes no dirigidas conexas medidas. En una red dispersa de 5000 estaciones, la lista de adyacencia ocupa {{mem_razon_5000}} veces menos memoria que la matriz, y BFS corre {{bfs_razon_5000}} veces más rápido. A* devuelve el mismo costo que Dijkstra en todas las consultas medidas y, con 5000 estaciones en una red geométrica, expande {{ae_reduccion_5000}} % menos nodos. Mantener una tabla de congestión con una cola de prioridad indexada resulta {{p6_razon_5000}} veces más rápido que reordenarla tras cada actualización.

Todas las cifras de este documento salen de los archivos que genera `npm run bench`, ejecutado en un equipo con {{cpu}} y {{ram}} GB de RAM. El código fuente no se incluye aquí: va en la carpeta del proyecto, y en este informe solo aparece pseudocódigo.

</section>

# Introducción y justificación

La movilidad urbana es uno de los mayores desafíos logísticos de las ciudades. La congestión, los trayectos mal trazados y la falta de información en tiempo real afectan la calidad de vida de los usuarios y sobrecargan la infraestructura.

En Buenaventura el problema tiene una forma particular. La zona de la isla Cascajal se comunica con la zona continental por un punto muy concentrado, y el eje de la Avenida Simón Bolívar reúne buena parte del tránsito hacia el oriente. Eso hace que la pregunta "¿qué pasa si falla esta vía?" sea concreta y no académica. Nuestra red simulada de Buenaventura lo muestra: el análisis de puntos críticos señala justo el paso entre la isla y el continente como la conexión cuya caída parte la red en dos. Es una red simulada con fines académicos, con coordenadas aproximadas.

Los grafos son el modelo natural para este tipo de red, y cada pregunta del usuario pide un algoritmo distinto:

- ¿Cómo llego con la menor cantidad de trasbordos? Esa pregunta ignora los pesos, y la responde BFS.
- ¿Qué caminos alternativos existen y están conectados dos puntos? Esa la responde DFS.
- ¿Cuál es la ruta más barata en kilómetros o minutos? Esa la responde Dijkstra.
- ¿Se puede responder lo mismo explorando menos? Esa la responde A*, si se dispone de una buena heurística.

El objetivo del proyecto es aplicar estructuras de datos avanzadas, algoritmos de exploración y optimización de grafos, y análisis formal de complejidad, y demostrar con evidencia medida que la teoría describe lo que ocurre en la máquina.

## Alcance y organización

El sistema incluye un prototipo funcional con planificador de rutas, visualizador paso a paso, modo de prueba de escritorio, explorador de rutas alternas, comparador Dijkstra contra A*, centro de tráfico con módulo de ordenamiento y estadísticas, y laboratorio de complejidad.

La sección 2 presenta el modelo y la sección 3 las estructuras de datos. La sección 4 hace el análisis línea por línea y la sección 5 aplica el Método Maestro. La sección 6 demuestra la correctitud. La sección 7 reporta los resultados experimentales, la sección 8 responde el cuestionario, la sección 9 desarrolla la prueba de escritorio y la sección 10 concluye.
