# Guía de sustentación

## Antes de empezar

1. Abre `GestorRutas.html` con doble clic. Funciona sin internet.
2. Comprueba en el proyector que se ve la barra lateral y que el mapa cabe.
3. Ten una terminal lista con `npm run cli -- ayuda`, por si falla el proyector.

## Guion de demo de 5 minutos

| Minuto | Qué mostrar | Qué decir |
|---|---|---|
| 0:00 | Inicio → **Iniciar sustentación** | "Modelamos la red como un grafo y lo hicimos todo con estructuras propias. Ninguna librería de grafos." |
| 0:30 | Escena Red docente | "Son las 8 estaciones del documento, insertadas en orden. La lista inserta por la cola para conservar ese orden." |
| 1:00 | Escena BFS | "La cola explora por niveles. Por eso A → C → E tiene el mínimo de saltos: 2." |
| 1:30 | Escena DFS | "La pila sigue el primer vecino hasta agotarlo. Da 4 saltos. Por eso DFS no garantiza el camino más corto." |
| 2:00 | Escena Dijkstra | "Al extraer un nodo del heap su distancia ya es definitiva. A → F cuesta 13 km." |
| 2:30 | Escena A* | "Misma estructura, otra clave: f = g + h. Aquí la ruta pasa por los 8 nodos, así que no puede expandir menos." |
| 3:00 | Escena Duelo | "En una red de 250 estaciones, mismo costo y muchos menos nodos." |
| 3:30 | Sal con Esc. **Prueba de Escritorio** | "Estos son los 4 casos del docente, ejecutados con el código real. Todos dicen Coincide." |
| 4:15 | **Laboratorio** | "Aquí están los contadores y las curvas. El ciclo interno de BFS da exactamente 2|E|." |
| 4:45 | Escena Conclusiones | "Los datos respaldan cada conclusión del informe." |

Si el proyector falla:

```bash
npm run cli -- ruta --red docente --desde A --hasta F --algo dijkstra --traza
```

## Prueba de escritorio a mano

Las listas de adyacencia, en el orden de inserción, son:

```
A: B, C          E: C, D, F
B: A, C, D       F: D, E, G
C: A, B, D, E    G: F, H
D: B, C, E, F    H: G
```

### BFS (A, E)

1. Encola A con d = 0.
2. Saca A: descubre B (d = 1, π = A) y C (d = 1, π = A). Cola: B, C.
3. Saca B: A y C ya están descubiertas; descubre D (d = 2, π = B). Cola: C, D.
4. Saca C: A, B y D ya están; descubre E (d = 2, π = C). Es el destino.
5. Ruta por π: E ← C ← A. Resultado: **A → C → E, 2 saltos**.

La tabla del docente admite "2 o 3 saltos". BFS siempre da 2, porque C es el único vecino de A adyacente a E, y C se revisa antes que cualquier nodo de nivel 2.

### DFS (A, E)

La pila guarda pares (nodo, padre). Los vecinos entran al revés, para que el primero quede en la cima.

1. Saca (A, NIL) y visita A. Apila C y luego B. Cima: (B, A).
2. Saca (B, A) y visita B. Apila D y luego C (A ya está visitada). Cima: (C, B).
3. Saca (C, B) y visita C. Apila E y luego D. Cima: (D, C).
4. Saca (D, C) y visita D. Apila F y luego E. Cima: (E, D).
5. Saca (E, D) y visita E. Es el destino.
6. Ruta: **A → B → C → D → E, 4 saltos**.

### Dijkstra (A, F)

| Extrae | d | Relajaciones que mejoran |
|---|---|---|
| A | 0 | B = 4, C = 2 |
| C | 2 | B = 3 (por C), D = 10, E = 12 |
| B | 3 | D = 8 (por B) |
| D | 8 | E = 10 (por D), F = 14 |
| E | 10 | F = 13 (por E) |
| F | 13 | Es el destino: se detiene |

Cierra 6 nodos. Ruta: **A → C → B → D → E → F, 13 km**.

### A* (A, H)

Igual a Dijkstra, pero la clave es f = g + h, con h de la tabla:

`A 14.07 · B 11.96 · C 12.92 · D 7.09 · E 5.73 · F 2.88 · G 1.94 · H 0`

