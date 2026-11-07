# Correctitud

## BFS calcula la distancia en saltos

Sea $\delta(s, v)$ el mínimo número de aristas de un camino de $s$ a $v$.

**Lema (orden de la cola).** En todo momento, si la cola contiene $v_1, \dots, v_r$ del frente al final, entonces $v_i.d \le v_{i+1}.d$ y $v_r.d \le v_1.d + 1$.

*Demostración.* Por inducción sobre las operaciones de la cola. Al inicio solo está $s$. Al desencolar $v_1$, el nuevo frente $v_2$ cumple $v_1.d \le v_2.d$, así que $v_r.d \le v_1.d + 1 \le v_2.d + 1$. Al encolar $v$ desde $u = v_1$ ya desencolado, se asigna $v.d = u.d + 1 \ge v_r.d$, y $v.d = u.d + 1 \le$ (nuevo frente)$.d + 1$. $\blacksquare$

**Teorema.** Al terminar BFS, $v.d = \delta(s, v)$ para todo $v$ alcanzable.

*Demostración.* Primero, $v.d \ge \delta(s, v)$: $v.d$ es la longitud de un camino real, el formado por los antecesores. Supongamos que algún $v$ tiene $v.d > \delta(s, v)$ y elijamos el de menor $\delta(s, v)$. Sea $u$ el nodo anterior a $v$ en un camino más corto, de modo que $\delta(s, v) = \delta(s, u) + 1$ y $u.d = \delta(s, u)$. Entonces $v.d > u.d + 1$.

Consideremos el momento en que $u$ sale de la cola. Si $v$ estaba blanco, se le asigna $v.d = u.d + 1$, contradicción. Si estaba gris o negro, entró antes o desde un nodo anterior a $u$ en la cola, y por el lema $v.d \le u.d + 1$, contradicción. $\blacksquare$

## Invariante de Dijkstra

**Invariante.** Al inicio de cada iteración del ciclo, para todo $v \in S$ se cumple $v.d = \delta(s, v)$.

*Demostración.* Inicialización: $S = \emptyset$. Mantenimiento: sea $u$ el primer nodo extraído con $u.d \ne \delta(s, u)$. Tomemos un camino más corto $p$ de $s$ a $u$, y sea $y$ el primer nodo de $p$ fuera de $S$, con $x$ su antecesor en $p$. Como $x \in S$, su arista ya se relajó y $y.d = \delta(s, y)$. Como los pesos no son negativos, $\delta(s, y) \le \delta(s, u) \le u.d$. Pero $u$ se extrajo antes que $y$, así que $u.d \le y.d$. Por tanto:

$$u.d \le y.d = \delta(s, y) \le \delta(s, u) \le u.d$$

Todas son igualdades, y $u.d = \delta(s, u)$, contradicción. Terminación: al vaciar $Q$, $S$ contiene todos los alcanzables. $\blacksquare$

La demostración usa que los pesos no son negativos en $\delta(s, y) \le \delta(s, u)$. Por eso nuestro código rechaza pesos negativos. Parar al cerrar $t$ también es correcto, porque en ese momento $t \in S$.

## Optimalidad de A*

Sea $h^*(n)$ el costo real desde $n$ hasta la meta.

**Definiciones.** $h$ es **admisible** si $h(n) \le h^*(n)$ para todo $n$. $h$ es **consistente** si $h(u) \le w(u, v) + h(v)$ para todo arco y $h(\text{meta}) = 0$.

**Consistente implica admisible.** Sea $n = v_0, v_1, \dots, v_k = t$ un camino óptimo. Aplicando la consistencia $k$ veces:

$$h(n) \le w(v_0, v_1) + h(v_1) \le \dots \le \sum_{i=0}^{k-1} w(v_i, v_{i+1}) + h(t) = h^*(n)$$

**Con $h$ consistente ningún nodo cerrado se reabre.** Si $v$ sigue a $u$ en un camino, $f(v) = g(u) + w(u, v) + h(v) \ge g(u) + h(u) = f(u)$. Es decir, $f$ no decrece a lo largo de un camino. Por eso los nodos se cierran en orden no decreciente de $f$. Cuando un nodo se cierra, su $g$ ya es óptimo: un camino mejor pasaría por un nodo abierto con $f$ menor, que se habría extraído antes.

**Optimalidad.** Cuando $t$ se cierra, $f(t) = g(t) + 0 = g(t)$. Todo nodo abierto $n$ de un camino óptimo cumple $f(n) = g(n) + h(n) \le g(n) + h^*(n) = C^*$, y como $t$ salió primero, $g(t) \le C^*$. Por tanto $g(t) = C^*$. $\blacksquare$

**Por qué la euclidiana es consistente.** Sea $e(a, b)$ la distancia euclidiana. La condición geométrica de nuestras redes es $e(u, v) \le w(u, v)$: una vía mide al menos la línea recta. Por la desigualdad triangular:

$$h(u) = e(u, t) \le e(u, v) + e(v, t) \le w(u, v) + h(v)$$

**Unidades en minutos.** Con la métrica en minutos, $w$ es un tiempo y $e$ una distancia. Usamos $h = e / v_{\max}$, con $v_{\max} = \max_{(u,v)} e(u, v) / w(u, v)$. Para todo arco, $e(u, v)/v_{\max} \le w(u, v)$, que es la misma condición en otras unidades. Si usáramos la distancia sin convertir, $h$ dejaría de ser admisible en cualquier vía más rápida que 1 km/min.

**Con congestión.** El peso efectivo es $w \cdot (1 + c)$ con $c \ge 0$. Los pesos solo suben, así que $h$ sigue siendo admisible y consistente.

## Validación automática

Además de las demostraciones, comprobamos la correctitud con pruebas automáticas:

- Dijkstra con heap, Dijkstra con arreglo y el heap perezoso se comparan con Floyd-Warshall y Bellman-Ford en cientos de grafos aleatorios. Esas referencias están escritas solo en los tests.
- A* con $h$ admisible da el costo de Floyd-Warshall en todos los pares, y con $h = 0$ reproduce exactamente el orden de Dijkstra.
- BFS da el mínimo de saltos, y DFS iterativo da el mismo orden que el recursivo.
- Tarjan se compara con quitar cada nodo y cada vía por fuerza bruta.

La suite completa tiene {{tests}} pruebas, y la cobertura de `src/core` es {{cobertura}} % de líneas.
