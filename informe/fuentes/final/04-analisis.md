<!--f1-->
# Análisis línea por línea

Seguimos el método de CLRS: cada línea $i$ tiene un costo constante $c_i$, y contamos cuántas veces $t_i$ se ejecuta. El tiempo total es $T = \sum_i c_i t_i$. Usamos $V = |V|$, $E = |E|$ y $m = \sum_{u \in V} \deg(u)$, con $m = 2E$ si la red es no dirigida y $m = E$ si es dirigida.

Analizamos el peor caso: todos los nodos son alcanzables desde $s$ y no hay destino que detenga la búsqueda antes.

## BFS

```pseudo
BFS(G, s, t)
for cada vértice u ∈ G.V
    u.color = BLANCO; u.d = ∞; u.π = NIL
s.color = GRIS; s.d = 0
Q = ∅
ENQUEUE(Q, s)
while Q ≠ ∅
    u = DEQUEUE(Q)
    for cada v ∈ G.Adj[u]
        if v.color == BLANCO
            v.color = GRIS; v.d = u.d + 1; v.π = u
            if v == t: return RUTA(s, t)
            ENQUEUE(Q, v)
    u.color = NEGRO
return RUTA(s, t)
```

| Línea | Costo | Veces | Por qué |
|---|---|---|---|
| 1 | $c_1$ | $V + 1$ | Una prueba por vértice y la que termina el ciclo |
| 2 | $c_2$ | $V$ | Se inicializa cada vértice |
| 3, 4, 5 | $c_3, c_4, c_5$ | $1$ | Fuera de los ciclos |
| 6 | $c_6$ | $V + 1$ | Cada vértice entra una vez a la cola |
| 7 | $c_7$ | $V$ | Cada vértice sale una vez |
| 8 | $c_8$ | $\sum_{u}(\deg(u) + 1) = m + V$ | Cada lista se recorre una vez, más la prueba final |
| 9 | $c_9$ | $m$ | Una vez por arco |
| 10, 11, 12 | $c_{10}, c_{11}, c_{12}$ | $V - 1$ | Cada vértice distinto de $s$ se descubre una vez |
| 13 | $c_{13}$ | $V$ | Cada vértice se ennegrece una vez |
| 14 | $c_{14}$ | $1$ | Reconstruir la ruta cuesta a lo sumo $V$ |

Un vértice entra a la cola una sola vez porque solo se encola cuando está blanco, y en ese momento pasa a gris. Por eso la línea 7 se ejecuta $V$ veces exactas. Sumando:

$$T(V, E) = \sum_i c_i t_i = \underbrace{(c_1 + c_2 + c_6 + c_7 + c_8 + c_{10} + c_{11} + c_{12} + c_{13})}_{a} V + \underbrace{(c_8 + c_9)}_{b}\, m + c$$

Con el lema del apretón de manos, $\sum_{u \in V} \deg(u) = 2E$:

$$T(V, E) = aV + b\sum_{u \in V}\deg(u) + c = aV + 2bE + c = \Theta(V + E)$$

**Espacio.** Los arreglos `color`, `d` y `π` ocupan $\Theta(V)$ y la cola a lo sumo $V$ elementos. El espacio adicional es $\Theta(V)$, más $\Theta(V + E)$ de la lista de adyacencia.

## DFS

```pseudo
DFS-ITERATIVO(G, s, t)
for cada vértice u ∈ G.V: u.visitado = FALSO; u.π = NIL
S = ∅
PUSH(S, (s, NIL))
while S ≠ ∅
    (u, p) = POP(S)
    if u.visitado: continue
    u.visitado = VERDADERO; u.π = p
    if u == t: return RUTA(s, t)
    for cada v ∈ G.Adj[u], en orden inverso
        if no v.visitado
            PUSH(S, (v, u))
return RUTA(s, t)
```

Sea $q$ el número de veces que se ejecuta la línea 11. El total de entradas que pasan por la pila es $P = q + 1$. Como la línea 11 está dentro del ciclo sobre arcos, $q \le m$.

