# Conclusiones de la Fase 1

BFS y DFS son lineales en el tamaño de la red, y los contadores lo confirman de forma exacta: el ciclo externo ejecuta $|V|$ iteraciones y el interno $\sum \deg(u)$, en {{contadores_ok}} de {{contadores_filas}} combinaciones medidas.

Escalar de 10 a 100 estaciones multiplica el trabajo por cerca de 10, porque las redes son dispersas y $E$ crece con $V$. La lista de adyacencia es la decisión que lo hace posible: con 5000 estaciones ocupa {{mem_razon_5000}} veces menos memoria que la matriz, y BFS corre {{bfs_razon_5000}} veces más rápido.

BFS garantiza el mínimo de saltos, y DFS no: en la red docente da 4 saltos donde BFS da 2. A cambio, DFS es la base de la exploración de rutas alternas y de la verificación de conectividad.