| Extrae | g | f | Relajaciones que mejoran |
|---|---|---|---|
| A | 0 | 14.07 | B: g = 4, f = 15.96. C: g = 2, f = 14.92 |
| C | 2 | 14.92 | B: g = 3, f = 14.96. D: g = 10, f = 17.09. E: g = 12, f = 17.73 |
| B | 3 | 14.96 | D: g = 8, f = 15.09 |
| D | 8 | 15.09 | E: g = 10, f = 15.73. F: g = 14, f = 16.88 |
| E | 10 | 15.73 | F: g = 13, f = 15.88 |
| F | 13 | 15.88 | G: g = 14, f = 15.94 |
| G | 14 | 15.94 | H: g = 16, f = 16 |
| H | 16 | 16 | Es el destino |

Ruta: **A → C → B → D → E → F → G → H, 16 km**. Expande los 8 nodos porque la ruta óptima los recorre todos.

## Las 30 preguntas más probables

### Modelado y estructuras

1. **¿Por qué lista de adyacencia y no matriz?** Porque la red es dispersa. La lista ocupa Θ(V + E) y recorrer vecinos cuesta Θ(grado). La matriz ocupa Θ(V²) y recorrer vecinos cuesta Θ(V).
2. **¿Por qué se inserta por la cola?** Para conservar el orden de inserción de las vías. Por la cabeza el orden se invierte y el DFS da otra ruta.
3. **¿Cuántos arcos guarda una red no dirigida?** 2|E|, uno por cada sentido. Es la suma de los grados, por el lema del apretón de manos.
4. **¿Por qué una cola circular?** Porque `shift` cuesta O(n). Con índices y módulo, encolar y desencolar cuestan O(1) amortizado.
5. **¿Qué significa O(1) amortizado?** Que una operación cara puede ocurrir, pero el promedio sobre cualquier secuencia es constante. Duplicar cuesta n, pero ocurre tras n operaciones baratas.
6. **¿Por qué el heap necesita tabla de posiciones?** Para ubicar un nodo en O(1). Sin ella, decrease-key tendría que buscarlo en O(n).
7. **¿Cómo desempata el heap?** Por clave y luego por el índice menor. Así toda ejecución da lo mismo.
8. **¿Para qué sirve la tabla hash?** Para pasar del nombre o id de una estación a su índice en O(1) esperado.
9. **¿Cómo maneja las colisiones?** Con encadenamiento separado. Cada cubeta es una lista, y se redimensiona al pasar de 0.75 de carga.
10. **¿Para qué sirve el árbol k-d?** Para hallar la estación más cercana a un clic y los k vecinos en el generador.

### BFS y DFS

11. **¿Cuántas veces corre el ciclo interno de BFS?** Exactamente Σ deg(u) = 2|E| en una red no dirigida conexa, y |E| en una dirigida. El laboratorio lo confirma.
12. **¿Por qué BFS es Θ(V + E) y no Θ(V·E)?** Porque cada lista se recorre una sola vez, cuando su nodo sale de la cola. No se recorre E por cada nodo.
13. **¿Por qué BFS garantiza el mínimo de saltos?** Porque explora por niveles: todo nodo a distancia k se descubre antes que cualquiera a distancia k + 1.
14. **¿Por qué DFS no lo garantiza?** Porque sigue un camino hasta agotarlo. En la red docente da 4 saltos donde BFS da 2.
15. **¿Por qué se empujan los vecinos al revés?** Para que el primero quede en la cima y el orden coincida con el DFS recursivo.
16. **¿Por qué se marca visitado al sacar y no al meter?** Porque si se marcara al meter, el orden dejaría de ser el del recursivo. El costo es que la pila puede llegar a O(E) entradas.
17. **¿Cómo hallan las rutas alternas?** Con DFS y backtracking: el nodo se desmarca al regresar. El costo es proporcional al número de caminos, que puede ser exponencial.
18. **¿Qué es un punto de articulación?** Una estación cuya caída parte la red. Tarjan la detecta si un hijo cumple low[v] ≥ disc[u].

### Dijkstra y A*

19. **¿Por qué Dijkstra exige pesos no negativos?** Porque la demostración usa que un camino no se abarata al alargarse. Con pesos negativos, un nodo cerrado podría mejorar.
20. **¿Cuándo gana el arreglo sobre el heap?** En redes densas. El arreglo cuesta Θ(V²) sin importar E; el heap paga lg V por arco. El cruce teórico está cerca de E ≈ V²/lg V.
21. **¿Qué es una heurística admisible?** Una que nunca sobrestima: h(n) ≤ h*(n).
22. **¿Y consistente?** h(u) ≤ w(u, v) + h(v) y h(meta) = 0. Es la desigualdad triangular, e implica admisibilidad.
23. **¿Por qué la euclidiana sirve aquí?** Porque cada vía mide al menos la línea recta entre sus estaciones.
24. **¿Qué pasa con h en minutos?** Se divide entre la velocidad máxima de la red. Si no, h estaría en km y dejaría de ser admisible.
25. **¿Qué pasa si h = 0?** A* se vuelve Dijkstra: mismo orden de extracción. Hay un test que lo comprueba.
26. **¿Qué es A* ponderado?** f = g + w·h con w > 1. Expande menos, pero puede perder la optimalidad; su costo queda dentro de w veces el óptimo.
27. **¿Por qué los valores de la figura del docente no son admisibles?** h(F) = 6.3 y h(G) = 2.2, pero los costos reales a H son 3 y 2. La figura es ilustrativa, y sirve de ejemplo de por qué hay que validar la heurística.

