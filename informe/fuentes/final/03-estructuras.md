# Estructuras de datos

Todas las estructuras están hechas a medida en `src/core/`. Dentro de esa carpeta no usamos `sort`, `shift`, `splice`, `Map` ni `Set`, y los arreglos nativos funcionan solo como bloques de memoria indexados. Un test de auditoría lee el código fuente y falla si aparece algo prohibido.

{{tabla:estructuras|Operaciones y costos de las estructuras del proyecto.}}

## Cola FIFO con buffer circular

BFS necesita sacar por el frente y meter por el final. Una cola sobre un arreglo normal con `shift` costaría $O(n)$ por extracción, porque mueve todos los elementos. Guardamos un índice `inicio` y un tamaño `n`, y el siguiente hueco está en $(inicio + n) \bmod capacidad$. Encolar y desencolar son $O(1)$.

Cuando el buffer se llena se duplica su capacidad. Esa operación cuesta $\Theta(n)$, pero solo ocurre después de $n$ inserciones baratas, así que el costo amortizado por operación sigue siendo $O(1)$.

## Pila LIFO

DFS iterativo apila pares (nodo, padre). El padre viaja en la pila porque un nodo puede estar apilado varias veces con padres distintos, y el que cuenta es el de la entrada que salga primero. Apilar y desapilar son $O(1)$ amortizado.

## Lista de adyacencia

Es una lista enlazada por vértice, con puntero a la cola para insertar en $O(1)$ conservando el orden de inserción. Si insertáramos por la cabeza, el orden se invertiría y el DFS de la prueba de escritorio cambiaría.

Los nodos de la lista viven en arreglos tipados: el arco $e$ tiene `destino[e]`, `siguiente[e]`, `anterior[e]` y sus dos pesos. Sigue siendo una lista enlazada, con $-1$ en lugar de NIL. Esta forma tiene dos ventajas: hace exacta la cuenta de memoria y evita presión sobre el recolector de basura en redes grandes. El puntero `anterior` permite recorrer al revés sin copiar la lista, y eso lo usa DFS.

La memoria es $12|V| + 28m$ bytes: por vértice, tres enteros de 4 bytes (cabeza, cola y grado); por arco, tres enteros y dos reales de 8 bytes.

## Matriz de adyacencia

La incluimos para comparar. Una matriz $n \times n$ de reales ocupa $8|V|^2$ bytes sin importar cuántas vías existan, y hallar los vecinos de un nodo cuesta $\Theta(V)$ porque hay que barrer toda la fila.

## Montículo binario mínimo indexado

Dijkstra y A* necesitan extraer el mínimo y disminuir claves. Usamos el heap de CLRS con una tabla adicional: `posicion[id]` dice dónde está cada identificador en el arreglo. Sin esa tabla, encontrar el elemento para disminuir su clave costaría $O(n)$; con ella, `decreaseKey` cuesta $O(\lg n)$.

Implementamos `insert`, `extractMin`, `decreaseKey`, `actualizarClave` y `construir` en $O(n)$. También hicimos una variante de eliminación perezosa, solo para comparar: no tiene tabla de posiciones, inserta duplicados y descarta los obsoletos al extraer.

## Tabla hash

Usa encadenamiento separado y el hash FNV-1a de 32 bits. Con factor de carga $\alpha = n/m$, una búsqueda cuesta $\Theta(1 + \alpha)$ en promedio. Por eso duplicamos las cubetas cuando $\alpha$ pasa de 0.75. La usamos para pasar del identificador o nombre de una estación a su índice, y es la base del buscador de la interfaz.

{{tabla:tabla_hash|Tabla hash medida con claves de estación.}}

## Árbol k-d

Lo usamos para hallar la estación más cercana a un clic y para el generador de vecinos más cercanos. Se construye partiendo por la mediana del eje alterno, con selección rápida. La búsqueda desciende primero por el lado del punto y solo revisa el otro lado si la franja puede contener algo mejor.

{{tabla:kdtree|Árbol k-d medido: el tiempo de construcción dividido entre $n \lg n$ varía poco, entre {{kd_min}} y {{kd_max}} μs, y las consultas visitan pocos nodos.}}
