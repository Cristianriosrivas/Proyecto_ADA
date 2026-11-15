# Conclusiones

A partir de los resultados con distintas alternativas y conjuntos de datos concluimos lo siguiente.

1. **La teoría describe lo que pasa en la máquina, y los contadores lo prueban mejor que los tiempos.** El ciclo externo de BFS ejecutó $|V|$ iteraciones y el interno $2|E|$ o $|E|$ en {{contadores_ok}} de {{contadores_filas}} combinaciones de red. Los tiempos siguen las curvas teóricas, con $R^2$ de {{r2_bfs}} en BFS y {{r2_arreglo}} en Dijkstra con arreglo, pero tienen ruido.

2. **La representación importa más que cualquier optimización de código.** En una red dispersa de 5000 estaciones, cambiar la matriz por la lista redujo la memoria {{mem_razon_5000}} veces y aceleró BFS {{bfs_razon_5000}} veces. Con $N = 10$ esa diferencia no existe: la ventaja es asintótica.

3. **Escalar cambia qué decisión es correcta.** Con 10 estaciones cualquier opción sirve. Con 5000, Dijkstra con arreglo tarda {{arreglo_5000}} y con heap {{heap_5000}}.

4. **El heap es la opción por defecto para redes de transporte.** Estas redes son dispersas. El arreglo solo gana en redes muy densas, y por poco. Encontramos además que la cota del heap es pesimista: el número de `DECREASE-KEY` real es mucho menor que $E$, y en redes de líneas el heap casi no crece.

5. **A\* conserva la optimalidad y su ganancia depende de la geometría.** Dio el costo de Dijkstra en todas las consultas medidas. Redujo los nodos expandidos en {{ae_reduccion_5000}} % en la red geométrica, pero solo {{ae_metro_5000}} % en la de metro. Una heurística euclidiana orienta bien en una ciudad en malla y mal en una red de líneas. Además, expandir menos no siempre significa tardar menos.

6. **Validar la heurística no es opcional.** La condición geométrica es simple, pero basta un dato mal puesto para perder la garantía. El ejemplo de la figura y el A* ponderado lo muestran.

7. **Mantener un orden completo rara vez es lo que se necesita.** Para conocer la vía más congestionada, la cola de prioridad fue {{p6_razon_5000}} veces más rápida que reordenar. Elegir la estructura según la consulta real vale más que ordenar más rápido.

8. **La red de Buenaventura depende de un solo paso, y los datos reales lo confirman.** En la red simulada, Tarjan identifica el paso entre la isla y el continente como crítico: una falla ahí parte la red en dos. Con las calles reales de OpenStreetMap (sección 2.5) el resultado se sostiene: si se cierran los tramos del Puente El Piñal, la isla queda incomunicada por calle, y la Vía Alterna no la conecta. Un test automático lo verifica. Muestra el tipo de pregunta que estos algoritmos ayudan a responder.

Como trabajo futuro, se podría medir los algoritmos sobre la red de calles reales en el banco de pruebas, usar datos de rutas de buses y medir un heap de Fibonacci. También se podría evaluar heurísticas que aprovechen la estructura de líneas, por ejemplo con puntos de referencia.

# Referencias

1. Cormen, T. H., Leiserson, C. E., Rivest, R. L. y Stein, C. *Introduction to Algorithms*, 4.ª ed. MIT Press, 2022.
2. Rosen, K. H. *Matemática discreta y sus aplicaciones*. McGraw-Hill.
3. Dijkstra, E. W. "A note on two problems in connexion with graphs". *Numerische Mathematik*, 1, 269–271, 1959.
4. Hart, P. E., Nilsson, N. J. y Raphael, B. "A formal basis for the heuristic determination of minimum cost paths". *IEEE Transactions on Systems Science and Cybernetics*, 4(2), 100–107, 1968.
5. Tarjan, R. E. "Depth-first search and linear graph algorithms". *SIAM Journal on Computing*, 1(2), 146–160, 1972.
6. OpenStreetMap. Datos de calles de Buenaventura, © colaboradores de OpenStreetMap, disponibles bajo la licencia Open Database License (ODbL). https://www.openstreetmap.org/copyright. Consultado en noviembre de 2026.