### Análisis y tráfico

28. **¿Cuáles son los tres casos del Método Maestro?** Se compara f(n) con n^(log_b a). Si domina la cuenca, Θ(n^(log_b a)). Si son iguales, se agrega un factor lg n. Si domina f(n) y hay regularidad, Θ(f(n)).
29. **¿Por qué el Maestro no aplica al peor caso de QuickSort?** Porque T(n) = T(n − 1) + Θ(n) no tiene forma n/b. Se resuelve por sumatoria: Θ(n²).
30. **¿Por qué una cola de prioridad y no reordenar la tabla?** Porque reordenar cuesta O(n lg n) por actualización, y la cola O(lg n), con el máximo en O(1).

## Matriz de trazabilidad

| Requisito | Archivo | Test que lo verifica |
|---|---|---|
| Red de al menos 10 estaciones | `src/redes/fase1-12.json` | `tests/generadores.test.ts` |
| Grafo dirigido y no dirigido | `src/core/grafo/RedTransporte.ts` | `tests/recorridos.test.ts` |
| BFS | `src/core/algoritmos/bfs.ts` | `tests/recorridos.test.ts`, `tests/prueba-escritorio.test.ts` |
| DFS iterativo y recursivo | `src/core/algoritmos/dfs.ts` | `tests/recorridos.test.ts`, `tests/prueba-escritorio.test.ts` |
| Rutas alternas | `src/core/algoritmos/rutasSimples.ts` | `tests/recorridos.test.ts` |
| Conectividad | `src/core/algoritmos/conectividad.ts` | `tests/recorridos.test.ts` |
| Tarjan | `src/core/algoritmos/conectividad.ts` | `tests/recorridos.test.ts` |
| Cola FIFO | `src/core/estructuras/ColaCircular.ts` | `tests/estructuras.test.ts` |
| Pila LIFO | `src/core/estructuras/Pila.ts` | `tests/estructuras.test.ts` |
| Lista de adyacencia | `src/core/estructuras/ListaAdyacencia.ts` | `tests/estructuras.test.ts` |
| Min-Heap | `src/core/estructuras/MinHeapIndexado.ts` | `tests/estructuras.test.ts` |
| Tabla hash | `src/core/estructuras/TablaHash.ts` | `tests/estructuras.test.ts` |
| Árbol k-d | `src/core/estructuras/KDTree.ts` | `tests/estructuras.test.ts` |
| Dijkstra heap y arreglo | `src/core/algoritmos/dijkstra.ts` | `tests/caminos.test.ts` |
| A* | `src/core/algoritmos/aEstrella.ts` | `tests/caminos.test.ts` |
| Validador de heurística | `src/core/algoritmos/heuristica.ts` | `tests/caminos.test.ts` |
| Ordenamiento | `src/core/ordenamiento/ordenamiento.ts` | `tests/ordenamiento-trafico.test.ts` |
| Estadísticas de tráfico | `src/core/trafico/trafico.ts` | `tests/ordenamiento-trafico.test.ts` |
| Experimento de la pregunta 6 | `src/core/trafico/trafico.ts` | `tests/ordenamiento-trafico.test.ts` |
| Generadores con semilla | `src/core/generadores/redes.ts` | `tests/generadores.test.ts` |
| Prueba de escritorio | `src/ui/vistas/PruebaEscritorio.tsx` | `tests/prueba-escritorio.test.ts` |
| Sin librerías de grafos | `package.json` | `tests/auditoria-pureza.test.ts` |
| Core sin dependencias | `src/core/` | `tests/auditoria-pureza.test.ts` |
| Prototipo funcional | `src/ui/vistas/Planificador.tsx` | `scripts/capturas.mjs` |
| Laboratorio | `src/ui/vistas/Laboratorio.tsx`, `src/workers/` | `scripts/capturas.mjs` |
| Mediciones del informe | `bench/ejecutar.ts` | `bench/resultados/` |
