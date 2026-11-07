# Gestor de Rutas de Transporte — reglas del proyecto

Análisis y Diseño de Algoritmos I (750008C) · Universidad del Valle – Sede Pacífico · 2026-2 · Docente: Esteban Andrés Díaz Mina

La especificación completa está en `..\PROMPT_PROYECTO.md` y el documento del docente en `..\Propuesta_Proyecto_Gestor_Rutas_ADA_2026-2.docx`. Antes de seguir trabajando, lee `PROGRESO.md`: dice en qué fase va el proyecto.

## Reglas de oro (no negociables)

1. **Cero librerías de grafos en todo el proyecto.** Prohibido: cytoscape, graphology, ngraph, d3-force, vis-network, sigma, react-flow/xyflow, dagre, elkjs, jsnetworkx o similares. El mapa se dibuja con SVG/Canvas propio.
2. **`src/core/` es TypeScript puro sin dependencias.** Dentro de `core` está prohibido usar `Array.prototype.sort`, `shift`, `unshift`, `splice`, `Map`, `Set`, `WeakMap` o cualquier cola de prioridad externa. Los arreglos nativos solo se permiten como bloques de memoria indexados (como un arreglo de C). Crea un **test de "auditoría de pureza"** que lea los archivos de `core` y falle si aparece algo de esto o si se importa algo fuera de `core`.
3. **Un solo código para todo.** Los algoritmos que se visualizan son exactamente los mismos que se miden en los benchmarks. Usa un patrón `tracer` opcional: `dijkstra(graph, s, t, opts, tracer?)`. Si `tracer` es `undefined`, no se registra nada y no hay sobrecosto. Nada de reimplementar los algoritmos para la UI.
4. **Lista de adyacencia con inserción por la cola** (puntero `tail`, O(1)) para conservar el orden de inserción de las aristas. Si insertas por la cabeza, el orden se invierte y la prueba de escritorio del DFS deja de coincidir.
5. **Cola FIFO con buffer circular** (redimensionable, O(1) amortizado). Nunca `array.shift()`.
6. **Pila LIFO propia.** El DFS iterativo apila pares `(nodo, padre)` y **empuja los vecinos en orden inverso** para reproducir el orden del DFS recursivo. Implementa también la versión recursiva y demuestra en los tests que dan el mismo resultado.
7. **Min-Heap indexado** (estilo CLRS) con `insert`, `extractMin`, `decreaseKey` y una tabla de posiciones para que `decreaseKey` sea O(log n). Implementa también la variante de "eliminación perezosa" solo como comparación en el laboratorio.
8. **Tabla hash propia** (encadenamiento separado, hash FNV-1a o polinomial, redimensiona con factor de carga > 0.75). Se usa para nombre/ID de estación → índice y donde haga falta en `core`.
9. **Grafos dirigidos y no dirigidos.** Cada arista guarda `distanciaKm` y `tiempoMin`; la métrica activa se elige en la UI.
10. **Desempates deterministas y documentados** (orden de inserción; en el heap, por índice del nodo) para que todo sea reproducible y la prueba de escritorio sea idéntica en cada ejecución.
11. **Todo funciona sin internet** (fuentes locales con `@fontsource`, sin CDNs), porque la sustentación puede ser en un salón sin wifi.
12. TypeScript en modo `strict`, nombres claros en español para el dominio (`Estacion`, `Via`, `RedTransporte`) y comentarios que expliquen el *porqué*, porque el estudiante debe poder defender cada línea.

## Forma de trabajo

- Se construye **fase por fase**, en el orden de `PROGRESO.md`. Al cerrar cada fase: `typecheck` sin errores, `lint` sin warnings, tests en verde, commit de git en español (`feat(core): min-heap indexado con decrease-key`) y `PROGRESO.md` actualizado.
- **No simplificar nada en silencio.** Si algo no se puede hacer, se dice y se propone la alternativa.
- **Nunca inventar números experimentales.** Toda cifra del informe sale de `bench/resultados/`, ejecutado en esta máquina.
- Los datos del equipo viven en `proyecto.config.json`, con marcadores `[NOMBRE]` y `[CÓDIGO]`. El informe y la app los leen de ahí.
- Entorno: Windows, PowerShell y terminal de VS Code. Los scripts de `package.json` deben funcionar en Windows: Node, `.mjs`, `rimraf`, `cross-env`. Nada de `rm -rf`, `cp` ni `&&` propios de Unix.
- El informe no lleva código fuente, solo pseudocódigo estilo CLRS.

## Prueba de escritorio oficial

Red docente: 8 estaciones, 11 vías no dirigidas, insertadas en este orden exacto:
`A-B (4), A-C (2), B-C (1), B-D (5), C-D (8), C-E (10), D-E (2), D-F (6), E-F (3), F-G (1), G-H (2)`

| Algoritmo | Entrada | Ruta | Métrica |
|---|---|---|---|
| BFS | (A, E) | A → C → E | 2 saltos |
| DFS | (A, E) | A → B → C → D → E | 4 saltos |
| Dijkstra | (A, F) | A → C → B → D → E → F | 13 km |
| A\* | (A, H) | A → C → B → D → E → F → G → H | 16 km |

Además: 11 rutas simples de A a E, y Dijkstra A → F con parada temprana cierra 6 nodos. Coordenadas y valores de h en la sección 3 de `..\PROMPT_PROYECTO.md`.
