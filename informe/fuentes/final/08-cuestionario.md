<!--f1-->
# Cuestionario

## Pregunta 1: matriz contra lista en redes dispersas

*¿Cómo impacta la elección de representación en el consumo de memoria y tiempo de recorrido de BFS/DFS sobre redes dispersas?*

**Memoria.** La matriz guarda una celda por cada par de estaciones, exista o no la vía, y ocupa $\Theta(V^2)$. La lista guarda una entrada por vértice y una por arco, y ocupa $\Theta(V + E)$. Una red dispersa cumple $E = O(V)$: cada estación se conecta con unas pocas vecinas. Ahí la lista ocupa $\Theta(V)$, una potencia menos.

**Tiempo.** El análisis de BFS depende de cuánto cuesta enumerar los vecinos de $u$. Con lista cuesta $\Theta(\deg(u))$, y el total es $\sum_u \Theta(1 + \deg(u)) = \Theta(V + E)$. Con matriz hay que barrer toda la fila, $\Theta(V)$ por nodo, aunque el nodo tenga dos vecinos. El total es $\sum_u \Theta(V) = \Theta(V^2)$. Esto vale igual para DFS.

**Evidencia.** En la red geométrica de 5000 estaciones, con densidad de {{densidad_5000}} %, la lista ocupa {{mem_lista_5000}} y la matriz {{mem_matriz_5000}}: {{mem_razon_5000}} veces más. BFS tarda {{bfs_lista_5000}} con lista y {{bfs_matriz_5000}} con matriz, {{bfs_razon_5000}} veces más; en DFS la razón es {{dfs_razon_5000}}. Las tablas de la sección 7.4 muestran el trabajo exacto: la matriz barre $V^2$ celdas y la lista recorre $2|E|$ arcos.

Con $N = 10$ la diferencia desaparece, e incluso la matriz puede ser más rápida: leer un arreglo contiguo es muy barato y las constantes dominan. La ventaja de la lista es asintótica, y se ve al crecer la red.

## Pregunta 2: iteraciones exactas y cotas

*En el bucle principal de BFS/DFS, ¿cuál es la cantidad exacta de iteraciones en el peor caso sobre la lista de adyacencia, y cuáles son sus cotas Ω y O?*

Consideramos el peor caso: toda la red es alcanzable y no hay destino que detenga la búsqueda.

**Ciclo externo.** En BFS, un vértice entra a la cola una sola vez, porque se encola solo cuando está blanco y en ese momento pasa a gris. Por eso el ciclo externo ejecuta exactamente $|V|$ iteraciones. En DFS el número de visitas también es exactamente $|V|$, aunque la pila entregue más entradas.

**Ciclo interno.** La lista de $u$ se recorre una sola vez, cuando $u$ sale de la cola o se visita. El número de iteraciones es

$$\sum_{u \in V} \deg(u) = \begin{cases} 2|E| & \text{en una red no dirigida} \\ |E| & \text{en una red dirigida} \end{cases}$$

La primera igualdad es el lema del apretón de manos: cada arista aporta 1 al grado de sus dos extremos.

**Cotas.** Sumando las dos partes, $T(V, E) = a|V| + bm + c$ con $m$ igual a la suma anterior. Para toda ejecución completa:

$$c_1(|V| + |E|) \le T(V, E) \le c_2(|V| + |E|)$$

Así que $T = \Omega(V + E)$ y $T = O(V + E)$, es decir, $T = \Theta(V + E)$.

**Evidencia.** Los contadores de la sección 7.3 coinciden con la fórmula en {{contadores_ok}} de {{contadores_filas}} combinaciones. Con esto la pregunta queda respondida con una verificación exacta, no solo con una gráfica.

## Pregunta 3: por qué BFS garantiza la ruta más corta y DFS no

*¿Por qué BFS garantiza siempre la ruta más corta en número de estaciones sin peso, mientras que DFS no?*