| Línea | Costo | Veces | Por qué |
|---|---|---|---|
| 1 | $c_1$ | $V + 1$ | Inicialización |
| 2, 3 | $c_2, c_3$ | $1$ | Fuera del ciclo |
| 4 | $c_4$ | $P + 1$ | Una prueba por entrada y la final |
| 5, 6 | $c_5, c_6$ | $P$ | Toda entrada apilada sale |
| 7, 8 | $c_7, c_8$ | $V$ | Un vértice se visita una sola vez |
| 9 | $c_9$ | $m + V$ | La lista de un vértice se recorre solo al visitarlo |
| 10 | $c_{10}$ | $m$ | Una vez por arco |
| 11 | $c_{11}$ | $q \le m$ | Solo si el vecino no estaba visitado |
| 12 | $c_{12}$ | $1$ | Al terminar |

La suma queda:

$$T(V, E) = aV + bm + (c_4 + c_5 + c_6 + c_{11})\, q + c$$

Como $0 \le q \le m$, se cumple $aV + bm + c \le T \le aV + (b + c_4 + c_5 + c_6 + c_{11})\, m + c$. Las dos cotas son lineales en $V + m$, y por tanto $T(V, E) = \Theta(V + E)$.

**Por qué el orden inverso.** Marcamos visitado al sacar de la pila, no al meter, y empujamos los vecinos al revés. Así el primer vecino queda en la cima, que es el que visitaría primero la recursión. Los tests prueban con grafos aleatorios que esta versión y la recursiva dan el mismo orden y los mismos antecesores.

**Espacio.** A diferencia de BFS, la pila puede tener varias copias de un nodo, hasta $O(E)$ entradas. El precio de reproducir exactamente el orden recursivo es ese. La versión recursiva usa $O(V)$ de pila de llamadas.

<!--/f1-->
## Dijkstra con Min-Heap

```pseudo
DIJKSTRA(G, w, s, t)
for cada vértice v ∈ G.V: v.d = ∞; v.π = NIL
s.d = 0
S = ∅
Q = ∅
INSERT(Q, s, 0)
while Q ≠ ∅
    u = EXTRACT-MIN(Q)
    S = S ∪ {u}
    if u == t: break
    for cada v ∈ G.Adj[u]
        if u.d + w(u, v) < v.d
            v.d = u.d + w(u, v); v.π = u
            if v ∈ Q: DECREASE-KEY(Q, v, v.d)
            else INSERT(Q, v, v.d)
return RUTA(s, t)
```

Un nodo se inserta una sola vez: tras extraerse, $v.d$ ya es definitiva y la línea 11 no vuelve a ser verdadera para él. Sea $k \le m$ el número de veces que la línea 11 es verdadera. Cada mejora termina en un `INSERT` o en un `DECREASE-KEY`, y hay exactamente $V - 1$ inserciones en la línea 14.

| Línea | Costo | Veces | Por qué |
|---|---|---|---|
| 1 | $c_1$ | $V + 1$ | Inicialización |
| 2, 3, 4 | $c_2, c_3, c_4$ | $1$ | Fuera del ciclo |
| 5 | $O(1)$ | $1$ | El heap está vacío |
| 6 | $c_6$ | $V + 1$ | Cada nodo sale una vez |
| 7 | $O(\lg V)$ | $V$ | Extracción del heap |
| 8, 9 | $c_8, c_9$ | $V$ | Una vez por nodo cerrado |
| 10 | $c_{10}$ | $m + V$ | Cada lista se recorre una vez |
| 11 | $c_{11}$ | $m$ | Un intento de relajación por arco |
| 12 | $c_{12}$ | $k \le m$ | Relajaciones que mejoran |
| 13 | $O(\lg V)$ | $k - (V - 1)$ | Mejoras sobre nodos ya presentes |
| 14 | $O(\lg V)$ | $V - 1$ | Primer descubrimiento de cada nodo |
| 15 | $c_{15}$ | $1$ | Al terminar |

Sumando por grupos:

