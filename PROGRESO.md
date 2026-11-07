# Progreso del proyecto

**Estado actual (2026-11-07):** las 12 fases están cerradas. `npm run check` queda en verde: 154 pruebas y 99,9 % de cobertura de líneas en `src/core`. Ya están generados el informe (54 páginas), el documento de la Fase 1 (13 páginas) y el .zip de entrega.

**Pendiente del estudiante:** completar `proyecto.config.json` y poner el logo en `public/logo-univalle.png`. Después hay que regenerar en este orden: `npm run build`, `npm run capturas`, `npm run informe`, `npm run informe:fase1` y `npm run entrega`.

## Plan de fases

- [x] **F0** Setup: Vite + TS strict + Tailwind + Vitest + ESLint, scripts compatibles con Windows, git, `REGLAS.md`, `PROGRESO.md`, `proyecto.config.json`.
- [x] **F1** Estructuras: cola circular, pila, lista enlazada, lista y matriz de adyacencia, min-heap indexado, tabla hash, árbol k-d + tests + auditoría de pureza.
- [x] **F2** Grafo + BFS + DFS (iterativo y recursivo) + rutas simples + conectividad + Tarjan + tracer + tests de la prueba de escritorio.
- [x] **F3** Dijkstra (heap y arreglo) + A\* (km y minutos, ponderado, h = 0) + validador de heurística + validación cruzada.
- [x] **F4** Ordenamientos con contadores + búsqueda binaria + tráfico + estadísticas + experimento de la P6.
- [x] **F5** Generadores con semilla + presets (docente, fase 1, Buenaventura) + `npm run bench` + CLI.
- [x] **F6** Shell de la UI + sistema de diseño (tokens, tipografía, temas) + mapa SVG/Canvas con zoom/pan + editor.
- [x] **F7** Planificador + Visualizador paso a paso (pseudocódigo, inspector de estructuras, narración) + Modo Prueba de Escritorio.
- [x] **F8** Explorador DFS + Duelo + Centro de Tráfico + Laboratorio (Web Worker) + Teoría.
- [x] **F9** Pulido: Modo Sustentación, Ctrl+K, atajos, accesibilidad, responsive, rendimiento, build de un solo archivo.
- [x] **F10** Informe PDF (fase 1 y final) + guía de sustentación + README + manual con capturas.
- [x] **F11** QA final: `npm run check` en verde, revisión del cumplimiento punto por punto contra la sección 1 y la rúbrica, `npm run entrega`.

## Cumplimiento contra la sección 1 y la rúbrica

| Requisito | Dónde se cumple |
|---|---|
| Red de al menos 10 estaciones, dirigida o no dirigida | Red Fase 1 (12), Editor, `RedTransporte` |
| BFS con menos trasbordos | `bfs.ts`, Planificador, prueba de escritorio |
| DFS: caminos alternativos y conectividad | `dfs.ts`, `rutasSimples.ts`, `conectividad.ts`, Explorador DFS |
| Análisis O(V + E) y escalamiento 10 → 50 → 100+ | Informe, secciones 4 y 7 |
| Cola, pila, lista de adyacencia y Min-Heap propios; tabla hash | `src/core/estructuras`, auditoría de pureza |
| Dijkstra y A* con h euclidiana | `dijkstra.ts`, `aEstrella.ts` |
| Comparación Dijkstra contra A* | Duelo, informe 7.6 |
| Prototipo: dos estaciones y la mejor ruta | Planificador y GestorRutas.html |
| Cuestionario de 6 preguntas | Informe, sección 8 |
| Análisis línea por línea con sumatorias | Informe, sección 4 |
| Método Maestro | Informe, sección 5 |
| Gráficas de tiempo con N = 10, 50, 100+ | Informe 7.2 y Laboratorio |
| Módulo de ordenamiento y estadísticas de tráfico | Centro de Tráfico, `trafico.ts` |
| Prueba de escritorio de 8 estaciones | Vista de prueba de escritorio, informe 9, test automático |
| Sin código fuente en el informe | El informe solo tiene pseudocódigo |
| Conclusiones con datos | Informe, sección 10 |
| Entrega en .zip | `npm run entrega` |

## Verificado antes de planear (2026-11-07)

- Entorno: Node v24.21.0, npm 10.9.0, git 2.56.0, Windows 11. Hay Edge y Chrome instalados y npm tiene acceso a internet.
- Máquina de los benchmarks: Intel Celeron N4500 a 1,10 GHz, 7,8 GB de RAM.
- Con un script independiente coinciden los 4 resultados de la sección 3, las listas de adyacencia, las 11 rutas simples de A a E, los 6 nodos cerrados por Dijkstra A → F, los 8 cerrados por A\* A → H, `distanciaEuclidiana ≤ peso` en las 11 vías y los valores h/h\*.

## Hallazgos durante la construcción

- El ejemplo de narración del prompt dice "8 + 2 = 10 < ∞" para D → E, pero en la traza real d[E] ya vale 12, porque C relajó C → E antes. La narración real dice "10 < 12".
- La cota O((V + E) lg V) de Dijkstra con heap es pesimista: en redes de metro el heap casi no crece, y en redes densas pocas relajaciones mejoran.
- A* reduce mucho los nodos expandidos en redes geométricas y en cuadrícula, y poco en redes de metro.
- En la noche del 6 al 7 de noviembre el equipo se suspendió en medio de `npm run bench` y alteró algunas mediciones. Esas partes se repitieron con el equipo despierto. Si se vuelve a medir, conviene dejar el portátil conectado y sin suspender.

## Decisiones de arquitectura (aprobadas)

1. Carpeta: `C:\Users\USUARIO\Desktop\Libros\gestor-rutas-ada`, con su propio repositorio git.
2. La auditoría de pureza es más estricta que la regla 2: también prohíbe `push`, `pop`, `slice`, `concat`, `map`, `filter`, `forEach`, `indexOf` e `includes` en `core`.
3. La lista de adyacencia es un pool de arreglos tipados, con inserción por la cola en O(1).
4. El DFS iterativo recorre los vecinos al revés con el puntero `anterior` de la lista. La pila puede llegar a O(E) entradas.
5. El tracer se protege con `if (tracer)`.
6. En la red docente `tiempoMin` es igual al peso. En minutos, h = euclidiana / velocidad máxima de la red.
7. El Web Worker se incrusta como blob, con plan B por lotes en el hilo principal.
8. Fuentes Sora y JetBrains Mono, incrustadas.
9. PDF y capturas con `puppeteer-core` sobre el Edge o Chrome instalados.
10. El CLI corre con `tsx`.
11. Redes densas solo hasta N = 2000.
12. Tarjan corre sobre el grafo no dirigido subyacente.
13. Vercel no se tocó: es opcional y no se pidió.
14. Escenarios de comparación: redes dispersas, densas, cuadrícula y metro.
15. El .zip no incluye `REGLAS.md` ni `PROGRESO.md`, que son notas de trabajo.