**BFS.** La cola hace que los nodos se exploren por niveles. El lema de la sección 6.1 prueba que los valores $d$ en la cola no decrecen y difieren a lo sumo en 1. Por tanto, todo nodo a distancia $k$ se descubre antes que cualquier nodo a distancia $k + 1$. La primera vez que BFS alcanza un nodo, lo alcanza por un camino de longitud mínima, y el teorema de la sección 6.1 concluye que $v.d = \delta(s, v)$.

**DFS.** La pila no ordena por distancia: sigue el primer vecino hasta agotarlo. Un nodo cercano puede descubrirse por un camino largo, y como ya quedó visitado, nunca se corrige.

**Contraejemplo con la prueba de escritorio.** Para $(A, E)$, BFS devuelve $A \to C \to E$, con 2 saltos. DFS entra primero a $B$, porque es el primer vecino de $A$, de ahí a $C$ y luego a $D$, y llega a $E$ con $A \to B \to C \to D \to E$: 4 saltos. Existe un camino de 2 saltos y DFS no lo halló.

**Nota sobre la tabla del documento.** La tabla del proyecto admite "2 o 3 saltos" para BFS, con la alternativa $A \to C \to D \to E$. Con un BFS correcto el resultado es siempre 2 saltos: $E$ se descubre al procesar $C$, y $D$, aunque ya esté en la cola, nunca llega a ser el padre de $E$, porque $C$ sale antes que $D$.
<!--/f1-->

## Pregunta 4: Dijkstra con arreglo y con Min-Heap

*¿Cuál es la diferencia de rendimiento al implementar Dijkstra con un arreglo desordenado frente a un Min-Heap?*

**Análisis.** Con arreglo, cada una de las $V$ extracciones barre el arreglo: $\Theta(V)$. Relajar cuesta $O(1)$. El total es $\Theta(V^2 + E) = \Theta(V^2)$. Con Min-Heap, extraer y disminuir cuestan $O(\lg V)$, y el total es $O((V + E) \lg V)$.

**Según la densidad.**

- En redes dispersas, $E = O(V)$: el heap cuesta $O(V \lg V)$ y el arreglo $\Theta(V^2)$. Gana el heap.
- En redes densas, $E = \Theta(V^2)$: el heap cuesta $O(V^2 \lg V)$ y el arreglo $\Theta(V^2)$. Gana el arreglo.

Igualando $V^2 = E \lg V$ se obtiene el cruce teórico, $E \approx V^2 / \lg V$. Un heap de Fibonacci cuesta $O(E + V \lg V)$, porque disminuye claves en $O(1)$ amortizado, y sería mejor o igual en todo el rango, aunque con constantes mayores.

**Evidencia.** En la red dispersa de 5000 estaciones, el heap es {{razon_heap_arreglo_5000}} veces más rápido ({{heap_5000}} frente a {{arreglo_5000}}). El punto de cruce medido, en vías, fue {{cruce_vias_500}} con $N = 500$, {{cruce_vias_1000}} con $N = 1000$ y {{cruce_vias_2000}} con $N = 2000$, frente a estimaciones de {{cruce_teorico_500}}, {{cruce_teorico_1000}} y {{cruce_teorico_2000}}.

El orden de magnitud coincide, pero el heap aguanta más de lo que dice la cota. La razón es que la cota supone que cada arco dispara un `DECREASE-KEY`, y eso casi nunca pasa. En la red completa de 1000 estaciones hay {{vias_1000_100}} vías y solo {{mejoras_1000_100}} relajaciones mejoraron una distancia. Por eso en redes densas la ventaja del arreglo es pequeña: en esa red el heap fue apenas {{razon_1000_100}} veces más lento.

## Pregunta 5: condiciones geométricas de $h$

*Para que A\* sea admisible y consistente, ¿qué condiciones geométricas debe cumplir $h(n)$ respecto a las distancias reales?*

**Admisibilidad.** $h(n) \le h^*(n)$ para todo $n$: la heurística nunca sobrestima el costo real hasta la meta. Es lo que garantiza que A* devuelva una ruta óptima.