$$T(V, E) = O(V) + V \cdot O(\lg V) + O(m + V) + k \cdot O(\lg V) = O((V + k) \lg V + m)$$

Como $k \le m \le 2E$:

$$T(V, E) = O((V + E) \lg V)$$

**Espacio.** $\Theta(V)$: el heap guarda cada nodo a lo sumo una vez. Esta es la ventaja de `DECREASE-KEY` sobre la eliminación perezosa, donde el heap puede llegar a $O(E)$ entradas.

## Dijkstra con arreglo desordenado

El pseudocódigo es el mismo, pero `Q` no existe como estructura: `EXTRACT-MIN` barre todos los nodos no cerrados buscando el menor $v.d$, y relajar no requiere ninguna operación adicional.

| Línea | Costo | Veces | Por qué |
|---|---|---|---|
| 1 | $c_1$ | $V + 1$ | Inicialización |
| 7 | $\Theta(V)$ | $V$ | Barrido del arreglo en cada extracción |
| 10 | $c_{10}$ | $m + V$ | Cada lista se recorre una vez |
| 11, 12 | $c_{11}, c_{12}$ | $\le m$ | Relajar cuesta $O(1)$: no hay heap que actualizar |

Nuestra implementación barre los $V$ nodos en cada una de las $V + 1$ extracciones, la última sin resultado, así que el ciclo de búsqueda ejecuta exactamente $V(V + 1)$ comparaciones:

$$T(V, E) = \sum_{i=1}^{V+1} V + O(m) = V(V + 1) + O(E) = \Theta(V^2)$$

La última igualdad usa $E \le V^2$. El arreglo no depende de $E$ en el término dominante, y esa es la razón de que pueda ganarle al heap en redes densas.

## A*

```pseudo
A-ESTRELLA(G, w, h, s, t)
for cada vértice v ∈ G.V: v.g = ∞; v.π = NIL
s.g = 0
Q = ∅
INSERT(Q, s, h(s))
while Q ≠ ∅
    u = EXTRACT-MIN(Q)
    u.cerrado = VERDADERO
    if u == t: break
    for cada v ∈ G.Adj[u]
        if u.g + w(u, v) < v.g
            v.g = u.g + w(u, v); v.π = u; f = v.g + h(v)
            if v ∈ Q: DECREASE-KEY(Q, v, f)
            else INSERT(Q, v, f)
return RUTA(s, t)
```

Es Dijkstra con otra clave en el heap: $f(n) = g(n) + h(n)$. Calcular $h$ cuesta $O(1)$ y se hace a lo sumo una vez por nodo, porque guardamos el valor al primer uso.

Con $h$ consistente, cada nodo se cierra a lo sumo una vez (sección 6.3), y la tabla de conteos es igual a la de Dijkstra:

$$T(V, E) = O(V) + O(V \lg V) + O(m) + k \cdot O(\lg V) = O((V + E) \lg V)$$

La cota de peor caso es la misma: si la heurística no aporta, A* expande lo mismo que Dijkstra. La ganancia es práctica y depende de la geometría, y por eso la medimos en la sección 7. Con $h$ admisible pero inconsistente puede hacer falta reabrir nodos, y la cota deja de valer. Nuestro código lo permite y cuenta esas reaperturas.

<!--f1-->
## Impacto de escalar la red

{{tabla:escala|Escalar de 10 a 50 y 100 estaciones en la red geométrica. Los conteos son exactos y los tiempos son medianas.}}

Los conteos exactos muestran la diferencia. Pasar de 10 a 100 estaciones multiplica por cerca de 10 las iteraciones de BFS, porque las redes son dispersas y $m$ crece linealmente con $V$. El barrido de Dijkstra con arreglo, en cambio, pasa de 110 a 10.100 comparaciones, cerca de 92 veces, porque depende de $V^2$.

En este rango los tiempos crecen menos que los conteos, porque con tan pocas estaciones pesan los costos fijos de cada llamada: reservar arreglos e inicializarlos. Con $N = 5000$ el término dominante ya manda, como muestran las secciones 7.2 y 7.5.
<!--/f1-->
