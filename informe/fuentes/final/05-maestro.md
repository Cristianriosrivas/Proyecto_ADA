# Método Maestro

El Método Maestro resuelve recurrencias de la forma

$$T(n) = aT(n/b) + f(n), \qquad a \ge 1, \; b > 1$$

Compara $f(n)$ con la función de cuenca $n^{\log_b a}$, que mide el trabajo total en las hojas del árbol de recursión. Hay tres casos:

1. Si $f(n) = O(n^{\log_b a - \varepsilon})$ para algún $\varepsilon > 0$, las hojas dominan y $T(n) = \Theta(n^{\log_b a})$.
2. Si $f(n) = \Theta(n^{\log_b a} \lg^k n)$ con $k \ge 0$, todos los niveles pesan parecido y $T(n) = \Theta(n^{\log_b a} \lg^{k+1} n)$.
3. Si $f(n) = \Omega(n^{\log_b a + \varepsilon})$ y además $a f(n/b) \le c f(n)$ para algún $c < 1$, la raíz domina y $T(n) = \Theta(f(n))$.

## MIN-HEAPIFY

Al bajar un elemento, el subárbol de un hijo tiene a lo sumo $2n/3$ nodos. El peor caso es el último nivel lleno hasta la mitad, porque deja un subárbol más pesado que el otro. Comparar con los hijos cuesta $\Theta(1)$:

$$T(n) \le T(2n/3) + \Theta(1)$$

Aquí $a = 1$, $b = 3/2$ y $n^{\log_{3/2} 1} = n^0 = 1$. Como $f(n) = \Theta(1) = \Theta(n^0 \lg^0 n)$, es el **caso 2** con $k = 0$, y $T(n) = O(\lg n)$. Esa es la cota de `extractMin`.

## MergeSort

Se parte el arreglo en dos mitades y mezclar cuesta $\Theta(n)$:

$$T(n) = 2T(n/2) + \Theta(n)$$

Con $a = 2$ y $b = 2$, $n^{\log_2 2} = n$. Como $f(n) = \Theta(n)$, es el **caso 2** con $k = 0$: $T(n) = \Theta(n \lg n)$.

## Búsqueda binaria

$$T(n) = T(n/2) + \Theta(1)$$

Con $a = 1$ y $b = 2$, $n^{\log_2 1} = 1$. Es el **caso 2** con $k = 0$: $T(n) = \Theta(\lg n)$.

## Construcción del árbol k-d

Hallar la mediana con selección rápida cuesta $\Theta(n)$ en promedio, y quedan dos mitades:

$$T(n) = 2T(n/2) + \Theta(n)$$

Es la misma recurrencia de MergeSort: **caso 2**, $T(n) = \Theta(n \lg n)$. La Tabla de la sección 3 muestra que el tiempo dividido entre $n \lg n$ se mantiene casi constante.

El Método Maestro también explica por qué importa elegir bien la mediana:

- Si en cada nivel se **ordenara** con un algoritmo de $\Theta(n \lg n)$, quedaría $f(n) = \Theta(n \lg n)$. Sigue siendo el **caso 2**, ahora con $k = 1$, y $T(n) = \Theta(n \lg^2 n)$.
- Si en cada nivel se usara un método cuadrático, quedaría $T(n) = 2T(n/2) + \Theta(n^2)$. Ahí $n^2 = \Omega(n^{1 + \varepsilon})$ con $\varepsilon = 1$, y se cumple la regularidad porque $2(n/2)^2 = n^2/2$, con $c = 1/2$. Es el **caso 3**: $T(n) = \Theta(n^2)$.

## Recorrer el árbol k-d completo

Visitar todos los nodos de un árbol balanceado cuesta $\Theta(1)$ por nodo:

$$T(n) = 2T(n/2) + \Theta(1)$$

Con $a = 2$ y $b = 2$, $n^{\log_2 2} = n$. Como $f(n) = O(n^{1 - \varepsilon})$ con $\varepsilon = 1$, es el **caso 1**: $T(n) = \Theta(n)$. Este es el ejemplo del proyecto donde dominan las hojas.

## QuickSort

En el caso balanceado, con partición en $\Theta(n)$:

$$T(n) = 2T(n/2) + \Theta(n) = \Theta(n \lg n) \quad \text{(caso 2)}$$

En el peor caso, el pivote deja un lado vacío:

$$T(n) = T(n - 1) + \Theta(n)$$

Aquí el Método Maestro **no aplica**: el subproblema mide $n - 1$, no $n/b$ con $b > 1$ constante. Se resuelve por sumatoria, desarrollando la recurrencia:

$$T(n) = \sum_{k=1}^{n} \Theta(k) = \Theta\!\left(\frac{n(n+1)}{2}\right) = \Theta(n^2)$$

Por eso usamos mediana de 3: con datos ya ordenados, el pivote cae en el centro. La sección 7.7 reproduce el peor caso tomando el último elemento como pivote.

## BUILD-HEAP

BUILD-HEAP llama MIN-HEAPIFY sobre $\lfloor n/2 \rfloor$ nodos, así que la cota fácil es $O(n \lg n)$. Pero es demasiado pesimista: el costo depende de la altura de cada nodo, y un heap tiene a lo sumo $\lceil n/2^{h+1} \rceil$ nodos de altura $h$. Tampoco es una recurrencia del Método Maestro; se resuelve por sumatoria:

$$\sum_{h=0}^{\lfloor \lg n \rfloor} \left\lceil \frac{n}{2^{h+1}} \right\rceil O(h) = O\!\left(n \sum_{h=0}^{\infty} \frac{h}{2^h}\right) = O(2n) = O(n)$$

La última igualdad usa $\sum_{h=0}^{\infty} h/2^h = 2$. Casi todos los nodos están cerca de las hojas, donde MIN-HEAPIFY casi no trabaja.

{{tabla:build_heap|BUILD-HEAP contra $n$ inserciones. Las comparaciones por elemento de BUILD-HEAP se mantienen constantes al crecer $n$.}}