**Consistencia.** $h(n) \le w(n, n') + h(n')$ para todo arco, y $h(\text{meta}) = 0$. Es la desigualdad triangular: desde $n$, ir directo a la meta no puede parecer más caro que dar un paso y seguir desde ahí.

**Condición geométrica.** Con $h$ euclidiana, la condición es que **cada vía mida al menos la línea recta entre sus estaciones**: $e(u, v) \le w(u, v)$. La desigualdad triangular del plano da entonces la consistencia, como demostramos en la sección 6.3. Nuestras redes la cumplen por construcción: el factor vial es mayor que 1, y en la red docente elegimos las coordenadas para cumplirla, con igualdad en $A$-$C$ y $B$-$C$.

**Relación entre ambas.** Consistencia implica admisibilidad, por inducción sobre el camino óptimo. Además implica que $f$ no decrece y que ningún nodo cerrado se reabre. Lo contrario no es cierto: una heurística puede ser admisible sin ser consistente, y entonces hay que permitir reabrir nodos. Tenemos un test con ese caso.

**Unidades.** Con pesos en minutos, $h$ debe convertirse: $h = e / v_{\max}$, con $v_{\max}$ la mayor velocidad de la red. Sin esta conversión, $h$ estaría en km, y en cualquier vía más rápida que 1 km/min sobrestimaría.

**Ejemplo didáctico.** La figura ilustrativa del documento muestra $h(F) = 6.3$ y $h(G) = 2.2$, mientras que los costos reales hasta $H$ son 3 y 2. Si esos valores se usaran, serían inadmisibles, porque $h > h^*$. Lo señalamos con respeto, entendiendo que la figura es ilustrativa, porque sirve de ejemplo de por qué conviene validar una heurística antes de usarla. El validador del sistema marca esas dos estaciones. Con nuestras coordenadas, $h$ queda por debajo de $h^*$ en todas las estaciones (Tabla de la sección 2.2).

**Evidencia.** En {{ae_iguales_total}} de {{ae_consultas_total}} consultas, A* dio el costo de Dijkstra, sin ninguna reapertura.

## Pregunta 6: tabla de congestión ordenada

*Compare el costo asintótico de mantener una tabla de congestión ordenada dinámicamente con QuickSort/HeapSort frente a una Cola de Prioridad.*

Supongamos $n$ vías y $m$ actualizaciones de congestión, y que tras cada una se necesita la vía más congestionada.

**Reordenar.** Cada actualización exige ordenar de nuevo: $O(n \lg n)$ con HeapSort, garantizado. QuickSort tiene ese costo en promedio y $O(n^2)$ en el peor caso. El total es $O(m \cdot n \lg n)$.

**Cola de prioridad indexada.** Se construye una vez en $O(n)$. Cada actualización cuesta $O(\lg n)$, porque la tabla de posiciones ubica la vía en $O(1)$, y la consulta del máximo cuesta $O(1)$. El total es $O(n + m \lg n)$.

La razón entre ambas estrategias crece como $n$. Hay un matiz: la cola solo da el máximo, no toda la tabla ordenada. Si se necesitan las $k$ mayores, se extraen en $O(k \lg n)$, y por eso el top-k del sistema cuesta $O(n + k \lg n)$. Una tabla ordenada completa solo se justifica si se va a mostrar entera, y entonces basta ordenar una vez al mostrarla.

**Evidencia.** Con $n = 5000$ y $m = {{p6_m}}$, reordenar con QuickSort tomó {{p6_quick_5000}} ms y con HeapSort {{p6_heap_5000}} ms. La cola de prioridad tomó {{p6_cola_5000}} ms, unas {{p6_razon_5000}} veces menos. En comparaciones: {{p6_comp_quick_5000}} frente a {{p6_comp_cola_5000}}. Las tres estrategias llegaron al mismo máximo final, y un test lo verifica.
